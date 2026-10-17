// @ts-nocheck
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams } from 'next/navigation';

import { loadGameConfig, resolveAssetPaths } from '@/lib/game-config-loader';
import { applyMapRuntime, loadMapRuntime } from '@/lib/maps/map-runtime';
import { registerPlayComponents } from '../aframe/registerPlayComponents';
import { registerMapWalk } from '../aframe/registerMapWalk';
import { registerDesktopMapWalk } from '../aframe/registerDesktopMapWalk';
import { GameAssets } from '../scene/GameAssets';
import { MapEnvironment } from '../scene/MapEnvironment';
import { PlayOverlayUI, type PlayPhaseProgress, type ChatMessage } from '../components/PlayOverlayUI';
import { CameraRig } from '../../voyage/scene/CameraRig';
import { Lighting } from '../../voyage/scene/Lighting';
import WebGLCheck from '../../voyage/components/WebGLCheck';

import type {
  GameConfig,
  ResolvedGameConfig,
  PhaseConfig,
  KnowledgeCardConfig,
  DragMultiPhase,
  DragChainPhase,
  QuizPhase,
  ExplorePhase,
} from '@/types/game-config';
import type { MapRuntime } from '@/types/map-config';

type PlayExperienceProps = {
  developmentConfig?: GameConfig;
  developmentBanner?: string;
};

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

