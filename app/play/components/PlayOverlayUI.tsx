// @ts-nocheck
'use client';

import { useState, useEffect, useRef } from 'react';
import type {
  GameConfig,
  PhaseConfig,
  KnowledgeCardConfig,
  HUDConfig,
  QuizPhase,
  QuizOption,
} from '@/types/game-config';

// ─── Phase progress (multi-step phases) ──────────────────────────────────────

export interface PlayPhaseProgress {
  count: number;
  total: number;
  step?: number; // drag-chain current step index
}

// ─── NPC chat message ─────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface PlayOverlayUIProps {
  config: GameConfig;
  currentPhase: PhaseConfig;
  phaseIndex: number;        // 0-based index (used for phase dots)
  totalPhases: number;
  score: number;
  prevScore: number;
  phaseProgress: PlayPhaseProgress | null;
  showKnowledgeCard: boolean;
  knowledgeCardData: KnowledgeCardConfig | null;
  showContinue: boolean;
  onDismissCard: () => void;
  onContinue: () => void;
  /** Called when the player selects a quiz answer */
  onQuizAnswer?: (optionId: string, isCorrect: boolean) => void;
  /** NPC chat props */
  npcName?: string;
  npcChatOpen?: boolean;
  npcMessages?: ChatMessage[];
  npcIsTyping?: boolean;
  autoHint?: string | null;
  onNpcChatClose?: () => void;
  onNpcSendMessage?: (msg: string) => void;
}

// ─── QuizUI sub-component ────────────────────────────────────────────────────
// Stateful component that handles option selection, wrong-answer flash, and
// explanation reveal. Parent (page.tsx) receives correct answers via onAnswer
// to add score and schedule phase advance.

function QuizUI({
  phase,
  onAnswer,
}: {
  phase: QuizPhase;
  onAnswer: (optionId: string, isCorrect: boolean) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);

  const handleClick = (opt: QuizOption) => {
    // Locked while a wrong-flash is in progress, or after correct answer
    if (selectedId !== null || wrongId !== null) return;

    if (opt.is_correct) {
      setSelectedId(opt.id);
      onAnswer(opt.id, true);
    } else {
      setWrongId(opt.id);
      setTimeout(() => setWrongId(null), 700);
    }
  };

  return (
    <div className="mb-2">
      {/* Option buttons */}
      <div className="flex flex-col gap-2 mb-3">
        {phase.options.map((opt) => {
          const isCorrect = opt.id === selectedId;
          const isWrong = opt.id === wrongId;
          return (
            <button
              key={opt.id}
              onClick={() => handleClick(opt)}
              disabled={selectedId !== null}
              className="w-full text-left text-sm font-medium rounded-xl px-4 py-2.5 transition-all duration-150"
              style={{
                backgroundColor: isCorrect
                  ? 'rgba(34, 197, 94, 0.25)'
                  : isWrong
                  ? 'rgba(239, 68, 68, 0.25)'
                  : 'rgba(255, 255, 255, 0.07)',
                border: isCorrect
                  ? '1px solid rgba(34, 197, 94, 0.5)'
                  : isWrong
                  ? '1px solid rgba(239, 68, 68, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.12)',
                color: isCorrect ? '#86efac' : isWrong ? '#fca5a5' : '#e2e8f0',
                cursor: selectedId !== null ? 'default' : 'pointer',
                transform: isWrong ? 'translateX(0)' : undefined,
              }}
            >
              <span
                className="inline-block mr-2 text-xs font-bold uppercase"
                style={{ color: isCorrect ? '#86efac' : isWrong ? '#fca5a5' : 'rgba(255,255,255,0.4)' }}
              >
                {opt.id.toUpperCase()}
              </span>
              {opt.text}
            </button>
          );
        })}
      </div>

      {/* Explanation — shown after correct answer */}
      {selectedId !== null && (
        <div
          className="text-xs leading-relaxed px-3 py-2.5 rounded-lg"
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            color: '#86efac',
          }}
        >
          ✓ {phase.explanation}
        </div>
      )}
    </div>
  );
}

