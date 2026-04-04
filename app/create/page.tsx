'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ─── Category quick-fill prompts ─────────────────────────────────────────────

const CATEGORIES = [
  {
    label: 'Cell Biology',
    icon: '🔬',
    prompt:
      'Build an interactive VR experience where high school students explore a living cell, identify organelles like the mitochondria and endoplasmic reticulum, and trace the secretory pathway from ribosome to cell membrane.',
  },
  {
    label: 'Genetics',
    icon: '🧬',
    prompt:
      'Create a VR genetics lab where students visualize DNA replication, identify complementary base pairs, and simulate Mendelian inheritance patterns with Punnett squares.',
  },
  {
    label: 'Ecology',
    icon: '🌿',
    prompt:
      'Design a field biology VR experience where students explore a coral reef ecosystem, identify producers and consumers, and trace energy flow through a food web.',
  },
  {
    label: 'Human Body',
    icon: '❤️',
    prompt:
      'Build a voyage through the human cardiovascular system where students identify heart chambers, trace blood circulation pathways, and understand how oxygen reaches cells.',
  },
  {
    label: 'Photosynthesis',
    icon: '☀️',
    prompt:
      'Create a chloroplast adventure where students identify thylakoids and stroma, then drag molecules through the light-dependent and Calvin cycle reactions to produce glucose.',
  },
];

// ─── Generation step labels ───────────────────────────────────────────────────

const STEPS = [
  'Analyzing learning objectives...',
  'Selecting NGSS standards...',
  'Choosing environment...',
  'Placing biology assets...',
  'Designing quest chain...',
  'Writing knowledge cards...',
  'Experience ready!',
];

// ─── Page ─────────────────────────────────────────────────────────────────────

type Status = 'idle' | 'generating' | 'error';

