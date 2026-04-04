// @ts-nocheck
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';

import { loadGameConfig, resolveAssetPaths } from '@/lib/game-config-loader';
import { registerPlayComponents } from '../aframe/registerPlayComponents';
import { GameAssets } from '../scene/GameAssets';
import { PlayOverlayUI, type PlayPhaseProgress } from '../components/PlayOverlayUI';
import { CameraRig } from '../../voyage/scene/CameraRig';
import { Lighting } from '../../voyage/scene/Lighting';
import WebGLCheck from '../../voyage/components/WebGLCheck';

import type {
  ResolvedGameConfig,
  PhaseConfig,
  KnowledgeCardConfig,
  DragMultiPhase,
  DragChainPhase,
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

  // ── Timing (for drag time bonus) ──
  const phaseStartTime = useRef<number>(0);
  const advancedRef = useRef(false);
  const wrongClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const handleQE = (evt: KeyboardEvent) => {
      const key = evt.key.toLowerCase();
      const rig = document.getElementById('camera-rig');
      if (!rig) return;
      const pos = rig.getAttribute('position') as any;
      if (key === 'q') rig.setAttribute('position', { x: pos.x, y: pos.y - 0.5, z: pos.z });
      if (key === 'e') rig.setAttribute('position', { x: pos.x, y: pos.y + 0.5, z: pos.z });
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

    const dragItems = new Set<string>();
    if (isDragPhase(phase)) {
      dragItems.add(phase.drag_item);
    } else if (isDragMultiPhase(phase)) {
      for (const asset of config.assets) {
        if (asset.quest_phase_id === phase.id && asset.role === 'draggable') {
          dragItems.add(asset.id);
        }
      }
    } else if (isDragChainPhase(phase)) {
      const step = phase.steps[chainStep];
      if (step) dragItems.add(step.drag_item);
    }
    window.currentPlayDragItems = dragItems;

    let snapTargetId = '';
    let snapDistance = 2.0;
    let isLastChainStep = false;

    if (isDragPhase(phase)) {
      snapTargetId = phase.drag_target;
      snapDistance = phase.snap_distance ?? 3.0;
    } else if (isDragMultiPhase(phase)) {
      snapTargetId = phase.drag_target;
      snapDistance = phase.snap_distance ?? 4.0;
    } else if (isDragChainPhase(phase)) {
      const step = phase.steps[chainStep];
      if (step) {
        snapTargetId = step.drag_target;
        snapDistance = step.snap_distance ?? 2.0;
      }
      isLastChainStep = chainStep === phase.steps.length - 1;
    }

    window.currentPlaySnapTargetId = snapTargetId;
    window.currentPlaySnapDistance = snapDistance;
    window.currentPlayChainIsLastStep = isLastChainStep;
  }, [config, phase, phaseProgress]);

  // ─── Phase start: reset progress / continue button ───────────────────────

  useEffect(() => {
    if (!phase) return;

    phaseStartTime.current = Date.now();
    setShowContinue(phase.type === 'intro' || phase.type === 'complete');
    setWrongClickHint(null);

    if (isDragMultiPhase(phase)) {
      setPhaseProgress({ count: 0, total: phase.total });
    } else if (isDragChainPhase(phase)) {
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
    setShowContinue(true);
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

      if (isDragPhase(phase)) {
        const elapsed = (Date.now() - phaseStartTime.current) / 1000;
        const bonus =
          phase.time_bonus && elapsed < phase.time_bonus.threshold_seconds
            ? phase.time_bonus.bonus_points
            : 0;
        const pts = (phase.points ?? 0) + bonus;
        if (bonus > 0) console.log('[PLAY] ⚡ Speed bonus! +' + bonus);
        setPrevScore((s) => s);
        setScore((s) => s + pts);
        showCard(phase.id);
        advancePhase();
      } else if (isDragMultiPhase(phase)) {
        setPhaseProgress((prev) => {
          if (!prev) return prev;
          const next = { ...prev, count: prev.count + 1 };
          if (next.count >= next.total) {
            setScore((s) => s + (phase.points ?? 0));
            showCard(phase.id);
            advancePhase();
          }
          return next;
        });
      } else if (isDragChainPhase(phase)) {
        setPhaseProgress((prev) => {
          if (!prev || prev.step === undefined) return prev;
          const nextStep = prev.step + 1;
          const isLast = nextStep >= phase.steps.length;
          if (isLast) {
            setScore((s) => s + (phase.points ?? 0));
            showCard(phase.id);
            advancePhase();
          }
          return { ...prev, step: nextStep, count: nextStep };
        });
      }
    };
    window.addEventListener('play-drag-success', handler as EventListener);
    return () => window.removeEventListener('play-drag-success', handler as EventListener);
  }, [config, phase, advancePhase, showCard]);

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
  const skyboxUrl = config.environment.skybox_url || '';

  return (
    <div className="h-screen w-screen bg-transparent">
      <WebGLCheck>
        <a-scene
          embedded
          vr-mode-ui="enabled: false"
          renderer="antialias: true; colorManagement: true; physicallyCorrectLights: true"
          cursor="rayOrigin: mouse; fuse: false"
          raycaster="objects: [config-clickable], [config-draggable]; far: 100"
        >
          {skyboxUrl ? (
            <a-sky src={skyboxUrl} rotation="0 -130 0"></a-sky>
          ) : (
            <a-sky color="#0f172a" rotation="0 -130 0"></a-sky>
          )}

          <a-entity
            cursor="fuse: false"
            raycaster="objects: .clickable; far: 100"
            position="0 0 -1"
            geometry="primitive: ring; radiusInner: 0.01; radiusOuter: 0.015"
            material="color: #00e5ff; shader: flat"
          ></a-entity>

          <GameAssets config={config} currentPhase={phase} chainStep={chainStep} />
          <Lighting />
          <CameraRig phaseTitle={phase.title} phaseInstruction={phase.instruction} />

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
