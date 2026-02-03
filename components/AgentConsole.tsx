// @ts-nocheck
"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, Send } from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';

// ═══════════════════════════════════════════════════════════════════════════
// MANUS-STYLE AGENT CONSOLE
// Clean white theme, sophisticated typewriter, fluid streaming
// ═══════════════════════════════════════════════════════════════════════════

interface LessonPlan {
  topic: string;
  syllabus?: string[];
  vrScript?: string;
  pedagogy?: string;
  assets?: Array<{ name: string; role: string; status?: string }>;
}

interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'chat' | 'thinking' | 'lesson_plan' | 'building';
  lessonPlan?: LessonPlan;
}

type AgentStatus = 'idle' | 'thinking' | 'executing' | 'complete';

interface AgentConsoleProps {
  messages: AgentMessage[];
  isAiLoading: boolean;
  agentStatus: AgentStatus;
  agentLogs: string[];
  isExecuting: boolean;
  onSendMessage: (input: string) => void;
  onClearScene: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPEWRITER HOOK - Smooth character-by-character reveal
// ═══════════════════════════════════════════════════════════════════════════

function useTypewriter(
  text: string,
  isActive: boolean,
  onProgress?: () => void
): { displayText: string; isTyping: boolean; isComplete: boolean } {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textRef = useRef(text);

  useEffect(() => {
    if (text !== textRef.current) {
      textRef.current = text;
      indexRef.current = 0;
      setDisplayText('');
      setIsComplete(false);
    }
  }, [text]);

  useEffect(() => {
    if (!isActive || !text) {
      if (!isActive && text) {
        setDisplayText(text);
        setIsComplete(true);
      }
      return;
    }

    const typeNextChar = () => {
      if (indexRef.current >= text.length) {
        setIsComplete(true);
        return;
      }

      const char = text[indexRef.current];
      indexRef.current++;
      setDisplayText(text.slice(0, indexRef.current));
      onProgress?.();

      // Natural timing
      let delay = 12 + Math.random() * 8;
      if ('.!?'.includes(char)) delay += 60;
      else if (',;:'.includes(char)) delay += 30;
      else if (char === ' ') delay += 15;

      timeoutRef.current = setTimeout(typeNextChar, delay);
    };

    if (indexRef.current < text.length) {
      timeoutRef.current = setTimeout(typeNextChar, 10);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [text, isActive, onProgress]);

  return {
    displayText,
    isTyping: isActive && !isComplete && displayText.length < text.length,
    isComplete
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPEWRITER TEXT - Single text block with cursor
// ═══════════════════════════════════════════════════════════════════════════

function TypewriterText({ text, isActive, onProgress, className = '' }: {
  text: string;
  isActive: boolean;
  onProgress?: () => void;
  className?: string;
}) {
  const { displayText, isTyping } = useTypewriter(text, isActive, onProgress);

  return (
    <span className={className}>
      {displayText}
      {isTyping && <span className="typewriter-cursor" />}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STREAMING LESSON PLAN - Section by section reveal
// ═══════════════════════════════════════════════════════════════════════════

function StreamingLessonPlan({ plan, isNew, onScroll }: {
  plan: LessonPlan;
  isNew: boolean;
  onScroll: () => void;
}) {
  const [phase, setPhase] = useState(0);
  const [phaseComplete, setPhaseComplete] = useState<boolean[]>([]);

  const phases = useMemo(() => {
    const p: string[] = ['topic'];
    if (plan.syllabus?.length) p.push('syllabus');
    if (plan.pedagogy) p.push('pedagogy');
    if (plan.vrScript) p.push('vrScript');
    if (plan.assets?.length) p.push('assets');
    return p;
  }, [plan]);

  useEffect(() => {
    if (isNew) {
      setPhaseComplete(new Array(phases.length).fill(false));
      setPhase(0);
    } else {
      setPhaseComplete(new Array(phases.length).fill(true));
      setPhase(phases.length);
    }
  }, [isNew, phases.length]);

  const completePhase = useCallback((idx: number) => {
    setPhaseComplete(prev => {
      const next = [...prev];
      next[idx] = true;
      return next;
    });
    setTimeout(() => setPhase(p => Math.min(p + 1, phases.length)), 100);
  }, [phases.length]);

  const isPhaseActive = (idx: number) => isNew && phase === idx && !phaseComplete[idx];
  const isPhaseVisible = (idx: number) => !isNew || phase >= idx;

  return (
    <div className="space-y-4">
      {/* Topic */}
      {isPhaseVisible(0) && (
        <motion.div
          initial={isNew ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide mb-1">Topic</div>
          <div className="text-[14px] font-semibold text-neutral-900">
            <TypewriterText
              text={plan.topic}
              isActive={isPhaseActive(0)}
              onProgress={onScroll}
            />
            {isPhaseActive(0) && (
              <CompletionDetector
                text={plan.topic}
                isActive={isPhaseActive(0)}
                onComplete={() => completePhase(0)}
              />
            )}
          </div>
        </motion.div>
      )}

      {/* Learning Objectives */}
      {plan.syllabus?.length > 0 && isPhaseVisible(phases.indexOf('syllabus')) && (
        <motion.div
          initial={isNew ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide mb-2">Learning Objectives</div>
          <div className="space-y-1.5">
            {plan.syllabus.map((item, i) => (
              <SyllabusItem
                key={i}
                index={i}
                text={item}
                isActive={isPhaseActive(phases.indexOf('syllabus'))}
                total={plan.syllabus!.length}
                onProgress={onScroll}
                onAllComplete={() => completePhase(phases.indexOf('syllabus'))}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Pedagogy */}
      {plan.pedagogy && isPhaseVisible(phases.indexOf('pedagogy')) && (
        <motion.div
          initial={isNew ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide mb-1">Approach</div>
          <p className="text-[13px] text-neutral-600 leading-relaxed">
            <TypewriterText
              text={plan.pedagogy}
              isActive={isPhaseActive(phases.indexOf('pedagogy'))}
              onProgress={onScroll}
            />
            {isPhaseActive(phases.indexOf('pedagogy')) && (
              <CompletionDetector
                text={plan.pedagogy}
                isActive={isPhaseActive(phases.indexOf('pedagogy'))}
                onComplete={() => completePhase(phases.indexOf('pedagogy'))}
              />
            )}
          </p>
        </motion.div>
      )}

      {/* VR Storyboard */}
      {plan.vrScript && isPhaseVisible(phases.indexOf('vrScript')) && (
        <motion.div
          initial={isNew ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide mb-1">VR Experience</div>
          <p className="text-[13px] text-neutral-600 leading-relaxed whitespace-pre-wrap">
            <TypewriterText
              text={plan.vrScript}
              isActive={isPhaseActive(phases.indexOf('vrScript'))}
              onProgress={onScroll}
            />
            {isPhaseActive(phases.indexOf('vrScript')) && (
              <CompletionDetector
                text={plan.vrScript}
                isActive={isPhaseActive(phases.indexOf('vrScript'))}
                onComplete={() => completePhase(phases.indexOf('vrScript'))}
              />
            )}
          </p>
        </motion.div>
      )}

      {/* Assets */}
      {plan.assets?.length > 0 && isPhaseVisible(phases.indexOf('assets')) && (
        <motion.div
          initial={isNew ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide mb-2">Assets</div>
          <div className="flex flex-wrap gap-1.5">
            {plan.assets.map((asset, i) => (
              <motion.span
                key={i}
                initial={isNew ? { opacity: 0, scale: 0.9 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: isNew ? i * 0.05 : 0 }}
                className="inline-flex items-center px-2.5 py-1 bg-neutral-100 text-neutral-700 text-[11px] rounded-full"
              >
                {asset.name}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Hidden component to detect typewriter completion
function CompletionDetector({ text, isActive, onComplete }: {
  text: string;
  isActive: boolean;
  onComplete: () => void;
}) {
  const { isComplete } = useTypewriter(text, isActive);
  useEffect(() => {
    if (isComplete && isActive) onComplete();
  }, [isComplete, isActive, onComplete]);
  return null;
}

// Staggered syllabus item
function SyllabusItem({ index, text, isActive, total, onProgress, onAllComplete }: {
  index: number;
  text: string;
  isActive: boolean;
  total: number;
  onProgress: () => void;
  onAllComplete: () => void;
}) {
  const [itemActive, setItemActive] = useState(false);
  const [done, setDone] = useState(!isActive);
  const { displayText, isTyping, isComplete } = useTypewriter(text, itemActive, onProgress);

  useEffect(() => {
    if (!isActive) {
      setDone(true);
      return;
    }
    const timer = setTimeout(() => setItemActive(true), index * 600);
    return () => clearTimeout(timer);
  }, [isActive, index]);

  useEffect(() => {
    if (isComplete && itemActive && !done) {
      setDone(true);
      if (index === total - 1) setTimeout(onAllComplete, 80);
    }
  }, [isComplete, itemActive, done, index, total, onAllComplete]);

  return (
    <div className="flex gap-2 text-[13px] text-neutral-700">
      <span className="text-neutral-300 select-none">{index + 1}.</span>
      <span>
        {isActive ? displayText : text}
        {isTyping && <span className="typewriter-cursor" />}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function AgentConsole({
  messages,
  isAiLoading,
  agentStatus,
  agentLogs,
  isExecuting,
  onSendMessage,
  onClearScene,
}: AgentConsoleProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMsgCount = useRef(messages.length);
  const newMsgIdx = useRef<number | null>(null);

  // Voice input hook
  const { isListening, toggleVoiceInput } = useVoiceInput((transcript) => {
    setInput(transcript);
  });

  // Track new messages
  useEffect(() => {
    if (messages.length > lastMsgCount.current) {
      newMsgIdx.current = messages.length - 1;
    }
    lastMsgCount.current = messages.length;
  }, [messages.length]);

  // Smooth auto-scroll
  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const target = el.scrollHeight - el.clientHeight;
    const start = el.scrollTop;
    const distance = target - start;
    if (Math.abs(distance) < 5) {
      el.scrollTop = target;
      return;
    }
    let startTime: number | null = null;
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / 120, 1);
      el.scrollTop = start + distance * (1 - Math.pow(1 - progress, 3));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = () => {
    if (!input.trim() || isAiLoading) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const statusText = {
    idle: 'Ready',
    thinking: 'Thinking',
    executing: 'Building',
    complete: 'Done'
  }[agentStatus];

  return (
    <div className="agent-console">
      {/* Header */}
      <header className="console-header">
        <h1 className="text-[15px] font-semibold text-neutral-900">BioQuest</h1>
        <div className="flex items-center gap-2">
          {(agentStatus === 'thinking' || agentStatus === 'executing') && (
            <span className="status-dot" />
          )}
          <span className="text-[11px] text-neutral-400">{statusText}</span>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="console-messages">
        {messages.map((msg, i) => {
          const isNew = newMsgIdx.current === i;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="message-block"
            >
              <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5">
                {msg.role === 'user' ? 'You' : 'Assistant'}
              </div>

              {msg.lessonPlan ? (
                <StreamingLessonPlan
                  plan={msg.lessonPlan}
                  isNew={isNew}
                  onScroll={scrollToBottom}
                />
              ) : (
                <p className="text-[13px] text-neutral-700 leading-relaxed whitespace-pre-wrap">
                  {isNew && msg.role === 'assistant' ? (
                    <TypewriterText
                      text={msg.content}
                      isActive={isNew}
                      onProgress={scrollToBottom}
                    />
                  ) : (
                    msg.content
                  )}
                </p>
              )}
            </motion.div>
          );
        })}

        {/* Thinking indicator */}
        {agentStatus === 'thinking' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="message-block"
          >
            <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5">
              Assistant
            </div>
            <div className="flex items-center gap-2 text-[13px] text-neutral-400">
              <span className="thinking-dots">
                <span /><span /><span />
              </span>
              Analyzing...
            </div>
          </motion.div>
        )}

        {/* Loading */}
        {isAiLoading && agentStatus !== 'thinking' && (
          <div className="flex gap-1 py-3">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-neutral-300"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="console-input">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your lesson..."
          disabled={isAiLoading || isExecuting || isListening}
          className="input-field"
        />
        <button
          onClick={toggleVoiceInput}
          disabled={isAiLoading || isExecuting}
          className={`icon-btn ${
            isListening
              ? 'text-red-500 animate-pulse hover:bg-red-50'
              : 'text-neutral-400 hover:text-purple-500 hover:bg-purple-50'
          }`}
          title={isListening ? 'Stop listening' : 'Voice input'}
        >
          <Mic className="w-4 h-4" />
        </button>
        <button
          onClick={handleSend}
          disabled={isAiLoading || isExecuting || !input.trim() || isListening}
          className="icon-btn text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

        .agent-console {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: white;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          overflow: hidden;
        }

        .console-header {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #f5f5f5;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        .console-messages {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 20px 24px;
        }

        .console-messages::-webkit-scrollbar {
          width: 4px;
        }
        .console-messages::-webkit-scrollbar-thumb {
          background: #e5e5e5;
          border-radius: 4px;
        }

        .message-block {
          margin-bottom: 20px;
        }

        .console-input {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          height: 44px;
          padding: 8px 12px;
          border-top: 1px solid #f5f5f5;
          background: #fafafa;
          border-radius: 12px;
          margin: 12px 16px 16px;
        }

        .input-field {
          flex: 1;
          padding: 0;
          font-size: 13px;
          color: #171717;
          background: transparent;
          border: none;
          outline: none;
          line-height: 1.4;
        }
        .input-field::placeholder {
          color: #a3a3a3;
        }
        .input-field:disabled {
          opacity: 0.5;
        }

        .icon-btn {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          padding: 0;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .typewriter-cursor {
          display: inline-block;
          width: 1.5px;
          height: 1em;
          background: #171717;
          margin-left: 1px;
          vertical-align: text-bottom;
          animation: blink 0.7s ease-in-out infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .thinking-dots {
          display: inline-flex;
          gap: 3px;
        }
        .thinking-dots span {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #a3a3a3;
          animation: bounce 1.2s ease-in-out infinite;
        }
        .thinking-dots span:nth-child(1) { animation-delay: 0ms; }
        .thinking-dots span:nth-child(2) { animation-delay: 150ms; }
        .thinking-dots span:nth-child(3) { animation-delay: 300ms; }

        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