// ─── NPC Chat Overlay ────────────────────────────────────────────────────────

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
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
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
    <div
      className="fixed bottom-28 right-6 pointer-events-auto"
      style={{ zIndex: 10001, width: '300px' }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.96)',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55), 0 0 20px rgba(52,211,153,0.06)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgba(52, 211, 153, 0.15)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: '#34d399', boxShadow: '0 0 8px #34d399' }}
            ></div>
            <span className="text-sm font-bold" style={{ color: '#34d399' }}>
              {npcName}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ color: 'rgba(255,255,255,0.45)', fontSize: '18px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#fff')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)')}
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div
          className="px-4 py-3"
          style={{ maxHeight: '200px', overflowY: 'auto', scrollbarWidth: 'thin' }}
        >
          {messages.length === 0 && (
            <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Ask me anything about this mission!
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`mb-2 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <span
                className="inline-block text-xs px-3 py-2 rounded-xl leading-relaxed"
                style={{
                  maxWidth: '88%',
                  backgroundColor:
                    msg.role === 'user'
                      ? 'rgba(0, 229, 255, 0.1)'
                      : 'rgba(52, 211, 153, 0.1)',
                  color: msg.role === 'user' ? '#7dd3fc' : '#6ee7b7',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(0,229,255,0.2)' : 'rgba(52,211,153,0.2)'}`,
                }}
              >
                {msg.content}
              </span>
            </div>
          ))}
          {isTyping && (
            <div className="mb-2 flex justify-start">
              <span
                className="inline-block text-xs px-3 py-2 rounded-xl"
                style={{
                  backgroundColor: 'rgba(52, 211, 153, 0.1)',
                  color: '#6ee7b7',
                  border: '1px solid rgba(52,211,153,0.2)',
                }}
              >
                <span className="animate-pulse">● ● ●</span>
              </span>
            </div>
          )}
          <div ref={messagesEndRef}></div>
        </div>

        {/* Input */}
        <div className="px-3 pb-3 pt-1" style={{ borderTop: '1px solid rgba(52,211,153,0.1)' }}>
          <div className="flex gap-2 mt-2">
            <input
              className="flex-1 text-xs rounded-xl px-3 py-2 text-white outline-none"
              style={{
                backgroundColor: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
              placeholder="Ask for a hint…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Stop all keys from bubbling to A-Frame / page.tsx handlers
                e.stopPropagation();
                if (e.key === 'Enter') handleSend();
              }}
              autoFocus
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="text-xs font-bold px-3 py-2 rounded-xl transition-all"
              style={{
                backgroundColor: '#10b981',
                color: '#000',
                opacity: !input.trim() || isTyping ? 0.45 : 1,
                cursor: !input.trim() || isTyping ? 'not-allowed' : 'pointer',
              }}
            >
              Send
            </button>
          </div>
          <p className="text-center mt-2" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>
            T to toggle · Esc to close
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

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
}: PlayOverlayUIProps) {
  const hud: HUDConfig = config.hud;

  // ── Dynamic instruction text for multi-step phases ──
  let instruction = currentPhase.instruction;

  if (currentPhase.type === 'drag-multi' && phaseProgress) {
    instruction = instruction.replace(
      /\(\d+\/\d+\)/,
      `(${phaseProgress.count}/${phaseProgress.total})`
    );
  }

  if (
    currentPhase.type === 'drag-chain' &&
    phaseProgress &&
    phaseProgress.step !== undefined
  ) {
    const step = currentPhase.steps[phaseProgress.step];
    if (step) {
      // Find target asset name from config
      const targetAsset = config.assets.find((a) => a.id === step.drag_target);
      const targetName = targetAsset?.name ?? step.drag_target;
      instruction = `Step ${phaseProgress.step + 1}: Drag the ${
        config.assets.find((a) => a.id === step.drag_item)?.name ?? step.drag_item
      } into the ${targetName}.`;
    } else {
      instruction = 'Protein pathway complete!';
    }
  }

  // ── Interactive phases (show controls hint) ──
  const isInteractivePhase =
    currentPhase.type !== 'intro' && currentPhase.type !== 'complete';

  // ── Phase dot count: skip intro + complete ──
  const interactivePhases = config.phases.filter(
    (p) => p.type !== 'intro' && p.type !== 'complete'
  );

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9999, fontFamily: 'system-ui' }}
    >
      {/* ─── TOP BAR ─── */}
      <div className="absolute top-0 left-0 right-0 p-5">
        <div className="max-w-5xl mx-auto">
          <div
            className="rounded-2xl px-6 py-4 flex items-center justify-between"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.88)',
              border: '1px solid rgba(0, 229, 255, 0.15)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Title */}
            <div className="flex items-center gap-3">
              <span className="text-xl">🔬</span>
              <span className="text-white font-extrabold text-base tracking-tight">
                {config.meta.title}
              </span>
            </div>

            {/* Phase dots (interactive phases only) */}
            {hud.show_phase_counter && (
              <div className="flex items-center gap-2.5">
                {interactivePhases.map((p, i) => {
                  const interactiveIndex = config.phases.findIndex((cp) => cp.id === p.id);
                  const isCurrent = interactiveIndex === phaseIndex;
                  const isDone = interactiveIndex < phaseIndex;
                  return (
                    <div key={p.id} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                          isCurrent ? 'scale-150' : ''
                        }`}
                        style={{
                          backgroundColor:
                            isDone || isCurrent
                              ? '#22c55e'
                              : 'rgba(255, 255, 255, 0.2)',
                          boxShadow: isCurrent
                            ? '0 0 12px #22c55e, 0 0 24px rgba(34, 197, 94, 0.4)'
                            : isDone
                            ? '0 0 6px rgba(34, 197, 94, 0.3)'
                            : 'none',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Score */}
            {hud.show_score && (
              <div className="flex items-center gap-3">
                <div
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                >
                  Score
                </div>
                <div
                  className="text-white text-xl font-black tabular-nums transition-all duration-500"
                  style={{ color: score > prevScore ? '#22c55e' : '#ffffff' }}
                >
                  {score}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── BOTTOM INSTRUCTION PANEL ─── */}
      {hud.show_instruction && (
        <div className="absolute bottom-0 left-0 right-0 p-5 pointer-events-auto">
          <div className="max-w-2xl mx-auto">
            <div
              className="rounded-2xl px-7 py-5"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.88)',
                border: '1px solid rgba(0, 229, 255, 0.15)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Phase title */}
              <div
                className="text-lg font-extrabold mb-1.5"
                style={{ color: '#00e5ff' }}
              >
                {currentPhase.title}
              </div>

              {/* Instruction / Quiz */}
              {currentPhase.type === 'quiz' ? (
                <QuizUI
                  key={currentPhase.id}
                  phase={currentPhase as QuizPhase}
                  onAnswer={onQuizAnswer ?? (() => {})}
                />
              ) : (
                <div
                  className="text-white text-sm mb-4 leading-relaxed"
                  style={{ opacity: 0.85 }}
                >
                  {instruction}
                </div>
              )}

              {/* Continue button — hidden during quiz (quiz auto-advances) */}
              {showContinue && currentPhase.type !== 'quiz' && (
                <button
                  onClick={onContinue}
                  className="w-full text-black font-bold text-sm uppercase tracking-widest py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: '#22c55e',
                    boxShadow: '0 0 16px rgba(34, 197, 94, 0.4)',
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      '#4ade80')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      '#22c55e')
                  }
                >
                  {currentPhase.type === 'complete'
                    ? '🔄 Play Again'
                    : currentPhase.type === 'intro'
                    ? 'Begin Voyage →'
                    : 'Continue →'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── CONTROLS HINT — left side ─── */}
      {isInteractivePhase && (
        <div
          className="absolute left-5 pointer-events-none"
          style={{
            top: '50%',
            transform: 'translateY(-50%)',
            width: '200px',
            backgroundColor: 'rgba(15, 23, 42, 0.82)',
            border: '1px solid rgba(0, 229, 255, 0.15)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '16px',
          }}
        >
          <div
            style={{
              color: '#00e5ff',
              fontWeight: 800,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '10px',
            }}
          >
            Controls
          </div>
          {[
            { key: 'W A S D', desc: 'Move around' },
            { key: 'E', desc: 'Move up' },
            { key: 'Q', desc: 'Move down' },
            { key: 'Mouse drag', desc: 'Look around' },
            { key: 'Click + drag', desc: 'Grab objects' },
            { key: 'T', desc: 'Talk to guide' },
          ].map(({ key, desc }) => (
            <div
              key={key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '7px',
              }}
            >
              <span
                style={{
                  backgroundColor: 'rgba(0,229,255,0.1)',
                  color: '#00e5ff',
                  borderRadius: '6px',
                  padding: '2px 7px',
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  border: '1px solid rgba(0,229,255,0.2)',
                }}
              >
                {key}
              </span>
              <span
                style={{
                  color: 'rgba(255,255,255,0.65)',
                  fontSize: '10px',
                  marginLeft: '8px',
                  textAlign: 'right',
                  flex: 1,
                }}
              >
                {desc}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ─── KNOWLEDGE CARD ─── */}
      {hud.show_knowledge_cards && showKnowledgeCard && knowledgeCardData && (
        <div
          className="absolute bottom-28 right-6 pointer-events-auto animate-[slideUp_0.35s_ease-out]"
          style={{ width: '420px', maxWidth: 'calc(100vw - 3rem)' }}
        >
          <div
            className="rounded-2xl px-6 py-5"
            style={{
              backgroundColor: '#1E293B',
              border: '1px solid rgba(0, 229, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Title */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💡</span>
              <span className="text-white font-bold text-base">
                {knowledgeCardData.title}
              </span>
            </div>

            {/* Body */}
            <div
              className="text-sm leading-relaxed mb-3"
              style={{ color: 'rgba(226, 232, 240, 0.85)' }}
            >
              {knowledgeCardData.body}
            </div>

            {/* Misconception (if present) */}
            {knowledgeCardData.misconception && (
              <div
                className="text-xs leading-relaxed mb-3 p-3 rounded-lg"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#fca5a5',
                }}
              >
                ⚠️ {knowledgeCardData.misconception}
              </div>
            )}

            {/* Tag */}
            <div
              className="text-xs leading-relaxed mb-4 italic"
              style={{ color: '#fbbf24' }}
            >
              {knowledgeCardData.tag}
            </div>

            {/* Dismiss */}
            <button
              onClick={onDismissCard}
              className="w-full text-black font-bold text-xs uppercase tracking-widest py-2.5 rounded-lg transition-all duration-200"
              style={{ backgroundColor: '#22c55e' }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  '#4ade80')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  '#22c55e')
              }
            >
              Got it →
            </button>
          </div>
        </div>
      )}

      {/* ─── NPC CHAT OVERLAY ─── */}
      {npcName && npcChatOpen && (
        <NPCChatOverlay
          npcName={npcName}
          isOpen={!!npcChatOpen}
          messages={npcMessages ?? []}
          isTyping={!!npcIsTyping}
          onClose={onNpcChatClose ?? (() => {})}
          onSend={onNpcSendMessage ?? (() => {})}
        />
      )}

      {/* ─── AUTO-HINT BUBBLE ─── */}
      {autoHint && (
        <div
          className="fixed pointer-events-none"
          style={{
            bottom: npcChatOpen ? '420px' : '310px',
            right: '24px',
            zIndex: 10002,
            width: '260px',
            transition: 'bottom 0.3s ease',
          }}
        >
          <div
            className="rounded-xl px-4 py-3 text-xs leading-relaxed"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#6ee7b7',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span className="font-bold" style={{ color: '#34d399' }}>
              💡 Hint:{' '}
            </span>
            {autoHint}
          </div>
        </div>
      )}

      {/* ─── COMPLETE SCREEN ─── */}
      {currentPhase.type === 'complete' && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 99999 }}
        >
          {/* Confetti */}
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
                backgroundColor: ['#22c55e', '#4ade80', '#86efac', '#00e5ff', '#fbbf24'][
                  Math.floor(Math.random() * 5)
                ],
                width: `${6 + Math.random() * 8}px`,
                height: `${6 + Math.random() * 8}px`,
                borderRadius: Math.random() > 0.5 ? '50%' : '0%',
              }}
            />
          ))}

          {/* Celebration message */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-auto">
            <div
              className="rounded-3xl px-12 py-10 animate-[bounceIn_0.6s_ease-out]"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.96)',
                border: '2px solid rgba(34, 197, 94, 0.5)',
                boxShadow: '0 0 60px rgba(34,197,94,0.15)',
                minWidth: '320px',
              }}
            >
              <div className="text-5xl mb-3 animate-bounce">🎉</div>
              <div
                className="text-3xl font-black mb-2"
                style={{ color: '#22c55e' }}
              >
                {currentPhase.title}
              </div>

              {/* Score */}
              <div className="text-white text-lg mb-1">
                Final Score:{' '}
                <span className="font-black" style={{ color: '#22c55e' }}>
                  {score}
                </span>{' '}
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  / {config.scoring.max_possible}
                </span>
              </div>

              {/* Passed / Failed badge */}
              {score >= config.scoring.passing_threshold ? (
                <div
                  className="inline-block mt-2 mb-3 px-4 py-1 rounded-full text-sm font-bold"
                  style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.4)' }}
                >
                  ✓ Passed
                </div>
              ) : (
                <div
                  className="inline-block mt-2 mb-3 px-4 py-1 rounded-full text-sm font-bold"
                  style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  Keep practicing
                </div>
              )}

              <div className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {currentPhase.instruction}
              </div>

              {/* Play Again button — primary CTA directly in celebration card */}
              <button
                onClick={onContinue}
                className="w-full font-bold text-sm uppercase tracking-widest py-3.5 rounded-xl transition-all duration-200"
                style={{ backgroundColor: '#22c55e', color: '#000', boxShadow: '0 0 20px rgba(34,197,94,0.3)' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#4ade80')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#22c55e')}
              >
                🔄 Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
