// @ts-nocheck
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

import { ORGANELLES, PHASES, KNOWLEDGE_CARDS, proxyUrl } from './config';
import { registerVoyageComponents } from './aframe/registerComponents';
import { OverlayUI } from './components/OverlayUI';
import type { PhaseProgress } from './components/OverlayUI';
import { OrganelleEntities } from './scene/OrganelleEntities';
import { PhaseObjects } from './scene/PhaseObjects';
import { CameraRig } from './scene/CameraRig';
import { Lighting } from './scene/Lighting';

// ═══════════════════════════════════════════════════════════════════════════
// VOYAGE INSIDE THE CELL — 6-Phase VR Biology Game
// ═══════════════════════════════════════════════════════════════════════════
//
// Phase 0: Welcome (intro)         → Continue button
// Phase 1: Click Mitochondria      → +100 pts → Knowledge card → Got it → Continue
// Phase 2: Drag Glucose → Mito     → +150 pts (+50 bonus <10s) → Knowledge card → Got it → Continue
// Phase 3: Drag 3 proteins → Lyso  → +100 each (300 total) → Knowledge card → Got it → Continue
// Phase 4: Drag chain ER → Golgi   → +100 each (200 total) → Knowledge card → Got it → Continue
// Phase 5: Mission Complete         → Celebration + Play Again
//
// ═══════════════════════════════════════════════════════════════════════════

