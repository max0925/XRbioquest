// @ts-nocheck
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type {
  GameConfig,
  PhaseConfig,
  KnowledgeCardConfig,
  HUDConfig,
  QuizPhase,
  QuizOption,
} from '@/types/game-config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayPhaseProgress {
  count: number;
  total: number;
  step?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PlayOverlayUIProps {
  config: GameConfig;
  currentPhase: PhaseConfig;
  phaseIndex: number;
  totalPhases: number;
  score: number;
  prevScore: number;
  phaseProgress: PlayPhaseProgress | null;
  showKnowledgeCard: boolean;
  knowledgeCardData: KnowledgeCardConfig | null;
  showContinue: boolean;
  onDismissCard: () => void;
  onContinue: () => void;
  onQuizAnswer?: (optionId: string, isCorrect: boolean) => void;
  npcName?: string;
  npcChatOpen?: boolean;
  npcMessages?: ChatMessage[];
  npcIsTyping?: boolean;
  autoHint?: string | null;
  onNpcChatClose?: () => void;
  onNpcSendMessage?: (msg: string) => void;
  inventory?: string[];
  showDeliveryPrompt?: boolean;
  selectedInventoryItem?: string | null;
  onSelectInventoryItem?: (id: string) => void;
  quizAnswered?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASE_ICON: Record<string, string> = {
  click: '🔬',
  drag: '⚡',
  'drag-multi': '♻️',
  'drag-chain': '🔗',
  quiz: '💡',
  explore: '🧭',
  intro: '📋',
  complete: '🎉',
};

const DM = '"DM Sans", system-ui, sans-serif';
const MONO = '"DM Mono", "Fira Mono", monospace';

const PANEL_BASE: React.CSSProperties = {
  backgroundColor: 'rgba(0,0,0,0.72)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '14px',
  fontFamily: DM,
};

// ─── Injected keyframes ───────────────────────────────────────────────────────

const KEYFRAMES = `
  @keyframes hud-slide-left {
    from { opacity: 0; transform: translateX(-20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes hud-slide-right {
    from { opacity: 0; transform: translateX(20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes hud-scale-in {
    from { opacity: 0; transform: translate(-50%, -48%) scale(0.92); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  @keyframes hud-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes hud-shake {
    0%, 100% { transform: translateX(0); }
    20%  { transform: translateX(-8px); }
    40%  { transform: translateX(8px); }
    60%  { transform: translateX(-5px); }
    80%  { transform: translateX(5px); }
  }
  @keyframes confetti-fall {
    0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
  @keyframes hud-bounce-in {
    0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    60%  { transform: translate(-50%, -50%) scale(1.04); }
    80%  { transform: translate(-50%, -50%) scale(0.98); }
    100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
`;

// ─── XP Bar ───────────────────────────────────────────────────────────────────

function XPBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (score / max) * 100) : 0;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: '3px', backgroundColor: 'rgba(255,255,255,0.07)', zIndex: 10010,
    }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        backgroundColor: '#10b981',
        boxShadow: '0 0 8px #10b981, 0 0 20px rgba(16,185,129,0.35)',
        transition: 'width 0.7s cubic-bezier(0.22,1,0.36,1)',
      }} />
    </div>
  );
}

// ─── Quest Panel (top-left) ───────────────────────────────────────────────────

