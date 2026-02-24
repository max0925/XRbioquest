// @ts-nocheck
"use client";

import { PHASES, KNOWLEDGE_CARDS } from '../config';
import type { Phase, KnowledgeCard } from '../config';

// ═══════════════════════════════════════════════════════════════════════════
// Phase progress for multi-step phases
// ═══════════════════════════════════════════════════════════════════════════

export interface PhaseProgress {
    count: number;
    total: number;
    step?: number;
    steps?: string[];
}

interface OverlayUIProps {
    currentPhase: number;
    score: number;
    prevScore: number;
    phaseProgress: PhaseProgress | null;
    showKnowledgeCard: boolean;
    knowledgeCardData: KnowledgeCard | null;
    showContinue: boolean;
    onDismissCard: () => void;
    onContinue: () => void;
}

export function OverlayUI({
    currentPhase,
    score,
    prevScore,
    phaseProgress,
    showKnowledgeCard,
    knowledgeCardData,
    showContinue,
    onDismissCard,
    onContinue,
}: OverlayUIProps) {
    const phase = PHASES[currentPhase] || PHASES[0];

    // Build dynamic instruction text for multi-step phases
    let instruction = phase.instruction;
    if (phase.type === 'drag-multi' && phaseProgress) {
        instruction = instruction.replace(/\(\d+\/\d+\)/, `(${phaseProgress.count}/${phaseProgress.total})`);
    }
    if (phase.type === 'drag-chain' && phaseProgress && phaseProgress.step !== undefined && phaseProgress.steps) {
        const stepIdx = phaseProgress.step;
        if (stepIdx < phaseProgress.steps.length) {
            instruction = `Step ${stepIdx + 1}: Drag the polypeptide into the ${phaseProgress.steps[stepIdx]}.`;
        } else {
            instruction = 'Protein pathway complete!';
        }
    }

    return (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999, fontFamily: 'system-ui' }}>

            {/* ─── TOP BAR ─── */}
            <div className="absolute top-0 left-0 right-0 p-5">
                <div className="max-w-5xl mx-auto">
                    <div className="rounded-2xl px-6 py-4 flex items-center justify-between" style={{ backgroundColor: 'rgba(15, 23, 42, 0.88)', border: '1px solid rgba(0, 229, 255, 0.15)', backdropFilter: 'blur(12px)' }}>

                        {/* Title */}
                        <div className="flex items-center gap-3">
                            <span className="text-xl">🔬</span>
                            <span className="text-white font-extrabold text-base tracking-tight">
                                Voyage Inside the Cell
                            </span>
                        </div>

                        {/* Phase Dots */}
                        <div className="flex items-center gap-2.5">
                            {PHASES.slice(1, 6).map((p, i) => {
                                const dotPhase = i + 1;
                                const isCurrent = dotPhase === currentPhase;
                                const isDone = dotPhase < currentPhase;
                                return (
                                    <div key={dotPhase} className="flex flex-col items-center gap-1">
                                        <div
                                            className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${isCurrent ? 'scale-150' : ''}`}
                                            style={{
                                                backgroundColor: isDone ? '#22c55e' : isCurrent ? '#22c55e' : 'rgba(255, 255, 255, 0.2)',
                                                boxShadow: isCurrent ? '0 0 12px #22c55e, 0 0 24px rgba(34, 197, 94, 0.4)' : isDone ? '0 0 6px rgba(34, 197, 94, 0.3)' : 'none',
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Score */}
                        <div className="flex items-center gap-3">
                            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                Score
                            </div>
                            <div
                                className="text-white text-xl font-black tabular-nums transition-all duration-500"
                                style={{ color: score > prevScore ? '#22c55e' : '#ffffff' }}
                            >
                                {score}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── BOTTOM INSTRUCTION PANEL ─── */}
            <div className="absolute bottom-0 left-0 right-0 p-5 pointer-events-auto">
                <div className="max-w-2xl mx-auto">
                    <div className="rounded-2xl px-7 py-5" style={{ backgroundColor: 'rgba(15, 23, 42, 0.88)', border: '1px solid rgba(0, 229, 255, 0.15)', backdropFilter: 'blur(12px)' }}>

                        {/* Phase title */}
                        <div className="text-lg font-extrabold mb-1.5" style={{ color: '#00e5ff' }}>
                            {phase.title}
                        </div>

                        {/* Instruction */}
                        <div className="text-white text-sm mb-4 leading-relaxed" style={{ opacity: 0.85 }}>
                            {instruction}
                        </div>

                        {/* Continue Button — only when showContinue is true */}
                        {showContinue && (
                            <button
                                onClick={onContinue}
                                className="w-full text-black font-bold text-sm uppercase tracking-widest py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                                style={{ backgroundColor: '#22c55e', boxShadow: '0 0 16px rgba(34, 197, 94, 0.4)' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4ade80'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#22c55e'}
                            >
                                {currentPhase === 5 ? '🔄 Play Again' : currentPhase === 0 ? 'Begin Voyage →' : 'Continue →'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── KNOWLEDGE CARD — slide in from bottom-right ─── */}
            {showKnowledgeCard && knowledgeCardData && (
                <div
                    className="absolute bottom-28 right-6 pointer-events-auto animate-[slideUp_0.35s_ease-out]"
                    style={{ width: '400px', maxWidth: 'calc(100vw - 3rem)' }}
                >
                    <div className="rounded-2xl px-6 py-5" style={{ backgroundColor: '#1E293B', border: '1px solid rgba(0, 229, 255, 0.2)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)' }}>

                        {/* Card title */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">💡</span>
                            <span className="text-white font-bold text-base">
                                {knowledgeCardData.title}
                            </span>
                        </div>

                        {/* Body */}
                        <div className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(226, 232, 240, 0.85)' }}>
                            {knowledgeCardData.body}
                        </div>

                        {/* Tag */}
                        <div className="text-xs leading-relaxed mb-4 italic" style={{ color: '#fbbf24' }}>
                            {knowledgeCardData.tag}
                        </div>

                        {/* Dismiss */}
                        <button
                            onClick={onDismissCard}
                            className="w-full text-black font-bold text-xs uppercase tracking-widest py-2.5 rounded-lg transition-all duration-200"
                            style={{ backgroundColor: '#22c55e' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4ade80'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#22c55e'}
                        >
                            Got it →
                        </button>
                    </div>
                </div>
            )}

            {/* ─── PHASE 5 CELEBRATION ─── */}
            {currentPhase === 5 && (
                <div className="absolute inset-0 pointer-events-none">
                    {/* Confetti */}
                    {Array.from({ length: 50 }).map((_, i) => (
                        <div
                            key={i}
                            className="confetti"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`,
                                animationDuration: `${3 + Math.random() * 2}s`,
                                backgroundColor: ['#22c55e', '#4ade80', '#86efac', '#00e5ff', '#fbbf24'][Math.floor(Math.random() * 5)],
                                width: `${6 + Math.random() * 8}px`,
                                height: `${6 + Math.random() * 8}px`,
                                borderRadius: Math.random() > 0.5 ? '50%' : '0%',
                            }}
                        />
                    ))}

                    {/* Celebration message */}
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-auto">
                        <div className="rounded-3xl px-12 py-10 animate-[bounceIn_0.6s_ease-out]" style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)', border: '2px solid rgba(34, 197, 94, 0.5)' }}>
                            <div className="text-5xl mb-3 animate-bounce">🎉</div>
                            <div className="text-3xl font-black mb-2" style={{ color: '#22c55e' }}>
                                Mission Complete!
                            </div>
                            <div className="text-white text-lg mb-1">
                                Final Score: <span className="font-black" style={{ color: '#22c55e' }}>{score}</span>
                            </div>
                            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                You've mastered cellular respiration!
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