export default function VoyagePage() {
  // ── Core game state ──
  const [ready, setReady] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [score, setScore] = useState(0);
  const [prevScore, setPrevScore] = useState(0);

  // ── Knowledge card state ──
  const [showKnowledgeCard, setShowKnowledgeCard] = useState(false);
  const [knowledgeCardData, setKnowledgeCardData] = useState<{ title: string; body: string; tag: string } | null>(null);
  const [showContinue, setShowContinue] = useState(false);

  // ── Multi-step phase progress ──
  const [phaseProgress, setPhaseProgress] = useState<PhaseProgress | null>(null);

  // ── Wrong-click hint ──
  const [wrongClickHint, setWrongClickHint] = useState<string | null>(null);
  const wrongClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Phase-advance debounce guard ──
  const phaseAdvancedRef = useRef(false);

  // ── Scene loading state ──
  const [rawSkyboxUrl, setRawSkyboxUrl] = useState<string | null>(null);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [modelData, setModelData] = useState<any[]>([]);

  // ── Timing ref for phase 2 bonus ──
  const phaseStartTime = useRef<number>(0);

  // ── Completed phases set (kept for OrganelleEntities compatibility) ──
  const [completedPhases, setCompletedPhases] = useState<Set<number>>(new Set());

  const skyboxUrl = proxyUrl(rawSkyboxUrl);
  const phase = PHASES[currentPhase] || PHASES[0];

  // ═══════════════════════════════════════════════════════════════════════
  // SCENE LOADING
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const loadSceneData = async () => {
      try {
        console.log('[VOYAGE] Loading scene data from 18nxty...');
        const response = await fetch('/api/scenes/18nxty');
        const data = await response.json();

        if (response.ok && data.data) {
          console.log('[VOYAGE] Scene data loaded:', data.data);
          if (data.data.environment?.imagePath) {
            setRawSkyboxUrl(data.data.environment.imagePath);
            console.log('[VOYAGE] ✓ Skybox URL:', data.data.environment.imagePath);
          } else {
            console.warn('[VOYAGE] ⚠ No skybox URL found, using fallback color');
          }
          if (data.data.models && Array.isArray(data.data.models)) {
            setModelData(data.data.models);
            console.log('[VOYAGE] ✓ Loaded', data.data.models.length, 'models');
          }
          setSceneLoaded(true);
        } else {
          console.error('[VOYAGE] ❌ Failed to load scene:', data.error);
          setSceneLoaded(true);
        }
      } catch (error) {
        console.error('[VOYAGE] ❌ Error loading scene:', error);
        setSceneLoaded(true);
      }
    };
    loadSceneData();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // A-FRAME INIT
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (typeof window !== "undefined" && sceneLoaded) {
      console.log('[VOYAGE] Initializing A-Frame...');
      if (!window.AFRAME) {
        require("aframe");
        require("aframe-environment-component");
        require("aframe-extras");
        console.log('[VOYAGE] ✓ A-Frame loaded');
      } else {
        console.log('[VOYAGE] ✓ A-Frame already loaded');
      }

      if (!document.querySelector('script[src*="aframe-transformer-component"]')) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/aframe-transformer-component@1.2.0/dist/aframe-transformer-component.min.js';
        script.async = false;
        document.head.appendChild(script);
      }

      registerVoyageComponents();

      const timer = setTimeout(() => {
        setReady(true);
        console.log('[VOYAGE] ✓ A-Frame initialized and ready!');
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [sceneLoaded]);

  // ═══════════════════════════════════════════════════════════════════════
  // EXPOSE PHASE + STEP TO A-FRAME
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.currentPhase = currentPhase;
    }
  }, [currentPhase]);

  // Sync phase 4 chain step to window for game-draggable
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.voyagePhaseStep = phaseProgress?.step ?? 0;
    }
  }, [phaseProgress]);

  // Fullscreen re-render
  useEffect(() => {
    const handleFullscreenChange = () => setCurrentPhase(p => p);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE START — record timer, init multi-step progress
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    phaseStartTime.current = Date.now();
    setShowContinue(phase.type === 'intro' || phase.type === 'complete');
    // NOTE: Do NOT reset showKnowledgeCard/knowledgeCardData here.
    // The show-knowledge event fires right after phase-advance, and resetting
    // here would wipe out the card before it renders. The card is dismissed
    // only when the user clicks "Got it →" (via dismissCard).
    setWrongClickHint(null);

    if (phase.type === 'drag-multi') {
      setPhaseProgress({ count: 0, total: phase.total || 3 });
    } else if (phase.type === 'drag-chain') {
      setPhaseProgress({ count: 0, total: (phase.steps || []).length, step: 0, steps: phase.steps || [] });
    } else {
      setPhaseProgress(null);
    }
  }, [currentPhase]);

  // ═══════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  const addScore = useCallback((points: number) => {
    setPrevScore(score);
    setScore(s => s + points);
  }, [score]);

  const showCard = useCallback((phaseId: number) => {
    const card = KNOWLEDGE_CARDS[phaseId];
    if (card) {
      setKnowledgeCardData(card);
      setShowKnowledgeCard(true);
    }
  }, []);

  const dismissCard = useCallback(() => {
    setShowKnowledgeCard(false);
    setKnowledgeCardData(null);
    setShowContinue(true);
  }, []);

  const handleContinue = useCallback(() => {
    if (currentPhase === 5) {
      setCurrentPhase(0);
      setScore(0);
      setPrevScore(0);
      window.currentScore = 0; // Sync to window
      setCompletedPhases(new Set());
      setPhaseProgress(null);
      setShowContinue(false);
    } else {
      setCompletedPhases(prev => new Set(prev).add(currentPhase));
      setShowContinue(false);
      setCurrentPhase(p => p + 1);
    }
  }, [currentPhase]);

  // ═══════════════════════════════════════════════════════════════════════
  // EVENT: voyage-continue (VR Continue button clicked)
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const handler = () => {
      console.log('[VOYAGE] voyage-continue received, calling handleContinue');
      handleContinue();
    };
    window.addEventListener('voyage-continue', handler);
    return () => window.removeEventListener('voyage-continue', handler);
  }, [handleContinue]);

  // ═══════════════════════════════════════════════════════════════════════
  // EVENT: phase-advance (Phase 1 click success)
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const handler = () => {
      if (phaseAdvancedRef.current) return; // prevent double-fire
      phaseAdvancedRef.current = true;
      console.log('[VOYAGE] phase-advance received, currentPhase:', window.currentPhase);
      setCurrentPhase(prev => {
        const next = prev + 1;
        window.currentPhase = next;
        console.log('[VOYAGE] Phase advanced:', prev, '→', next);

        // Dispatch phase-changed-vr for VR systems
        const newScore = score + (PHASES[1].points || 100);
        window.dispatchEvent(new CustomEvent('phase-changed-vr', {
          detail: { phase: next, score: newScore }
        }));

        return next;
      });
      setScore(prev => {
        const newScore = prev + (PHASES[1].points || 100);
        window.currentScore = newScore; // Sync to window
        return newScore;
      });
      // Reset guard after 1s
      setTimeout(() => { phaseAdvancedRef.current = false; }, 1000);
    };
    window.addEventListener('phase-advance', handler);
    return () => window.removeEventListener('phase-advance', handler);
  }, [score]);

  // ═══════════════════════════════════════════════════════════════════════
  // EVENT: show-knowledge (display knowledge card)
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const handler = (e: any) => {
      const phaseId = e.detail?.phase;
      const card = KNOWLEDGE_CARDS[phaseId];
      console.log('[KNOWLEDGE] setting card for phase:', phaseId, card);
      if (phaseId != null && card) {
        setKnowledgeCardData(card);
        setShowKnowledgeCard(true);
      }
    };
    window.addEventListener('show-knowledge', handler);
    return () => window.removeEventListener('show-knowledge', handler);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // EVENT: drag-success (phase 2/3/4 drag completions)
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const handler = (e: any) => {
      const dragPhase = e.detail?.phase ?? window.currentPhase;
      console.log('[VOYAGE] drag-success received, dragPhase:', dragPhase);

      if (dragPhase === 2) {
        const elapsed = (Date.now() - phaseStartTime.current) / 1000;
        const bonus = elapsed < 10 ? 50 : 0;
        const totalPoints = (PHASES[2].points || 150) + bonus;

        setScore(prev => {
          const newScore = prev + totalPoints;
          window.currentScore = newScore; // Sync to window

          // Advance to phase 3
          setCurrentPhase(3);
          window.currentPhase = 3;

          // Dispatch phase-changed-vr for VR systems
          window.dispatchEvent(new CustomEvent('phase-changed-vr', {
            detail: { phase: 3, score: newScore }
          }));

          return newScore;
        });

        if (bonus > 0) console.log('[VOYAGE] ⚡ Speed bonus! +50');
        setKnowledgeCardData(KNOWLEDGE_CARDS[2]);
        setShowKnowledgeCard(true);
      } else if (dragPhase === 3) {
        setPhaseProgress(prev => {
          if (!prev) return prev;
          const next = { ...prev, count: prev.count + 1 };
          if (next.count >= next.total) {
            setKnowledgeCardData(KNOWLEDGE_CARDS[3]);
            setShowKnowledgeCard(true);

            // Advance to phase 4 after completing all 3 proteins
            setScore(s => {
              const newScore = s + (PHASES[3].points || 100);
              window.currentScore = newScore;

              setCurrentPhase(4);
              window.currentPhase = 4;

              // Dispatch phase-changed-vr for VR systems
              window.dispatchEvent(new CustomEvent('phase-changed-vr', {
                detail: { phase: 4, score: newScore }
              }));

              return newScore;
            });
          } else {
            // Not done yet, just update score
            setScore(s => {
              const newScore = s + (PHASES[3].points || 100);
              window.currentScore = newScore;
              return newScore;
            });
          }
          return next;
        });
      } else if (dragPhase === 4) {
        setPhaseProgress(prev => {
          if (!prev || prev.step === undefined) return prev;
          const nextStep = prev.step + 1;
          if (nextStep >= prev.total) {
            setKnowledgeCardData(KNOWLEDGE_CARDS[4]);
            setShowKnowledgeCard(true);

            // Advance to phase 5 after completing the chain
            setScore(s => {
              const newScore = s + (PHASES[4].points || 100);
              window.currentScore = newScore;

              setCurrentPhase(5);
              window.currentPhase = 5;

              // Dispatch phase-changed-vr for VR systems
              window.dispatchEvent(new CustomEvent('phase-changed-vr', {
                detail: { phase: 5, score: newScore }
              }));

              return newScore;
            });
          } else {
            // Not done yet, just update score
            setScore(s => {
              const newScore = s + (PHASES[4].points || 100);
              window.currentScore = newScore;
              return newScore;
            });
          }
          return { ...prev, step: nextStep, count: nextStep };
        });
      }
    };
    window.addEventListener('drag-success', handler);
    return () => window.removeEventListener('drag-success', handler);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // EVENT: wrong-click (flash hint text)
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const handler = (e: any) => {
      const name = e.detail?.name || 'that organelle';
      setWrongClickHint(`That's the ${name} — try clicking the Mitochondria!`);
      if (wrongClickTimer.current) clearTimeout(wrongClickTimer.current);
      wrongClickTimer.current = setTimeout(() => {
        setWrongClickHint(null);
      }, 2500);
    };
    window.addEventListener('wrong-click', handler);
    return () => window.removeEventListener('wrong-click', handler);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // EVENT: show-info-panel (display organelle knowledge panel in VR)
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const handler = (e: any) => {
      const name = e.detail?.name;
      if (!name) return;

      // Find organelle data
      const organelle = ORGANELLES.find(org => org.name === name);
      if (!organelle) return;

      // Update panel content
      const titleEl = document.getElementById('info-panel-title');
      const descEl = document.getElementById('info-panel-desc');
      const funcEl = document.getElementById('info-panel-function');
      const panelEl = document.getElementById('vr-info-panel');

      if (titleEl) titleEl.setAttribute('value', organelle.name);
      if (descEl) descEl.setAttribute('value', organelle.description || 'No description available');
      if (funcEl) funcEl.setAttribute('value', `Function: ${organelle.function || 'N/A'}`);

      // Only show panel in VR mode
      var scene = document.querySelector('a-scene');
      if (panelEl && scene && scene.is('vr-mode')) {
        panelEl.setAttribute('visible', 'true');
        console.log('[INFO-PANEL] Showing panel for:', organelle.name);
      }
    };
    window.addEventListener('show-info-panel', handler);
    return () => window.removeEventListener('show-info-panel', handler);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // LOADING SCREEN
  // ═══════════════════════════════════════════════════════════════════════

  if (!ready || !sceneLoaded) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ backgroundColor: '#0f172a', fontFamily: 'system-ui' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full animate-spin mx-auto mb-4" style={{ border: '4px solid rgba(0, 229, 255, 0.2)', borderTopColor: '#00e5ff' }}></div>
          <p className="font-bold uppercase tracking-widest text-xs" style={{ color: '#00e5ff' }}>
            {!sceneLoaded ? 'Loading Scene Data...' : 'Loading VR Experience...'}
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  const phaseInfo = {
    title: phase.title,
    instruction: phase.instruction,
    target: phase.target || phase.dragTarget,
    showContinue: showContinue,
  };

  return (
    <div className="h-screen w-screen bg-transparent">
      <a-scene
        embedded
        vr-mode-ui="enabled: false"
        renderer="antialias: true; colorManagement: true; physicallyCorrectLights: true"
        cursor="rayOrigin: mouse; fuse: false"
        raycaster="objects: [game-clickable], [game-draggable], [data-draggable]; far: 100"
      >
        {/* AI Skybox */}
        {skyboxUrl ? (
          <a-sky src={skyboxUrl} rotation="0 -130 0"></a-sky>
        ) : (
          <a-sky color="#0f172a" rotation="0 -130 0"></a-sky>
        )}

        {/* Cursor Reticle */}
        <a-entity
          cursor="fuse: false"
          raycaster="objects: .clickable; far: 100"
          position="0 0 -1"
          geometry="primitive: ring; radiusInner: 0.01; radiusOuter: 0.015"
          material="color: #00e5ff; shader: flat"
        ></a-entity>

        {/* Organelle Models */}
        <OrganelleEntities
          phaseInfo={phaseInfo}
          currentPhase={currentPhase}
          completedPhases={completedPhases}
        />

        {/* Phase-specific objects (draggable proteins, polypeptide, ATP burst, etc.) */}
        <PhaseObjects
          currentPhase={currentPhase}
          phaseProgress={phaseProgress}
        />

        {/* PBR Lighting */}
        <Lighting />

        {/* VR Camera Rig */}
        <CameraRig
          phaseTitle={phase.title}
          phaseInstruction={phase.instruction}
        />

        {/* Teleport Floor - invisible plane for teleport-controls */}
        <a-plane
          class="teleport-floor"
          position="0 -1 0"
          rotation="-90 0 0"
          width="20"
          height="20"
          material="color: #10b981; opacity: 0.1; transparent: true; visible: false"
        ></a-plane>
      </a-scene>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
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
          position: absolute;
          width: 10px;
          height: 10px;
          animation: confetti-fall linear infinite;
        }
      `}</style>

      {/* Overlay UI via portal */}
      {typeof window !== 'undefined' && createPortal(
        <>
          <OverlayUI
            currentPhase={currentPhase}
            score={score}
            prevScore={prevScore}
            phaseProgress={phaseProgress}
            showKnowledgeCard={showKnowledgeCard}
            knowledgeCardData={knowledgeCardData}
            showContinue={showContinue}
            onDismissCard={dismissCard}
            onContinue={handleContinue}
          />

          {/* Wrong-click hint toast */}
          {wrongClickHint && (
            <div
              className="fixed top-24 left-1/2 -translate-x-1/2 pointer-events-none animate-[slideUp_0.25s_ease-out]"
              style={{
                zIndex: 10000,
                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                color: 'white',
                padding: '10px 24px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'system-ui',
                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
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
