// @ts-nocheck
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';

import { loadGameConfig, resolveAssetPaths } from '@/lib/game-config-loader';
import { registerPlayComponents } from '../aframe/registerPlayComponents';
import { GameAssets } from '../scene/GameAssets';
import { PlayOverlayUI, type PlayPhaseProgress, type ChatMessage } from '../components/PlayOverlayUI';
import { CameraRig } from '../../voyage/scene/CameraRig';
import { Lighting } from '../../voyage/scene/Lighting';
import WebGLCheck from '../../voyage/components/WebGLCheck';

import type {
  ResolvedGameConfig,
  PhaseConfig,
  KnowledgeCardConfig,
  DragMultiPhase,
  DragChainPhase,
  QuizPhase,
  ExplorePhase,
} from '@/types/game-config';

// ─── Type narrowing helpers ───────────────────────────────────────────────────
function isClickPhase(p: PhaseConfig): p is import('@/types/game-config').ClickPhase {
  return p.type === 'click';
}
function isDragPhase(p: PhaseConfig): p is import('@/types/game-config').DragPhase {
  return p.type === 'drag';
}
function isDragMultiPhase(p: PhaseConfig): p is DragMultiPhase {
  return p.type === 'drag-multi';
}
function isDragChainPhase(p: PhaseConfig): p is DragChainPhase {
  return p.type === 'drag-chain';
}
function isQuizPhase(p: PhaseConfig): p is QuizPhase {
  return p.type === 'quiz';
}
function isExplorePhase(p: PhaseConfig): p is ExplorePhase {
  return p.type === 'explore';
}