export function PlayExperience({ developmentConfig, developmentBanner }: PlayExperienceProps = {}) {
  const { id: routeId } = useParams<{ id?: string }>();
  const searchParams = useSearchParams();
  const id = developmentConfig?.meta.id ?? routeId;
  const assignmentId = developmentConfig ? null : searchParams.get('assignmentId');

  // ── Config loading ──
  const [config, setConfig] = useState<ResolvedGameConfig | null>(null);
  const [mapRuntime, setMapRuntime] = useState<MapRuntime | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [trackingReady, setTrackingReady] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<'ready' | 'submitting' | 'submitted' | 'error'>('ready');
  const [submissionError, setSubmissionError] = useState<string | null>(null);

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

  // ── Collection toast ──
  const [collectToast, setCollectToast] = useState<string | null>(null);
  const collectToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const configPromise = developmentConfig
      ? Promise.resolve(developmentConfig)
      : loadGameConfig(id);
    configPromise
      .then(async (raw) => {
        console.log('[DEBUG] meta:', JSON.stringify(raw.meta, null, 2));
        console.log('[DEBUG] assets:', JSON.stringify(raw.assets, null, 2));
        console.log('[DEBUG] phases:', JSON.stringify(raw.phases, null, 2));
        console.log('[DEBUG] npc:', JSON.stringify(raw.npc, null, 2));
        const resolved = resolveAssetPaths(raw);
        const runtime = await loadMapRuntime(raw);
        setMapRuntime(runtime);
        setConfig(applyMapRuntime(resolved, runtime));
        (window as any).__playGameTitle = resolved.meta?.title ?? '';
      })
      .catch((err) => {
        console.error('[PLAY] Failed to load config for id:', id, err);
        setConfigError(err.message);
      });
  }, [developmentConfig, id]);

  // Assignment links create or resume a server-validated attempt. Public links
  // skip this path entirely and remain anonymous/untracked.
  useEffect(() => {
    if (!config || !id) return;
    if (!assignmentId) { setTrackingReady(true); return; }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/assignment-attempts/start', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignmentId, experienceId: id }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body.attempt) throw new Error(body.error || 'Assignment access could not be verified.');
        if (cancelled) return;
        const completed = new Set<string>(body.attempt.completed_phase_ids ?? []);
        const nextIndex = config.phases.findIndex((candidate) => candidate.type !== 'intro' && candidate.type !== 'complete' && !completed.has(candidate.id));
        const completeIndex = config.phases.findIndex((candidate) => candidate.type === 'complete');
        const resumeIndex = completed.size === 0 ? 0 : nextIndex >= 0 ? nextIndex : Math.max(0, completeIndex);
        setAttemptId(body.attempt.id);
        setSubmissionStatus('ready');
        setSubmissionError(null);
        setPhaseIndex(resumeIndex);
        setScore(config.phases.reduce((total, candidate) => completed.has(candidate.id) ? total + (candidate.points ?? 0) : total, 0));
        setTrackingReady(true);
      } catch (error) {
        if (!cancelled) setTrackingError(error instanceof Error ? error.message : 'Assignment access could not be verified.');
      }
    })();
    return () => { cancelled = true; };
  }, [assignmentId, config, id]);

  // ─── Poll for skybox_url update (async generation in workspace) ──────────

  useEffect(() => {
    if (developmentConfig) return;
    if (!id || !config) return;
    // Already have a skybox — no need to poll
    if (config.environment?.skybox_url) return;
    // Local JSON experiences won't get async skybox updates
    if (!config.environment?.skybox_prompt) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 × 4s = 2 min max
    const interval = setInterval(async () => {
      if (cancelled || attempts >= maxAttempts) {
        clearInterval(interval);
        return;
      }
      attempts++;
      try {
        const raw = await loadGameConfig(id);
        if (raw.environment?.skybox_url) {
          console.log('[PLAY] Skybox ready:', raw.environment.skybox_url);
          const resolved = resolveAssetPaths(raw);
          const runtime = await loadMapRuntime(raw);
          setMapRuntime(runtime);
          setConfig(applyMapRuntime(resolved, runtime));
          clearInterval(interval);
        }
      } catch {
        // ignore — DB might be momentarily unavailable
      }
    }, 4000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [developmentConfig, id, config?.environment?.skybox_url]);

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
    registerMapWalk();
    registerDesktopMapWalk();

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

    const timer = setTimeout(() => setReady(true), 300);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleQE);
    };
  }, [config]);

  // ─── Derived state ───────────────────────────────────────────────────────

  const phase = config?.phases[phaseIndex] ?? null;
  const handleMapError = useCallback((message: string) => {
    console.warn(`[map-runtime] ${message}`);
    setConfigError(`Physical map unavailable: ${message}`);
  }, []);

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
    if (isClickPhase(phase)) {
      deliveryTargetId = phase.target_asset || '';
    } else if (isExplorePhase(phase)) {
      deliveryTargetId = (phase as any).target_asset || '';
    } else if (isDragPhase(phase)) {
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

  // Score helper — caps at max_possible to prevent overflow from click-through bugs
  const addScore = useCallback((pts: number) => {
    if (!config || pts <= 0) return;
    const max = config.scoring.max_possible;
    setPrevScore(score);
    setScore((s) => Math.min(s + pts, max));
  }, [config, score]);

  const saveAssignmentPhase = useCallback(async (phaseId: string, answer: { option_id: string } | null = null) => {
    if (!assignmentId) return true;
    if (!attemptId || !id) return false;
    try {
      const response = await fetch(`/api/assignment-attempts/${encodeURIComponent(attemptId)}/progress`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experienceId: id, phaseId, answer }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Progress could not be saved.');
      setTrackingError(null);
      return true;
    } catch (error) {
      setTrackingError(error instanceof Error ? error.message : 'Progress could not be saved.');
      return false;
    }
  }, [assignmentId, attemptId, id]);

  const submitAssignmentAttempt = useCallback(async () => {
    if (!assignmentId || !attemptId || submissionStatus === 'submitting' || submissionStatus === 'submitted') return;
    setSubmissionStatus('submitting');
    setSubmissionError(null);
    try {
      const response = await fetch(`/api/assignment-attempts/${encodeURIComponent(attemptId)}/submit`, {
        method: 'POST',
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.attempt?.status !== 'submitted') {
        throw new Error(body.error || 'This attempt could not be submitted.');
      }
      setTrackingError(null);
      setSubmissionStatus('submitted');
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'This attempt could not be submitted.');
      setSubmissionStatus('error');
    }
  }, [assignmentId, attemptId, submissionStatus]);

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
    const handler = async () => {
      if (advancedRef.current) return;
      advancedRef.current = true;
      if (!config || !phase || !isClickPhase(phase)) return;
      if (!await saveAssignmentPhase(phase.id)) { advancedRef.current = false; return; }
      addScore(phase.points ?? 0);
      advancePhase();
      showCard(phase.id);
      setTimeout(() => { advancedRef.current = false; }, 1000);
    };
    window.addEventListener('play-advance', handler);
    return () => window.removeEventListener('play-advance', handler);
  }, [config, phase, advancePhase, showCard, addScore, saveAssignmentPhase]);

  // ─── Event: play-drag-success ─────────────────────────────────────────────

  useEffect(() => {
    const handler = async (e: CustomEvent) => {
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
        if (!await saveAssignmentPhase(phase.id)) return;
        const elapsed = (Date.now() - phaseStartTime.current) / 1000;
        const bonus =
          phase.time_bonus && elapsed < phase.time_bonus.threshold_seconds
            ? phase.time_bonus.bonus_points
            : 0;
        const pts = (phase.points ?? 0) + bonus;
        if (bonus > 0) console.log('[PLAY] Speed bonus! +' + bonus);
        addScore(pts);
        showCard(phase.id);
        advancePhase();
      } else if (isDragMultiPhase(phase)) {
        dragMultiCountRef.current += 1;
        const count = dragMultiCountRef.current;
        setPhaseProgress((prev) => (prev ? { ...prev, count } : prev));
        if (count >= phase.total) {
          if (!await saveAssignmentPhase(phase.id)) return;
          addScore(phase.points ?? 0);
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
          if (!await saveAssignmentPhase(phase.id)) return;
          addScore(phase.points ?? 0);
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
  }, [config, phase, advancePhase, showCard, addScore, saveAssignmentPhase]);

  // ─── Event: play-item-collected ──────────────────────────────────────────

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { assetId } = e.detail ?? {};
      if (!assetId) return;
      setInventory((prev) => [...prev, assetId]);

      // Show collection toast for 3 seconds
      const assetName = config?.assets.find((a) => a.id === assetId)?.name ?? assetId;
      setCollectToast(`Collected ${assetName}! Select it in hotbar, then click the target to deliver`);
      if (collectToastTimer.current) clearTimeout(collectToastTimer.current);
      collectToastTimer.current = setTimeout(() => setCollectToast(null), 3000);
    };
    window.addEventListener('play-item-collected', handler as EventListener);
    return () => window.removeEventListener('play-item-collected', handler as EventListener);
  }, [config]);

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
    async (optionId: string, isCorrect: boolean) => {
      if (!config || !phase || !isQuizPhase(phase)) return;
      if (!await saveAssignmentPhase(phase.id, { option_id: optionId })) return;
      if (!isCorrect) return;
      setQuizAnswered(true);
      addScore(phase.points ?? 0);
      showCard(phase.id);
      // Give the student 2 s to read the explanation, then advance
      setTimeout(() => {
        advancePhase();
      }, 2000);
    },
    [config, phase, advancePhase, showCard, addScore, saveAssignmentPhase]
  );

  // ─── Event: play-proximity-reached (ExplorePhase) ─────────────────────────

  useEffect(() => {
    const handler = async (e: CustomEvent) => {
      if (!config || !phase) return;
      const { phaseId } = e.detail ?? {};
      if (phaseId !== phase.id || !isExplorePhase(phase)) return;
      if (!await saveAssignmentPhase(phase.id)) return;
      addScore(phase.points ?? 0);
      showCard(phase.id);
      advancePhase();
    };
    window.addEventListener('play-proximity-reached', handler as EventListener);
    return () =>
      window.removeEventListener('play-proximity-reached', handler as EventListener);
  }, [config, phase, advancePhase, showCard, addScore, saveAssignmentPhase]);

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
    const mapWalkEl = document.querySelector('[map-walk]') as Element | null;
    const desktopMapWalkEl = document.querySelector('[desktop-map-walk]') as Element | null;
    const lookEl = document.querySelector('[look-controls]') as Element | null;
    if (wasdEl) wasdEl.setAttribute('wasd-controls', `enabled: ${!npcChatOpen}`);
    if (mapWalkEl) mapWalkEl.setAttribute('map-walk', 'enabled', !npcChatOpen);
    if (desktopMapWalkEl) desktopMapWalkEl.setAttribute('desktop-map-walk', 'enabled', !npcChatOpen);
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
        if (res.status === 401 || res.status === 403) {
          const body = await res.json().catch(() => ({}));
          setNpcMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: body.message || 'NPC chat is available in teacher-assigned classroom sessions.',
            },
          ]);
          return;
        }
        if (!res.ok) throw new Error('NPC chat request failed');
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

  if (assignmentId && trackingError && !trackingReady) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 px-6">
        <div role="alert" className="max-w-md rounded-2xl border border-red-900 bg-slate-900 p-7 text-center text-white">
          <p className="font-bold text-red-300">Assignment access unavailable</p>
          <p className="mt-2 text-sm text-slate-300">{trackingError}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-5 min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-600">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!config || !mapRuntime || !ready || (assignmentId && !trackingReady)) {
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
  const physicalMap = mapRuntime.kind === 'physical' ? mapRuntime : null;
  const fogColor = physicalMap?.manifest.defaultSky.fogColor ?? config.environment.sky_color ?? '#87CEEB';
  const fogDensity = physicalMap?.manifest.defaultSky.fogDensity ?? 0.015;

  return (
    <div className="h-screen w-screen bg-transparent">
      <WebGLCheck>
        <a-scene
          embedded
          vr-mode-ui="enabled: false"
          renderer="antialias: true; colorManagement: true; physicallyCorrectLights: true"
          fog={`type: exponential; color: ${fogColor}; density: ${fogDensity}`}
          play-native-click-handler
        >
          {/* Registered maps are explicit opt-ins; legacy lessons keep their terrain. */}
          {physicalMap ? (
            <MapEnvironment runtime={physicalMap} onError={handleMapError} />
          ) : (
            <a-entity lowpoly-terrain={`theme: ${config.environment.terrain_theme || 'grassland'}; size: 120; segments: 40; maxHeight: 3`}></a-entity>
          )}

          {/* Physical maps own their sky; procedural terrain preserves lesson skyboxes. */}
          {!physicalMap && (config.environment.skybox_url ? (
            <a-sky src={config.environment.skybox_url} rotation="0 -90 0"></a-sky>
          ) : (
            <a-sky color={config.environment.sky_color || '#87CEEB'}></a-sky>
          ))}

          {/* Mouse cursor entity — rayOrigin: mouse shoots from the active camera
              using mouse NDC position, regardless of this entity's world position. */}
          <a-entity
            cursor="rayOrigin: mouse; fuse: false"
            raycaster="objects: .clickable; far: 100"
          ></a-entity>

          {/* Proximity trigger — always in scene, self-manages indicator/detection */}
          <a-entity config-proximity-trigger></a-entity>

          <GameAssets config={config} currentPhase={phase} chainStep={chainStep} snapToTerrain={!physicalMap} />
          {!physicalMap && <Lighting />}
          {/* terrain-follow pins rig Y to ground + offset; boundary clamping in component */}
          <CameraRig
            phaseTitle={phase.title}
            phaseInstruction={phase.instruction}
            spawnPosition="0 2 0"
            terrainFollow={!physicalMap}
            mapRuntime={physicalMap ?? undefined}
            desktopMapControls
            onMapError={handleMapError}
          />

          {/* Teleport floor removed — terrain mesh provides ground */}
        </a-scene>
      </WebGLCheck>

      {developmentBanner && (
        <div
          role="status"
          className="fixed left-1/2 top-3 z-[10030] -translate-x-1/2 rounded-full border border-cyan-200/40 bg-slate-950/90 px-4 py-2 text-xs font-semibold tracking-wide text-cyan-50 shadow-lg"
        >
          {developmentBanner}
        </div>
      )}

      {mapRuntime.fallbackMessage && (
        <div
          role="status"
          className="fixed left-1/2 top-16 z-[10020] -translate-x-1/2 rounded-xl border border-amber-300/40 bg-slate-950/90 px-4 py-2 text-sm text-amber-100 shadow-lg"
        >
          {mapRuntime.fallbackMessage}
        </div>
      )}

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
              assignmentSubmission={assignmentId ? {
                status: submissionStatus,
                error: submissionError,
                onSubmit: submitAssignmentAttempt,
              } : undefined}
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
            {collectToast && (
              <div
                className="fixed bottom-28 left-1/2 -translate-x-1/2 pointer-events-none"
                style={{
                  zIndex: 10001,
                  backgroundColor: 'rgba(245, 158, 11, 0.92)',
                  color: 'white',
                  padding: '10px 24px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  maxWidth: '420px',
                  textAlign: 'center',
                  animation: 'slideUp 0.3s ease both',
                  boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
                }}
              >
                {collectToast}
              </div>
            )}
            {trackingError && (
              <div role="alert" className="fixed left-1/2 top-20 max-w-md -translate-x-1/2 rounded-xl border border-red-400 bg-red-950/95 px-5 py-3 text-center text-sm font-semibold text-red-100" style={{ zIndex: 10005 }}>
                {trackingError} Try the phase action again.
              </div>
            )}
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

export default function PlayPage() {
  return <PlayExperience />;
}