function QuestPanel({
  phase,
  phaseIndex,
  instruction,
  interactivePhases,
  config,
  showContinue,
  onContinue,
}: {
  phase: PhaseConfig;
  phaseIndex: number;
  instruction: string;
  interactivePhases: PhaseConfig[];
  config: GameConfig;
  showContinue: boolean;
  onContinue: () => void;
}) {
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [phase.id]);

  const isIntro = phase.type === 'intro';

  // Count interactive phase done/current for label
  const interactiveDone = interactivePhases.filter((p) => {
    const gi = config.phases.findIndex((cp) => cp.id === p.id);
    return gi < phaseIndex;
  }).length;
  const interactiveTotal = interactivePhases.length;

  return (
    <div
      key={animKey}
      style={{
        position: 'fixed',
        top: '70px',
        left: '20px',
        width: '280px',
        ...PANEL_BASE,
        padding: '16px',
        zIndex: 9999,
        animation: 'hud-slide-left 0.35s cubic-bezier(0.22,1,0.36,1) both',
        pointerEvents: showContinue ? 'auto' : 'none',
      }}
    >
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px' }}>📋</span>
        <span style={{
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
          color: '#fbbf24', textTransform: 'uppercase',
        }}>
          Current Mission
        </span>
      </div>

      <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '12px' }} />

      {/* Phase title */}
      <div style={{
        fontSize: '15px', fontWeight: 700, color: 'white',
        lineHeight: 1.3, marginBottom: '8px',
      }}>
        {phase.title}
      </div>

      {/* Instruction */}
      <div style={{
        fontSize: '13px', color: 'rgba(255,255,255,0.6)',
        lineHeight: 1.55, marginBottom: '14px',
      }}>
        {instruction}
      </div>

      {/* Progress dots */}
      {!isIntro && interactivePhases.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            {interactivePhases.map((p) => {
              const gi = config.phases.findIndex((cp) => cp.id === p.id);
              const isDone = gi < phaseIndex;
              const isCurrent = gi === phaseIndex;
              return (
                <div
                  key={p.id}
                  style={{
                    width: isCurrent ? '18px' : '7px',
                    height: '7px',
                    borderRadius: '4px',
                    backgroundColor: isCurrent
                      ? '#10b981'
                      : isDone
                      ? 'rgba(16,185,129,0.55)'
                      : 'rgba(255,255,255,0.15)',
                    boxShadow: isCurrent ? '0 0 8px #10b981' : 'none',
                    transition: 'width 0.3s ease, background-color 0.3s ease',
                  }}
                />
              );
            })}
          </div>
          <span style={{
            fontSize: '11px', color: 'rgba(255,255,255,0.3)',
            fontFamily: MONO,
          }}>
            {interactiveDone}/{interactiveTotal}
          </span>
        </div>
      )}

      {/* Begin / Continue button */}
      {showContinue && (
        <button
          onClick={onContinue}
          style={{
            marginTop: '14px',
            width: '100%',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '10px',
            fontSize: '13px',
            fontWeight: 700,
            fontFamily: DM,
            cursor: 'pointer',
            letterSpacing: '0.04em',
            boxShadow: '0 0 16px rgba(16,185,129,0.35)',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10b981')}
        >
          {isIntro ? 'Begin Voyage →' : 'Continue →'}
        </button>
      )}
    </div>
  );
}

// ─── Stats Panel (top-right) ──────────────────────────────────────────────────