export default function PlayPage() {
  const { id } = useParams<{ id: string }>();

  // ── Config loading ──
  const [config, setConfig] = useState<ResolvedGameConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // ── A-Frame readiness ──
  const [ready, setReady] = useState(false);

  // ── Phase state ──
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [prevScore, setPrevScore] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState<PlayPhaseProgress | null>(null);

  // ── UI state ──
  const [showKnowledgeCard, setShowKnowledgeCard] = useState(false);
  const [knowledgeCardData, setKnowledgeCardData] = useState<KnowledgeCardConfig | null>(null);
  const [showContinue, setShowContinue] = useState(false);
  const [wrongClickHint, setWrongClickHint] = useState<string | null>(null);
  const [quizAnswered, setQuizAnswered] = useState(false);

  // ── Timing (for drag time bonus) ──
  const phaseStartTime = useRef<number>(0);
  const advancedRef = useRef(false);
  const wrongClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Imperative counters for drag-multi/drag-chain — updated synchronously in
  // event handlers so side effects never run inside setState updater functions.
  const dragMultiCountRef = useRef(0);
  const dragChainStepRef = useRef(0);

  // ── Inventory state (collect + deliver mechanic) ──
  const [inventory, setInventory] = useState<string[]>([]);
  const [showDeliveryPrompt, setShowDeliveryPrompt] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string | null>(null);

  // ── NPC state ──
  const [npcChatOpen, setNpcChatOpen] = useState(false);
  const [npcMessages, setNpcMessages] = useState<ChatMessage[]>([]);
  const [npcIsTyping, setNpcIsTyping] = useState(false);
  const [autoHint, setAutoHint] = useState<string | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoHintShownRef = useRef(false);

  // ─── Load config from URL id ─────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    loadGameConfig(id)
      .then((raw) => {
        const resolved = resolveAssetPaths(raw);
        setConfig(resolved);
      })
      .catch((err) => {
        console.error('[PLAY] Failed to load config for id:', id, err);
        setConfigError(err.message);
      });
  }, [id]);

  // ─── Populate window.playAssetPositions from config ─────────────────────

  useEffect(() => {
    if (!config) return;
    const positions: Record<string, [number, number, number]> = {};
    for (const asset of config.assets) {
      positions[asset.id] = asset.position;
    }
    window.playAssetPositions = positions;
  }, [config]);

  // ─── A-Frame init ────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined' || !config) return;

    if (!window.AFRAME) {
      require('aframe');
      require('aframe-environment-component');
      require('aframe-extras');
    }

    if (!document.querySelector('script[src*="aframe-transformer-component"]')) {
      const script = document.createElement('script');
      script.src =
        'https://unpkg.com/aframe-transformer-component@1.2.0/dist/aframe-transformer-component.min.js';
      script.async = false;
      document.head.appendChild(script);
    }

    registerPlayComponents();

    const isTypingInInput = () => {
      const tag = document.activeElement?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA';
    };

    const handleQE = (evt: KeyboardEvent) => {
      if (isTypingInInput()) return;
      const key = evt.key.toLowerCase();
      // T → toggle NPC chat (only when not typing)
      if (key === 't') {
        setNpcChatOpen((open) => !open);
      }
      // Q/E vertical movement removed — gravity keeps the player grounded
    };
    window.addEventListener('keydown', handleQE);

    const timer = setTimeout(() => setReady(true), 150);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleQE);
    };
  }, [config]);

  // ─── Derived state ───────────────────────────────────────────────────────

  const phase = config?.phases[phaseIndex] ?? null;

  // ─── Sync window globals whenever phase or chain step changes ────────────

  useEffect(() => {
    if (!config || !phase) return;

    const chainStep = phaseProgress?.step ?? 0;

    window.currentPlayPhaseType = phase.type;
    window.currentPlayPhaseId = phase.id;
    window.currentPlayClickTarget = isClickPhase(phase) ? phase.target_asset : '';

    // Collect/deliver globals (replace old drag globals)
    const collectibleItems = new Set<string>();
    if (isDragPhase(phase)) {
      collectibleItems.add(phase.drag_item);
    } else if (isDragMultiPhase(phase)) {
      for (const asset of config.assets) {
        if (asset.quest_phase_id === phase.id && asset.role === 'draggable') {
          collectibleItems.add(asset.id);
        }
      }
    } else if (isDragChainPhase(phase)) {
      const step = phase.steps[chainStep];
      if (step) collectibleItems.add(step.drag_item);
    }
    window.currentPlayCollectibleItems = collectibleItems;
    window.currentPlayDeliverableItems = collectibleItems;

    let deliveryTargetId = '';
    if (isDragPhase(phase)) {
      deliveryTargetId = phase.drag_target;
    } else if (isDragMultiPhase(phase)) {
      deliveryTargetId = phase.drag_target;
    } else if (isDragChainPhase(phase)) {
      const step = phase.steps[chainStep];
      if (step) deliveryTargetId = step.drag_target;
    }
    window.currentPlayDeliveryTargetId = deliveryTargetId;

    // ExplorePhase: pass target + radius to proximity-trigger component
    if (isExplorePhase(phase)) {
      window.currentPlayExploreTarget = phase.target_position;
      window.currentPlayExploreTriggerRadius = phase.trigger_radius ?? 2.0;
    } else {
      window.currentPlayExploreTarget = null;
      window.currentPlayExploreTriggerRadius = 0;
    }
  }, [config, phase, phaseProgress]);

  // ─── Sync inventory to window global ──────────────────────────────────────

  useEffect(() => {
    window.currentPlayInventory = inventory;
  }, [inventory]);

  useEffect(() => {
    window.playSelectedItem = selectedInventoryItem;
  }, [selectedInventoryItem]);

  // ─── Phase start: reset progress / continue button ───────────────────────

  useEffect(() => {
    if (!phase) return;

    phaseStartTime.current = Date.now();
    setShowContinue(phase.type === 'intro' || phase.type === 'complete');
    setWrongClickHint(null);
    setQuizAnswered(false);
    setNpcMessages([]);
    setAutoHint(null);
    autoHintShownRef.current = false;
    setInventory([]);
    setShowDeliveryPrompt(false);
    setSelectedInventoryItem(null);

    if (isDragMultiPhase(phase)) {
      dragMultiCountRef.current = 0;
      setPhaseProgress({ count: 0, total: phase.total });
    } else if (isDragChainPhase(phase)) {
      dragChainStepRef.current = 0;
      setPhaseProgress({ count: 0, total: phase.steps.length, step: 0 });
    } else {
      setPhaseProgress(null);
    }
  }, [phase?.id]);

  // ─── Helpers ────────────────────────────────────────────────────────────

  const advancePhase = useCallback(() => {
    if (!config) return;
    setPhaseIndex((i) => {
      const next = Math.min(i + 1, config.phases.length - 1);
      window.currentPlayPhaseIndex = next;
      return next;
    });
    setShowContinue(false);
  }, [config]);

  const showCard = useCallback(
    (phaseId: string) => {
      if (!config) return;
      const card = config.knowledge_cards[phaseId];
      if (card) {
        setKnowledgeCardData(card);
        setShowKnowledgeCard(true);
      }
    },
    [config]
  );

  const dismissCard = useCallback(() => {
    setShowKnowledgeCard(false);
    setKnowledgeCardData(null);
    // Do NOT set showContinue here. By the time the knowledge card appears,
    // advancePhase() has already moved to the *next* phase. showContinue is
    // managed by the phase-start useEffect (true only for intro / complete).
    // Setting it here would expose a "Continue →" button during interactive
    // phases and let players accidentally skip them.
  }, []);

  const handleContinue = useCallback(() => {
    if (!config || !phase) return;
    if (phase.type === 'complete') {
      setPhaseIndex(0);
      setScore(0);
      setPrevScore(0);
      setPhaseProgress(null);
      setShowContinue(false);
    } else {
      advancePhase();
    }
  }, [config, phase, advancePhase]);

  // ─── Event: play-advance ─────────────────────────────────────────────────

  useEffect(() => {
    const handler = () => {
      if (advancedRef.current) return;
      advancedRef.current = true;
      if (!config || !phase || !isClickPhase(phase)) return;
      const pts = phase.points ?? 0;
      setPrevScore((s) => s);
      setScore((s) => s + pts);
      advancePhase();
      showCard(phase.id);
      setTimeout(() => { advancedRef.current = false; }, 1000);
    };
    window.addEventListener('play-advance', handler);
    return () => window.removeEventListener('play-advance', handler);
  }, [config, phase, advancePhase, showCard]);

  // ─── Event: play-drag-success ─────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (!config || !phase) return;
      const { phaseId } = e.detail ?? {};
      if (phaseId !== phase.id) return;

      const deliveredAssetId = e.detail?.assetId;

      // Remove delivered item from inventory and clear selection
      if (deliveredAssetId) {
        setInventory((prev) => {
          const idx = prev.indexOf(deliveredAssetId);
          if (idx === -1) return prev;
          return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        });
        setSelectedInventoryItem(null);
      }

      if (isDragPhase(phase)) {
        const elapsed = (Date.now() - phaseStartTime.current) / 1000;
        const bonus =
          phase.time_bonus && elapsed < phase.time_bonus.threshold_seconds
            ? phase.time_bonus.bonus_points
            : 0;
        const pts = (phase.points ?? 0) + bonus;
        if (bonus > 0) console.log('[PLAY] Speed bonus! +' + bonus);
        setPrevScore((s) => s);
        setScore((s) => s + pts);
        showCard(phase.id);
        advancePhase();
      } else if (isDragMultiPhase(phase)) {
        dragMultiCountRef.current += 1;
        const count = dragMultiCountRef.current;
        setPhaseProgress((prev) => (prev ? { ...prev, count } : prev));
        if (count >= phase.total) {
          setScore((s) => s + (phase.points ?? 0));
          showCard(phase.id);
          advancePhase();
        }
      } else if (isDragChainPhase(phase)) {
        dragChainStepRef.current += 1;
        const nextStep = dragChainStepRef.current;
        const isLast = nextStep >= phase.steps.length;
        setPhaseProgress((prev) =>
          prev ? { ...prev, step: nextStep, count: nextStep } : prev
        );
        if (isLast) {
          setScore((s) => s + (phase.points ?? 0));
          showCard(phase.id);
          advancePhase();
        } else {
          // Reappear the collectible at the next target's position for the next step
          const nextStepConfig = phase.steps[nextStep];
          if (nextStepConfig && deliveredAssetId) {
            const targetAsset = config.assets.find((a) => a.id === nextStepConfig.drag_target);
            if (targetAsset) {
              window.dispatchEvent(new CustomEvent('play-item-reappear', {
                detail: {
                  assetId: deliveredAssetId,
                  targetPosition: [targetAsset.position[0] + 2, targetAsset.position[1], targetAsset.position[2]]
                }
              }));
            }
          }
        }
      }
    };
    window.addEventListener('play-drag-success', handler as EventListener);
    return () => window.removeEventListener('play-drag-success', handler as EventListener);
  }, [config, phase, advancePhase, showCard]);

  // ─── Event: play-item-collected ──────────────────────────────────────────

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { assetId } = e.detail ?? {};
      if (!assetId) return;
      setInventory((prev) => [...prev, assetId]);
    };
    window.addEventListener('play-item-collected', handler as EventListener);
    return () => window.removeEventListener('play-item-collected', handler as EventListener);
  }, []);

  // ─── Event: play-item-reappear (drag-chain: reposition collectible) ─────

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { assetId, targetPosition } = e.detail ?? {};
      if (!assetId || !targetPosition) return;
      const el = document.querySelector(`[data-asset-id="${assetId}"]`) as any;
      if (!el) return;
      el.setAttribute('position', `${targetPosition[0]} ${targetPosition[1]} ${targetPosition[2]}`);
      el.setAttribute('visible', 'true');
      // Reset collectible state so it can be collected again
      const comp = el.components?.['config-collectible'];
      if (comp) comp._collected = false;
    };
    window.addEventListener('play-item-reappear', handler as EventListener);
    return () => window.removeEventListener('play-item-reappear', handler as EventListener);
  }, []);

  // ─── Event: show-knowledge ────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const phaseId = e.detail?.phase;
      if (phaseId) showCard(phaseId);
    };
    window.addEventListener('show-knowledge', handler as EventListener);
    return () => window.removeEventListener('show-knowledge', handler as EventListener);
  }, [showCard]);

  // ─── Event: voyage-continue (VR button) ──────────────────────────────────

  useEffect(() => {
    const handler = () => handleContinue();
    window.addEventListener('voyage-continue', handler);
    return () => window.removeEventListener('voyage-continue', handler);
  }, [handleContinue]);

  // ─── Quiz answer callback (from PlayOverlayUI QuizUI) ────────────────────
  // Called synchronously when the player taps the correct option. Adds score
  // and schedules phase advance after a 2-second explanation window.

  const handleQuizAnswer = useCallback(
    (optionId: string, isCorrect: boolean) => {
      if (!config || !phase || !isQuizPhase(phase) || !isCorrect) return;
      setQuizAnswered(true);
      const pts = phase.points ?? 0;
      setPrevScore((s) => s);
      setScore((s) => s + pts);
      showCard(phase.id);
      // Give the student 2 s to read the explanation, then advance
      setTimeout(() => {
        advancePhase();
      }, 2000);
    },
    [config, phase, advancePhase, showCard]
  );

  // ─── Event: play-proximity-reached (ExplorePhase) ─────────────────────────

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (!config || !phase) return;
      const { phaseId } = e.detail ?? {};
      if (phaseId !== phase.id || !isExplorePhase(phase)) return;
      const pts = phase.points ?? 0;
      setPrevScore((s) => s);
      setScore((s) => s + pts);
      showCard(phase.id);
      advancePhase();
    };
    window.addEventListener('play-proximity-reached', handler as EventListener);
    return () =>
      window.removeEventListener('play-proximity-reached', handler as EventListener);
  }, [config, phase, advancePhase, showCard]);

  // ─── Event: play-npc-talk (NPC clicked or proximity prompt) ─────────────────

  useEffect(() => {
    const handler = () => setNpcChatOpen(true);
    window.addEventListener('play-npc-talk', handler);
    return () => window.removeEventListener('play-npc-talk', handler);
  }, []);

  // ─── Disable A-Frame controls while NPC chat is open ────────────────────────
  // Prevents WASD camera movement and look-controls mouse-drag from firing
  // while the player is typing in the chat input.

  useEffect(() => {
    const wasdEl = document.querySelector('[wasd-controls]') as Element | null;
    const lookEl = document.querySelector('[look-controls]') as Element | null;
    if (wasdEl) wasdEl.setAttribute('wasd-controls', `enabled: ${!npcChatOpen}`);
    if (lookEl) lookEl.setAttribute('look-controls', `enabled: ${!npcChatOpen}`);
  }, [npcChatOpen]);

  // ─── NPC idle-hint timer ──────────────────────────────────────────────────
  // After 30s without keyboard/mouse activity on an interactive phase,
  // show the pre-written hint from config.npc.hints[phaseId] for 8s.

  useEffect(() => {
    if (!config?.npc || !phase) return;
    const hint = config.npc.hints[phase.id];
    if (!hint || phase.type === 'intro' || phase.type === 'complete') return;

    const startTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        if (!autoHintShownRef.current) {
          autoHintShownRef.current = true;
          setAutoHint(hint);
          setTimeout(() => setAutoHint(null), 8000);
        }
      }, 30000);
    };

    startTimer();

    // Throttle activity handler — reset timer at most once per 5s
    let lastReset = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastReset < 5000 || autoHintShownRef.current) return;
      lastReset = now;
      startTimer();
    };

    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousemove', handleActivity);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
    };
  }, [config?.npc, phase?.id]);

  // ─── NPC send message ─────────────────────────────────────────────────────

  const handleNpcSendMessage = useCallback(
    async (message: string) => {
      if (!config?.npc || !phase) return;

      const userMsg: ChatMessage = { role: 'user', content: message };
      setNpcMessages((prev) => [...prev, userMsg]);
      setNpcIsTyping(true);

      try {
        const knowledgeContext = config.knowledge_cards[phase.id]?.body ?? '';
        const res = await fetch('/api/npc-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            npcPersona: config.npc.persona,
            currentPhaseTitle: phase.title,
            currentPhaseInstruction: phase.instruction,
            knowledgeContext,
            // Pass the current messages snapshot for history
            history: npcMessages,
          }),
        });
        const data = await res.json();
        const reply = data.reply ?? "Keep exploring — I'm sure you'll figure it out!";
        setNpcMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      } catch {
        setNpcMessages((prev) => [
          ...prev,
          { role: 'assistant', content: "Hmm, I couldn't connect. Try again!" },
        ]);
      } finally {
        setNpcIsTyping(false);
      }
    },
    [config, phase, npcMessages]
  );

  // ─── Event: show-info-panel ───────────────────────────────────────────────

  useEffect(() => {
    if (!config) return;
    const handler = (e: CustomEvent) => {
      const assetId = e.detail?.name;
      if (!assetId) return;
      const asset = config.assets.find((a) => a.id === assetId || a.name === assetId);
      if (!asset) return;

      const titleEl = document.getElementById('info-panel-title');
      const descEl = document.getElementById('info-panel-desc');
      const funcEl = document.getElementById('info-panel-function');
      const panelEl = document.getElementById('vr-info-panel');

      if (titleEl) titleEl.setAttribute('value', asset.name);
      if (descEl) descEl.setAttribute('value', asset.description ?? '');
      if (funcEl) funcEl.setAttribute('value', `Function: ${asset.function ?? 'N/A'}`);

      const scene = document.querySelector('a-scene') as any;
      if (panelEl && scene?.is('vr-mode')) {
        panelEl.setAttribute('visible', 'true');
      }
    };
    window.addEventListener('show-info-panel', handler as EventListener);
    return () => window.removeEventListener('show-info-panel', handler as EventListener);
  }, [config]);

  // ─── Loading / error screens ─────────────────────────────────────────────

  if (configError) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center"
        style={{ backgroundColor: '#0f172a', fontFamily: 'system-ui' }}
      >
        <div className="text-center">
          <p className="font-bold text-red-400 mb-2">Failed to load experience</p>
          <p className="text-xs text-slate-400 mb-1">{id}</p>
          <p className="text-xs text-slate-500">{configError}</p>
        </div>
      </div>
    );
  }

  if (!config || !ready) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center"
        style={{ backgroundColor: '#0f172a', fontFamily: 'system-ui' }}
      >
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full animate-spin mx-auto mb-4"
            style={{ border: '4px solid rgba(0, 229, 255, 0.2)', borderTopColor: '#00e5ff' }}
          ></div>
          <p className="font-bold uppercase tracking-widest text-xs" style={{ color: '#00e5ff' }}>
            {!config ? 'Loading Experience…' : 'Initializing VR…'}
          </p>
        </div>
      </div>
    );
  }

  if (!phase) return null;

  const chainStep = phaseProgress?.step ?? 0;

  return (
    <div className="h-screen w-screen bg-transparent">
      <WebGLCheck>
        <a-scene
          embedded
          vr-mode-ui="enabled: false"
          renderer="antialias: true; colorManagement: true; physicallyCorrectLights: true"
          fog="type: exponential; color: #0a1628; density: 0.008"
        >
          {/* Environment — A-Frame built-in with flat ground */}
          <a-entity environment="preset: forest; skyType: gradient; skyColor: #87CEEB; horizonColor: #c8e6f0; groundColor: #4a8c5c; groundColor2: #3a7c4c; dressing: mushrooms; dressingAmount: 30; dressingScale: 3; ground: flat; fog: 0.3; gridColor: #5a9c6c; grid: none"></a-entity>
          <a-sky color="#87CEEB"></a-sky>

          {/* Boundary walls (invisible) */}
          <a-box position="0 2 -40" width="80" height="5" depth="1" visible="false"></a-box>
          <a-box position="0 2 5" width="80" height="5" depth="1" visible="false"></a-box>
          <a-box position="40 2 -20" width="1" height="5" depth="80" visible="false"></a-box>
          <a-box position="-40 2 -20" width="1" height="5" depth="80" visible="false"></a-box>

          {/* Mouse cursor entity — rayOrigin: mouse shoots from the active camera
              using mouse NDC position, regardless of this entity's world position. */}
          <a-entity
            cursor="rayOrigin: mouse; fuse: false"
            raycaster="objects: [config-clickable], [config-collectible], [config-delivery-point], [config-npc-entity]; far: 100"
          ></a-entity>

          {/* Proximity trigger — always in scene, self-manages indicator/detection */}
          <a-entity config-proximity-trigger></a-entity>

          <GameAssets config={config} currentPhase={phase} chainStep={chainStep} />
          <Lighting />
          {/* gravity pulls rig to y=0; camera child at y=1.6 gives eye height */}
          <CameraRig phaseTitle={phase.title} phaseInstruction={phase.instruction} spawnPosition="0 2 0" gravity={true} />

          <a-plane
            class="teleport-floor"
            position="0 -1 0"
            rotation="-90 0 0"
            width="20"
            height="20"
            material="color: #10b981; opacity: 0.1; transparent: true; visible: false"
          ></a-plane>
        </a-scene>
      </WebGLCheck>

      <style jsx>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounceIn {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
          70% { transform: translate(-50%, -50%) scale(0.9); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
        .confetti {
          position: fixed; top: -20px; width: 10px; height: 10px;
          animation: confetti-fall linear infinite;
        }
      `}</style>

      {typeof window !== 'undefined' &&
        createPortal(
          <>
            {/* Vignette — dark edges for immersive game feel */}
            <div
              style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 9997,
                background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.45) 100%)',
              }}
            />

            <PlayOverlayUI
              config={config}
              currentPhase={phase}
              phaseIndex={phaseIndex}
              totalPhases={config.phases.length}
              score={score}
              prevScore={prevScore}
              phaseProgress={phaseProgress}
              showKnowledgeCard={showKnowledgeCard}
              knowledgeCardData={knowledgeCardData}
              showContinue={showContinue}
              onDismissCard={dismissCard}
              onContinue={handleContinue}
              onQuizAnswer={handleQuizAnswer}
              quizAnswered={quizAnswered}
              npcName={config.npc?.name}
              npcChatOpen={npcChatOpen}
              npcMessages={npcMessages}
              npcIsTyping={npcIsTyping}
              autoHint={autoHint}
              onNpcChatClose={() => setNpcChatOpen(false)}
              onNpcSendMessage={handleNpcSendMessage}
              inventory={inventory}
              showDeliveryPrompt={showDeliveryPrompt}
              selectedInventoryItem={selectedInventoryItem}
              onSelectInventoryItem={(id) => setSelectedInventoryItem((prev) => prev === id ? null : id)}
            />
            {wrongClickHint && (
              <div
                className="fixed top-24 left-1/2 -translate-x-1/2 pointer-events-none"
                style={{
                  zIndex: 10000,
                  backgroundColor: 'rgba(239, 68, 68, 0.9)',
                  color: 'white',
                  padding: '10px 24px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {wrongClickHint}
              </div>
            )}
          </>,
          document.body
        )}
    </div>
  );
}