export default function CreatePage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [stepIndex, setStepIndex] = useState(-1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const stepRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectCategory = (i: number) => {
    setActiveCategory(i);
    setPrompt(CATEGORIES[i].prompt);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || status === 'generating') return;

    setStatus('generating');
    setStepIndex(0);
    setErrorMsg(null);
    stepRef.current = 0;

    // Advance through steps 0–5 while API call runs
    intervalRef.current = setInterval(() => {
      stepRef.current += 1;
      if (stepRef.current < STEPS.length - 1) {
        setStepIndex(stepRef.current);
      } else {
        clearInterval(intervalRef.current!);
      }
    }, 1800);

    try {
      const res = await fetch('/api/assemble-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      clearInterval(intervalRef.current!);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Generation failed (${res.status})`);
      }

      const data = await res.json();
      const config = data.config;

      // Ensure we've shown at least step 5 before showing "Experience ready!"
      if (stepRef.current < 5) {
        setStepIndex(5);
        await new Promise((r) => setTimeout(r, 500));
      }

      // Show final step
      setStepIndex(STEPS.length - 1);
      await new Promise((r) => setTimeout(r, 900));

      // Save to Supabase game_configs table
      const dbId = crypto.randomUUID();
      const supabase = createClient();
      const { error: dbErr } = await supabase.from('game_configs').insert({
        id: dbId,
        config,
        title: config.meta?.title ?? 'Untitled Experience',
        subject: config.meta?.subject ?? 'Biology',
        prompt: prompt.trim(),
      });

      if (dbErr) throw new Error(`Could not save experience: ${dbErr.message}`);

      router.push(`/play/${dbId}`);
    } catch (err: any) {
      clearInterval(intervalRef.current!);
      setStatus('error');
      setStepIndex(-1);
      setErrorMsg(err.message ?? 'Something went wrong. Please try again.');
    }
  };

  const isGenerating = status === 'generating';

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#050e1a', fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* ── Background grid texture ── */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* ── Radial glow ── */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,185,129,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-6 pt-28 pb-24">
        {/* ── Badge ── */}
        <div
          className="mb-6 flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium tracking-wide"
          style={{ borderColor: 'rgba(16,185,129,0.3)', color: '#6ee7b7' }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: '#10b981' }}
          />
          AI-Powered · NGSS-Aligned · Web &amp; VR Ready
        </div>

        {/* ── Heading ── */}
        <h1
          className="mb-4 text-center text-4xl font-bold leading-tight md:text-5xl lg:text-6xl"
          style={{ fontFamily: "'Syne', sans-serif", color: '#ffffff' }}
        >
          What should{' '}
          <span
            style={{
              background: 'linear-gradient(90deg, #34d399, #22d3ee)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            students learn?
          </span>
        </h1>

        <p className="mb-10 max-w-lg text-center text-base md:text-lg" style={{ color: '#94a3b8' }}>
          Describe a biology concept. We&apos;ll generate a fully interactive,
          standards-aligned VR experience in seconds.
        </p>

        {/* ── Main card ── */}
        <div
          className="w-full max-w-2xl rounded-2xl p-6 md:p-8"
          style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {isGenerating ? (
            /* ── Generation progress ── */
            <GenerationProgress stepIndex={stepIndex} />
          ) : (
            /* ── Input form ── */
            <>
              {/* Category tabs */}
              <div className="mb-5 flex flex-wrap gap-2">
                {CATEGORIES.map((cat, i) => {
                  const active = activeCategory === i;
                  return (
                    <button
                      key={cat.label}
                      onClick={() => selectCategory(i)}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all"
                      style={{
                        backgroundColor: active
                          ? 'rgba(16,185,129,0.15)'
                          : 'rgba(255,255,255,0.05)',
                        border: active
                          ? '1px solid rgba(16,185,129,0.5)'
                          : '1px solid rgba(255,255,255,0.08)',
                        color: active ? '#34d399' : '#94a3b8',
                      }}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Prompt textarea */}
              <textarea
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setActiveCategory(null);
                }}
                placeholder="e.g. Build a VR experience where students identify cell organelles and trace the protein secretory pathway..."
                rows={5}
                className="w-full resize-none rounded-xl p-4 text-sm leading-relaxed outline-none transition-all"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e2e8f0',
                  caretColor: '#10b981',
                }}
                onFocus={(e) => {
                  e.target.style.border = '1px solid rgba(16,185,129,0.4)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.08)';
                }}
                onBlur={(e) => {
                  e.target.style.border = '1px solid rgba(255,255,255,0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              />

              {/* Error message */}
              {status === 'error' && errorMsg && (
                <div
                  className="mt-3 rounded-lg px-4 py-3 text-sm"
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#fca5a5',
                  }}
                >
                  {errorMsg}
                </div>
              )}

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all"
                style={{
                  background: prompt.trim()
                    ? 'linear-gradient(135deg, #059669, #0d9488)'
                    : 'rgba(255,255,255,0.06)',
                  color: prompt.trim() ? '#ffffff' : '#64748b',
                  cursor: prompt.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: prompt.trim()
                    ? '0 4px 24px rgba(16,185,129,0.25)'
                    : 'none',
                }}
                onMouseEnter={(e) => {
                  if (prompt.trim()) {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      '0 6px 32px rgba(16,185,129,0.35)';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = '';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = prompt.trim()
                    ? '0 4px 24px rgba(16,185,129,0.25)'
                    : 'none';
                }}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Generate Experience
              </button>
            </>
          )}
        </div>

        {/* ── Stats footer ── */}
        {!isGenerating && (
          <div
            className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs"
            style={{ color: '#475569' }}
          >
            {['7 biology topics', 'NGSS + AP Bio + IB aligned', 'Web & VR ready', 'No code required'].map(
              (stat) => (
                <span key={stat} className="flex items-center gap-1.5">
                  <span style={{ color: '#10b981' }}>✓</span>
                  {stat}
                </span>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Generation Progress Panel ────────────────────────────────────────────────

function GenerationProgress({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="flex flex-col items-center py-4">
      {/* Spinner */}
      <div className="mb-8 relative">
        <div
          className="h-16 w-16 rounded-full animate-spin"
          style={{
            border: '3px solid rgba(16,185,129,0.15)',
            borderTopColor: '#10b981',
          }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center text-2xl"
        >
          🔬
        </div>
      </div>

      {/* Steps */}
      <div className="w-full space-y-3">
        {STEPS.map((label, i) => {
          const isDone = i < stepIndex;
          const isCurrent = i === stepIndex;
          const isPending = i > stepIndex;

          return (
            <div
              key={label}
              className="flex items-center gap-3 transition-all"
              style={{ opacity: isPending ? 0.3 : 1 }}
            >
              {/* Icon */}
              <div
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all"
                style={{
                  backgroundColor: isDone
                    ? '#10b981'
                    : isCurrent
                    ? 'rgba(16,185,129,0.2)'
                    : 'rgba(255,255,255,0.06)',
                  border: isCurrent ? '1px solid rgba(16,185,129,0.5)' : 'none',
                  color: isDone ? '#fff' : isCurrent ? '#34d399' : '#64748b',
                }}
              >
                {isDone ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isCurrent ? (
                  <div
                    className="h-2 w-2 rounded-full animate-pulse"
                    style={{ backgroundColor: '#34d399' }}
                  />
                ) : (
                  <span style={{ color: '#334155' }}>{i + 1}</span>
                )}
              </div>

              {/* Label */}
              <span
                className="text-sm font-medium"
                style={{
                  color: isDone ? '#6ee7b7' : isCurrent ? '#e2e8f0' : '#475569',
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs" style={{ color: '#475569' }}>
        Powered by GPT-4o · usually takes 15–30 seconds
      </p>
    </div>
  );
}