function StatsPanel({
  score,
  prevScore,
  phaseIndex,
  interactivePhases,
  config,
  cardsEarned,
}: {
  score: number;
  prevScore: number;
  phaseIndex: number;
  interactivePhases: PhaseConfig[];
  config: GameConfig;
  cardsEarned: number;
}) {
  const scoreUp = score > prevScore;
  const totalInteractive = interactivePhases.length;
  const doneCount = interactivePhases.filter((p) => {
    const gi = config.phases.findIndex((cp) => cp.id === p.id);
    return gi < phaseIndex;
  }).length;
  const barPct = totalInteractive > 0 ? (doneCount / totalInteractive) * 100 : 0;

  return (
    <div style={{
      position: 'fixed',
      top: '70px',
      right: '20px',
      width: '180px',
      ...PANEL_BASE,
      padding: '14px 16px',
      zIndex: 9999,
      animation: 'hud-slide-right 0.35s cubic-bezier(0.22,1,0.36,1) both',
    }}>
      {/* XP */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
        <span style={{ fontSize: '13px' }}>⚡</span>
        <span style={{
          fontFamily: MONO,
          fontSize: '22px',
          fontWeight: 700,
          color: scoreUp ? '#10b981' : '#34d399',
          transition: 'color 0.5s',
          lineHeight: 1,
        }}>
          {score}
        </span>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: MONO }}>XP</span>
      </div>

      {/* Phase progress bar */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{
          height: '5px', borderRadius: '3px',
          backgroundColor: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${barPct}%`,
            backgroundColor: '#10b981',
            borderRadius: '3px',
            transition: 'width 0.6s ease',
          }} />
        </div>
        <div style={{
          marginTop: '4px', display: 'flex', justifyContent: 'space-between',
          fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: MONO,
        }}>
          <span>{doneCount}/{totalInteractive} phases</span>
        </div>
      </div>

      {/* Cards count */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        marginTop: '8px', paddingTop: '8px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}>
        <span style={{ fontSize: '12px' }}>🧬</span>
        <span style={{
          fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: DM,
        }}>
          <span style={{ color: '#6ee7b7', fontWeight: 700, fontFamily: MONO }}>{cardsEarned}</span>
          {' '}cards earned
        </span>
      </div>
    </div>
  );
}

// ─── Inventory Bar (bottom-center) ────────────────────────────────────────────

function InventoryBar({ items, selectedItem, onSelect, deliveryTargetName, config }: {
  items: string[];
  selectedItem: string | null;
  onSelect: (id: string) => void;
  deliveryTargetName: string | null;
  config: GameConfig;
}) {
  const SLOT_COUNT = 6;

  // Look up asset info for display
  const getAssetInfo = (id: string) => {
    const asset = config.assets.find((a: any) => a.id === id);
    const name = asset?.name ?? id;
    // First letter of each word, max 2 chars (e.g. "DNA" → "DN", "Glucose" → "G")
    const initials = name.split(/[\s-]+/).map((w: string) => w[0]?.toUpperCase() ?? '').join('').slice(0, 2);
    const color = (asset as any)?.primitive_color ?? '#F59E0B';
    return { initials, color, name };
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
    }}>
      {/* Delivery hint when item selected */}
      {selectedItem && deliveryTargetName && (
        <div style={{
          padding: '8px 20px',
          borderRadius: '100px',
          backgroundColor: 'rgba(16,185,129,0.85)',
          color: 'white',
          fontSize: '13px',
          fontWeight: 700,
          fontFamily: DM,
          letterSpacing: '0.02em',
          boxShadow: '0 4px 20px rgba(16,185,129,0.4)',
          animation: 'hud-fade-in 0.3s ease both',
          pointerEvents: 'none',
        }}>
          Click on <span style={{ fontFamily: MONO, backgroundColor: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '4px', marginLeft: '4px', marginRight: '4px' }}>{deliveryTargetName}</span> to deliver
        </div>
      )}

      {/* Inventory slots */}
      <div style={{
        display: 'flex',
        gap: '6px',
        padding: '8px',
        ...PANEL_BASE,
        borderRadius: '14px',
        backgroundColor: 'rgba(0,0,0,0.6)',
      }}>
        {Array.from({ length: SLOT_COUNT }).map((_, i) => {
          const item = items[i];
          const filled = !!item;
          const isSelected = filled && item === selectedItem;
          const info = filled ? getAssetInfo(item) : null;

          return (
            <div
              key={i}
              onMouseDown={filled ? (e) => { e.stopPropagation(); e.preventDefault(); } : undefined}
              onClick={filled ? (e) => { e.stopPropagation(); onSelect(item); } : undefined}
              title={info?.name}
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: filled ? '16px' : '14px',
                fontWeight: 800,
                fontFamily: MONO,
                color: 'white',
                cursor: filled ? 'pointer' : 'default',
                pointerEvents: filled ? 'auto' : 'none',
                backgroundColor: isSelected
                  ? (info?.color ?? 'rgba(245,158,11,0.35)')
                  : filled
                    ? `color-mix(in srgb, ${info?.color ?? '#F59E0B'} 35%, transparent)`
                    : 'rgba(255,255,255,0.03)',
                border: isSelected
                  ? `2px solid ${info?.color ?? 'rgba(245,158,11,0.9)'}`
                  : filled
                    ? `1px solid color-mix(in srgb, ${info?.color ?? '#F59E0B'} 60%, transparent)`
                    : '1px solid rgba(255,255,255,0.06)',
                boxShadow: isSelected
                  ? `0 0 16px color-mix(in srgb, ${info?.color ?? '#F59E0B'} 50%, transparent), inset 0 0 8px rgba(0,0,0,0.2)`
                  : filled ? `0 0 10px color-mix(in srgb, ${info?.color ?? '#F59E0B'} 25%, transparent)` : 'none',
                transition: 'all 0.2s ease',
                opacity: filled ? 1 : 0.4,
                textShadow: filled ? '0 1px 3px rgba(0,0,0,0.5)' : 'none',
              }}>
              {filled ? info?.initials : '·'}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Controls Hint (bottom-left, auto-hides) ──────────────────────────────────

function ControlsHint() {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 10000);
  }, []);

  useEffect(() => {
    resetTimer();
    window.addEventListener('keydown', resetTimer);
    return () => {
      window.removeEventListener('keydown', resetTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '20px',
      zIndex: 9999,
      opacity: visible ? 1 : 0,
      transition: 'opacity 1s ease',
      pointerEvents: 'none',
    }}>
      <span style={{
        fontSize: '11px',
        color: 'rgba(255,255,255,0.3)',
        fontFamily: DM,
        letterSpacing: '0.02em',
      }}>
        WASD Move&nbsp;&nbsp;│&nbsp;&nbsp;Mouse Look&nbsp;&nbsp;│&nbsp;&nbsp;Click Collect / Deliver&nbsp;&nbsp;│&nbsp;&nbsp;T Talk
      </span>
    </div>
  );
}

// ─── Crosshair ────────────────────────────────────────────────────────────────

function Crosshair() {
  const s = 20;
  const t = 2;
  return (
    <div style={{
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: `${s}px`, height: `${s}px`,
      zIndex: 9998,
      pointerEvents: 'none',
    }}>
      {/* Horizontal */}
      <div style={{
        position: 'absolute', top: '50%', left: 0, right: 0,
        height: `${t}px`, marginTop: `-${t / 2}px`,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: '1px',
      }} />
      {/* Vertical */}
      <div style={{
        position: 'absolute', left: '50%', top: 0, bottom: 0,
        width: `${t}px`, marginLeft: `-${t / 2}px`,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: '1px',
      }} />
    </div>
  );
}

// ─── Quiz Modal (center screen) ───────────────────────────────────────────────

function QuizModal({
  phase,
  onAnswer,
}: {
  phase: QuizPhase;
  onAnswer: (optionId: string, isCorrect: boolean) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [shake, setShake] = useState<string | null>(null);

  const handleClick = (opt: QuizOption) => {
    if (selectedId !== null || wrongId !== null) return;

    if (opt.is_correct) {
      setSelectedId(opt.id);
      // Auto-advance after 2s so user can read explanation
      setTimeout(() => onAnswer(opt.id, true), 2000);
    } else {
      setWrongId(opt.id);
      setShake(opt.id);
      setTimeout(() => { setWrongId(null); setShake(null); }, 700);
    }
  };

  const opts = phase.options;
  const rows = [opts.slice(0, 2), opts.slice(2, 4)];

  return (
    <div style={{
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '480px',
      maxWidth: 'calc(100vw - 40px)',
      zIndex: 10002,
      animation: 'hud-scale-in 0.3s cubic-bezier(0.22,1,0.36,1) both',
      pointerEvents: 'auto',
    }}>
      <div style={{
        ...PANEL_BASE,
        borderRadius: '16px',
        padding: '24px',
        backgroundColor: 'rgba(0,0,0,0.85)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Label */}
        <div style={{
          fontSize: '10px', fontWeight: 700, color: '#fbbf24',
          letterSpacing: '0.14em', textTransform: 'uppercase',
          marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span>💡</span> Quick Check
        </div>

        {/* Question */}
        <div style={{
          fontSize: '17px', fontWeight: 600, color: 'white',
          lineHeight: 1.4, marginBottom: '20px',
        }}>
          {phase.question}
        </div>

        {/* 2×2 grid */}
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            {row.map((opt) => {
              const isCorrect = opt.id === selectedId;
              const isWrong = opt.id === wrongId;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleClick(opt)}
                  disabled={selectedId !== null}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '12px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontFamily: DM,
                    fontWeight: 500,
                    cursor: selectedId !== null ? 'default' : 'pointer',
                    transition: 'all 0.15s ease',
                    animation: shake === opt.id ? 'hud-shake 0.4s ease' : 'none',
                    backgroundColor: isCorrect
                      ? 'rgba(16,185,129,0.2)'
                      : isWrong
                      ? 'rgba(239,68,68,0.2)'
                      : 'rgba(255,255,255,0.07)',
                    border: isCorrect
                      ? '1px solid rgba(16,185,129,0.6)'
                      : isWrong
                      ? '1px solid rgba(239,68,68,0.5)'
                      : '1px solid rgba(255,255,255,0.1)',
                    color: isCorrect ? '#6ee7b7' : isWrong ? '#fca5a5' : '#e2e8f0',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedId !== null || isWrong) return;
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    if (selectedId !== null || isWrong) return;
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)';
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    marginRight: '8px',
                    fontSize: '10px',
                    fontWeight: 700,
                    fontFamily: MONO,
                    color: isCorrect ? '#6ee7b7' : isWrong ? '#fca5a5' : 'rgba(255,255,255,0.35)',
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  {opt.text}
                </button>
              );
            })}
          </div>
        ))}

        {/* Explanation after correct */}
        {selectedId !== null && (
          <div style={{
            marginTop: '4px',
            padding: '12px 14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.25)',
            fontSize: '13px',
            color: '#6ee7b7',
            lineHeight: 1.5,
            animation: 'hud-fade-in 0.3s ease both',
          }}>
            <span style={{ fontWeight: 700 }}>✓ Correct! </span>
            {phase.explanation}
            <div style={{
              marginTop: '8px', fontSize: '11px',
              color: 'rgba(255,255,255,0.35)',
            }}>
              Advancing in 2s…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Knowledge Card Modal (center screen) ─────────────────────────────────────

function KnowledgeCardModal({
  card,
  onDismiss,
}: {
  card: KnowledgeCardConfig;
  onDismiss: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 10003,
        animation: 'hud-fade-in 0.2s ease both',
        pointerEvents: 'auto',
      }} />

      {/* Card */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '420px',
        maxWidth: 'calc(100vw - 40px)',
        zIndex: 10004,
        animation: 'hud-scale-in 0.3s cubic-bezier(0.22,1,0.36,1) both',
        pointerEvents: 'auto',
      }}>
        <div style={{
          backgroundColor: 'rgba(10,15,30,0.97)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
          borderLeft: '3px solid #10b981',
          boxShadow: '0 24px 60px rgba(0,0,0,0.65), 0 0 40px rgba(16,185,129,0.06)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', flexShrink: 0,
              }}>
                💡
              </div>
              <div>
                <div style={{
                  fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em',
                  color: '#10b981', textTransform: 'uppercase', marginBottom: '3px',
                  fontFamily: DM,
                }}>
                  Knowledge Card
                </div>
                <div style={{
                  fontSize: '16px', fontWeight: 700, color: 'white', fontFamily: DM,
                }}>
                  {card.title}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '18px 24px' }}>
            <div style={{
              fontSize: '14px', color: 'rgba(226,232,240,0.88)',
              lineHeight: 1.65, marginBottom: '14px', fontFamily: DM,
            }}>
              {card.body}
            </div>

            {/* Misconception */}
            {card.misconception && (
              <div style={{
                padding: '10px 14px', borderRadius: '10px', marginBottom: '14px',
                backgroundColor: 'rgba(251,191,36,0.06)',
                border: '1px solid rgba(251,191,36,0.2)',
                fontSize: '12px', color: '#fcd34d',
                fontStyle: 'italic', lineHeight: 1.5, fontFamily: DM,
              }}>
                ⚠️ Common misconception: {card.misconception}
              </div>
            )}

            {/* Footer row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '10px',
            }}>
              {/* NGSS tag */}
              <span style={{
                display: 'inline-block',
                padding: '4px 10px', borderRadius: '100px',
                backgroundColor: 'rgba(139,92,246,0.15)',
                border: '1px solid rgba(139,92,246,0.3)',
                fontSize: '11px', color: '#c4b5fd', fontFamily: DM,
              }}>
                {card.tag}
              </span>

              {/* GOT IT button */}
              <button
                onClick={onDismiss}
                style={{
                  padding: '9px 20px', borderRadius: '10px',
                  backgroundColor: '#10b981', color: 'white',
                  border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 700, fontFamily: DM,
                  letterSpacing: '0.05em',
                  boxShadow: '0 0 16px rgba(16,185,129,0.3)',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10b981')}
              >
                GOT IT →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Complete Screen ──────────────────────────────────────────────────────────

function CompleteScreen({
  phase,
  config,
  score,
  onPlayAgain,
}: {
  phase: PhaseConfig;
  config: GameConfig;
  score: number;
  onPlayAgain: () => void;
}) {
  const [displayScore, setDisplayScore] = useState(0);
  const passed = score >= config.scoring.passing_threshold;
  const pct = config.scoring.max_possible > 0
    ? Math.round((score / config.scoring.max_possible) * 100)
    : 0;

  // Count-up animation
  useEffect(() => {
    let start = 0;
    const duration = 1400;
    const step = 16;
    const increment = score / (duration / step);
    const interval = setInterval(() => {
      start += increment;
      if (start >= score) {
        setDisplayScore(score);
        clearInterval(interval);
      } else {
        setDisplayScore(Math.floor(start));
      }
    }, step);
    return () => clearInterval(interval);
  }, [score]);

  // Earned knowledge cards
  const earnedCards = config.phases
    .filter((p) => p.type !== 'intro' && p.type !== 'complete' && config.knowledge_cards?.[p.id])
    .map((p) => ({
      id: p.id,
      card: config.knowledge_cards[p.id],
      icon: PHASE_ICON[p.type] ?? '📚',
    }));

  // Confetti
  const confetti = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2.5}s`,
      duration: `${3 + Math.random() * 2}s`,
      color: ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#a78bfa'][i % 5],
      size: `${6 + Math.random() * 7}px`,
      round: Math.random() > 0.5,
    }))
  ).current;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      pointerEvents: 'none',
    }}>
      {/* Confetti */}
      {confetti.map((c) => (
        <div
          key={c.id}
          style={{
            position: 'absolute', top: '-10px', left: c.left,
            width: c.size, height: c.size,
            backgroundColor: c.color,
            borderRadius: c.round ? '50%' : '2px',
            animation: `confetti-fall ${c.duration} ${c.delay} ease-in both`,
          }}
        />
      ))}

      {/* Card */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '400px',
        maxWidth: 'calc(100vw - 40px)',
        animation: 'hud-bounce-in 0.6s cubic-bezier(0.22,1,0.36,1) both',
        pointerEvents: 'auto',
      }}>
        <div style={{
          backgroundColor: 'rgba(6,12,24,0.97)',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: '20px',
          padding: '32px 28px 28px',
          boxShadow: '0 0 60px rgba(16,185,129,0.1), 0 30px 80px rgba(0,0,0,0.7)',
          textAlign: 'center',
          fontFamily: DM,
        }}>
          {/* Emoji */}
          <div style={{ fontSize: '44px', marginBottom: '12px', lineHeight: 1 }}>🎉</div>

          {/* Title */}
          <div style={{
            fontSize: '22px', fontWeight: 800, color: 'white',
            letterSpacing: '-0.01em', marginBottom: '4px',
          }}>
            {phase.title}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>
            {phase.instruction}
          </div>

          {/* Score count-up */}
          <div style={{
            fontSize: '42px', fontWeight: 800,
            color: '#10b981', fontFamily: MONO,
            marginBottom: '6px', lineHeight: 1,
          }}>
            ⚡ {displayScore}
          </div>
          <div style={{
            fontSize: '12px', color: 'rgba(255,255,255,0.35)',
            fontFamily: MONO, marginBottom: '14px',
          }}>
            / {config.scoring.max_possible} XP
          </div>

          {/* Progress bar */}
          <div style={{
            height: '6px', borderRadius: '4px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            marginBottom: '6px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              backgroundColor: '#10b981',
              borderRadius: '4px',
              transition: 'width 1.4s cubic-bezier(0.22,1,0.36,1)',
              boxShadow: '0 0 8px #10b981',
            }} />
          </div>
          <div style={{
            fontSize: '11px', color: 'rgba(255,255,255,0.3)',
            fontFamily: MONO, marginBottom: '16px',
          }}>
            {pct}%
          </div>

          {/* Passed badge */}
          <div style={{ marginBottom: '20px' }}>
            {passed ? (
              <span style={{
                display: 'inline-block',
                padding: '5px 14px', borderRadius: '100px',
                backgroundColor: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.4)',
                fontSize: '12px', fontWeight: 700, color: '#34d399',
              }}>
                ✓ PASSED
              </span>
            ) : (
              <span style={{
                display: 'inline-block',
                padding: '5px 14px', borderRadius: '100px',
                backgroundColor: 'rgba(251,191,36,0.1)',
                border: '1px solid rgba(251,191,36,0.3)',
                fontSize: '12px', fontWeight: 700, color: '#fcd34d',
              }}>
                KEEP PRACTICING
              </span>
            )}
          </div>

          {/* Knowledge cards earned */}
          {earnedCards.length > 0 && (
            <div style={{
              textAlign: 'left', marginBottom: '22px',
              padding: '14px', borderRadius: '12px',
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <div style={{
                fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                marginBottom: '10px',
              }}>
                Knowledge Cards Earned
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {earnedCards.map(({ id, card, icon }) => (
                  <div key={id} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '13px', color: 'rgba(255,255,255,0.75)',
                  }}>
                    <span style={{ fontSize: '14px' }}>{icon}</span>
                    {card.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Play Again */}
          <button
            onClick={onPlayAgain}
            style={{
              width: '100%', padding: '12px',
              backgroundColor: '#10b981', color: 'white',
              border: 'none', borderRadius: '12px',
              fontSize: '14px', fontWeight: 700,
              fontFamily: DM, cursor: 'pointer',
              letterSpacing: '0.05em',
              boxShadow: '0 0 24px rgba(16,185,129,0.3)',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10b981')}
          >
            🔄 PLAY AGAIN
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NPC Chat Overlay ─────────────────────────────────────────────────────────

function NPCChatOverlay({
  npcName,
  isOpen,
  messages,
  isTyping,
  onClose,
  onSend,
}: {
  npcName: string;
  isOpen: boolean;
  messages: ChatMessage[];
  isTyping: boolean;
  onClose: () => void;
  onSend: (msg: string) => void;
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div style={{
      position: 'fixed', bottom: '90px', right: '20px',
      width: '300px', zIndex: 10001, pointerEvents: 'auto',
    }}>
      <div style={{
        ...PANEL_BASE,
        borderRadius: '16px',
        border: '1px solid rgba(16,185,129,0.25)',
        backgroundColor: 'rgba(6,12,24,0.95)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 0 20px rgba(16,185,129,0.05)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(16,185,129,0.12)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981',
            }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', fontFamily: DM }}>
              {npcName}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)', fontSize: '18px', lineHeight: 1,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div style={{
          padding: '12px 14px', maxHeight: '200px',
          overflowY: 'auto', scrollbarWidth: 'thin',
        }}>
          {messages.length === 0 && (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontFamily: DM }}>
              Ask me anything about this mission!
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={{
              marginBottom: '8px',
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <span style={{
                display: 'inline-block',
                maxWidth: '88%',
                fontSize: '12px',
                lineHeight: 1.5,
                padding: '8px 12px',
                borderRadius: '12px',
                fontFamily: DM,
                backgroundColor: msg.role === 'user'
                  ? 'rgba(59,130,246,0.12)'
                  : 'rgba(16,185,129,0.1)',
                color: msg.role === 'user' ? '#93c5fd' : '#6ee7b7',
                border: `1px solid ${msg.role === 'user' ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)'}`,
              }}>
                {msg.content}
              </span>
            </div>
          ))}
          {isTyping && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '8px' }}>
              <span style={{
                display: 'inline-block', fontSize: '12px',
                padding: '8px 12px', borderRadius: '12px',
                backgroundColor: 'rgba(16,185,129,0.1)',
                color: '#6ee7b7',
                border: '1px solid rgba(16,185,129,0.2)',
              }}>
                <span style={{ opacity: 0.7 }}>● ● ●</span>
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '8px 12px 12px', borderTop: '1px solid rgba(16,185,129,0.08)' }}>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input
              style={{
                flex: 1, fontSize: '12px', borderRadius: '10px',
                padding: '8px 12px', color: 'white', outline: 'none',
                backgroundColor: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                fontFamily: DM,
              }}
              placeholder="Ask for a hint…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') handleSend();
              }}
              autoFocus
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              style={{
                padding: '8px 14px', borderRadius: '10px',
                backgroundColor: '#10b981', color: 'white',
                border: 'none', cursor: !input.trim() || isTyping ? 'not-allowed' : 'pointer',
                fontSize: '12px', fontWeight: 700, fontFamily: DM,
                opacity: !input.trim() || isTyping ? 0.4 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              Send
            </button>
          </div>
          <p style={{
            textAlign: 'center', marginTop: '6px',
            fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontFamily: DM,
          }}>
            T to toggle · Esc to close
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PlayOverlayUI({
  config,
  currentPhase,
  phaseIndex,
  totalPhases,
  score,
  prevScore,
  phaseProgress,
  showKnowledgeCard,
  knowledgeCardData,
  showContinue,
  onDismissCard,
  onContinue,
  onQuizAnswer,
  npcName,
  npcChatOpen,
  npcMessages,
  npcIsTyping,
  autoHint,
  onNpcChatClose,
  onNpcSendMessage,
  inventory,
  showDeliveryPrompt,
  selectedInventoryItem,
  onSelectInventoryItem,
  quizAnswered,
}: PlayOverlayUIProps) {
  const hud: HUDConfig = config.hud;

  // Resolve delivery target name for the hint
  const deliveryTargetName = useMemo(() => {
    const phase = currentPhase;
    let targetId: string | null = null;
    if (phase.type === 'drag') targetId = (phase as any).drag_target;
    else if (phase.type === 'drag-multi') targetId = (phase as any).drag_target;
    else if (phase.type === 'drag-chain') {
      const step = phaseProgress?.step ?? 0;
      targetId = (phase as any).steps?.[step]?.drag_target ?? null;
    }
    if (!targetId) return null;
    const asset = config.assets.find((a: any) => a.id === targetId);
    return asset?.name ?? targetId;
  }, [currentPhase, config, phaseProgress]);

  // ── Dynamic instruction for multi-step phases ──
  let instruction = currentPhase.instruction;

  if (currentPhase.type === 'drag-multi' && phaseProgress) {
    instruction = instruction.replace(
      /\(\d+\/\d+\)/,
      `(${phaseProgress.count}/${phaseProgress.total})`
    );
  }

  if (currentPhase.type === 'drag-chain' && phaseProgress && phaseProgress.step !== undefined) {
    const step = currentPhase.steps[phaseProgress.step];
    if (step) {
      const dragItem = config.assets.find((a) => a.id === step.drag_item);
      const dragTarget = config.assets.find((a) => a.id === step.drag_target);
      instruction = `Step ${phaseProgress.step + 1}: Drag the ${dragItem?.name ?? step.drag_item} into the ${dragTarget?.name ?? step.drag_target}.`;
    } else {
      instruction = 'Pathway complete!';
    }
  }

  // ── Derived values ──
  const interactivePhases = config.phases.filter(
    (p) => p.type !== 'intro' && p.type !== 'complete'
  );

  const cardsEarned = interactivePhases.filter((p) => {
    const gi = config.phases.findIndex((cp) => cp.id === p.id);
    return gi < phaseIndex && !!config.knowledge_cards?.[p.id];
  }).length;

  const isComplete = currentPhase.type === 'complete';
  const isQuiz = currentPhase.type === 'quiz';
  const showQuestPanel = !isComplete;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      {/* Inject keyframes */}
      <style>{KEYFRAMES}</style>

      {/* ── XP Bar (top, full width) ── */}
      <XPBar score={score} max={config.scoring.max_possible} />

      {/* ── Quest Panel (top-left) ── */}
      {showQuestPanel && !isQuiz && (
        <QuestPanel
          phase={currentPhase}
          phaseIndex={phaseIndex}
          instruction={instruction}
          interactivePhases={interactivePhases}
          config={config}
          showContinue={showContinue}
          onContinue={onContinue}
        />
      )}

      {/* ── Stats Panel (top-right) ── */}
      {!isComplete && (
        <StatsPanel
          score={score}
          prevScore={prevScore}
          phaseIndex={phaseIndex}
          interactivePhases={interactivePhases}
          config={config}
          cardsEarned={cardsEarned}
        />
      )}

      {/* ── Crosshair (center) ── */}
      {!isComplete && !showKnowledgeCard && !isQuiz && (
        <Crosshair />
      )}

      {/* ── Inventory Bar (bottom-center) ── */}
      {!isComplete && (
        <InventoryBar
          items={inventory ?? []}
          selectedItem={selectedInventoryItem ?? null}
          onSelect={onSelectInventoryItem ?? (() => {})}
          deliveryTargetName={deliveryTargetName}
          config={config}
        />
      )}

      {/* ── Controls Hint (bottom-left) ── */}
      {!isComplete && <ControlsHint />}

      {/* ── Quiz Modal (center) ── */}
      {isQuiz && !showKnowledgeCard && !quizAnswered && (
        <div style={{ pointerEvents: 'auto' }}>
          <QuizModal
            key={currentPhase.id}
            phase={currentPhase as QuizPhase}
            onAnswer={onQuizAnswer ?? (() => {})}
          />
        </div>
      )}

      {/* ── Knowledge Card Modal (center) ── */}
      {hud.show_knowledge_cards && showKnowledgeCard && knowledgeCardData && (
        <div style={{ pointerEvents: 'auto' }}>
          <KnowledgeCardModal
            card={knowledgeCardData}
            onDismiss={onDismissCard}
          />
        </div>
      )}

      {/* ── Complete Screen ── */}
      {isComplete && (
        <CompleteScreen
          phase={currentPhase}
          config={config}
          score={score}
          onPlayAgain={onContinue}
        />
      )}

      {/* ── NPC Chat ── */}
      {npcName && (
        <NPCChatOverlay
          npcName={npcName}
          isOpen={!!npcChatOpen}
          messages={npcMessages ?? []}
          isTyping={!!npcIsTyping}
          onClose={onNpcChatClose ?? (() => {})}
          onSend={onNpcSendMessage ?? (() => {})}
        />
      )}

      {/* ── Auto-Hint Bubble ── */}
      {autoHint && (
        <div style={{
          position: 'fixed',
          bottom: npcChatOpen ? '420px' : '310px',
          right: '20px',
          zIndex: 10002,
          width: '260px',
          transition: 'bottom 0.3s ease',
        }}>
          <div style={{
            borderRadius: '12px', padding: '12px 14px',
            fontSize: '12px', lineHeight: 1.5,
            backgroundColor: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.3)',
            color: '#6ee7b7',
            backdropFilter: 'blur(8px)',
            fontFamily: DM,
          }}>
            <span style={{ fontWeight: 700, color: '#34d399' }}>💡 Hint: </span>
            {autoHint}
          </div>
        </div>
      )}
    </div>
  );
}
