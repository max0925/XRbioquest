'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ─── Time-based greeting (client-only to avoid hydration mismatch) ───────────

// ─── Glass card style ────────────────────────────────────────────────────────

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.8)',
  borderRadius: 16,
  boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
};

// ─── Topic card data ─────────────────────────────────────────────────────────

const TOPICS = [
  {
    id: 'cell-biology',
    label: 'Cell Biology',
    desc: 'Explore organelles, membranes, and the secretory pathway inside a living cell.',
    tags: ['AP Bio', 'NGSS', 'VR Ready'],
    prompt:
      'Build an interactive VR experience where high school students explore a living cell, identify organelles like the mitochondria and endoplasmic reticulum, and trace the secretory pathway from ribosome to cell membrane.',
    gradient: 'linear-gradient(135deg, #d1fae5, #6ee7b7)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="#059669" strokeWidth="2" />
        <circle cx="10" cy="10" r="3" stroke="#059669" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'genetics',
    label: 'Genetics',
    desc: 'Visualize DNA replication, base pairing, and Mendelian inheritance patterns.',
    tags: ['AP Bio', 'NGSS'],
    prompt:
      'Create a VR genetics lab where students visualize DNA replication, identify complementary base pairs, and simulate Mendelian inheritance patterns with Punnett squares.',
    gradient: 'linear-gradient(135deg, #ddd6fe, #a78bfa)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round">
        <path d="M10 2v16" />
        <path d="M6 4c4 2 4 6 0 8" />
        <path d="M14 4c-4 2-4 6 0 8" />
      </svg>
    ),
  },
  {
    id: 'ecology',
    label: 'Ecology',
    desc: 'Trace energy flow through food webs in a coral reef or forest ecosystem.',
    tags: ['NGSS', 'VR Ready'],
    prompt:
      'Design a field biology VR experience where students explore a coral reef ecosystem, identify producers and consumers, and trace energy flow through a food web.',
    gradient: 'linear-gradient(135deg, #d1fae5, #99f6e4)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round">
        <path d="M12 22V12" />
        <path d="M17 7c0 5-5 5-5 10" />
        <path d="M7 7c0 5 5 5 5 10" />
      </svg>
    ),
  },
  {
    id: 'human-body',
    label: 'Human Body',
    desc: 'Voyage through the cardiovascular system and trace how oxygen reaches cells.',
    tags: ['AP Bio', 'NGSS'],
    prompt:
      'Build a voyage through the human cardiovascular system where students identify heart chambers, trace blood circulation pathways, and understand how oxygen reaches cells.',
    gradient: 'linear-gradient(135deg, #fce7f3, #f9a8d4)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
  },
  {
    id: 'photosynthesis',
    label: 'Photosynthesis',
    desc: 'Enter the chloroplast and drive molecules through light reactions and the Calvin cycle.',
    tags: ['AP Bio', 'VR Ready'],
    prompt:
      'Create a chloroplast adventure where students identify thylakoids and stroma, then drag molecules through the light-dependent and Calvin cycle reactions to produce glucose.',
    gradient: 'linear-gradient(135deg, #fef9c3, #fde68a)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round">
        <circle cx="10" cy="10" r="4" />
        <path d="M10 2v3M10 15v3M2 10h3M15 10h3M4.93 4.93l2.12 2.12M12.95 12.95l2.12 2.12M4.93 15.07l2.12-2.12M12.95 7.05l2.12-2.12" />
      </svg>
    ),
  },
  {
    id: 'evolution',
    label: 'Evolution',
    desc: 'Trace the tree of life, explore natural selection, and compare adaptations.',
    tags: ['NGSS', 'IB Bio'],
    badge: 'NEW',
    prompt:
      'Create a VR evolution experience where students explore the tree of life, observe natural selection in action with adaptations, and compare homologous structures across species.',
    gradient: 'linear-gradient(135deg, #ede9fe, #c4b5fd)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round">
        <path d="M12 22V8" />
        <path d="M12 8l-5-6" />
        <path d="M12 8l5-6" />
        <path d="M12 14l-4-3" />
        <path d="M12 14l4-3" />
      </svg>
    ),
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreatePage() {
  const router = useRouter();
  const [activeTopic, setActiveTopic] = useState<number | null>(null);
  const [prompt, setPrompt] = useState('');
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning ☀️');
    else if (hour < 17) setGreeting('Good afternoon 🌤');
    else setGreeting('Good evening 🌙');
  }, []);

  const selectTopic = (i: number) => {
    setActiveTopic(i);
    setPrompt(TOPICS[i].prompt);
  };

  const handleGenerate = () => {
    const val = prompt.trim();
    if (!val) return;
    router.push(`/workspace/new?prompt=${encodeURIComponent(val)}`);
  };

  return (
    <div
      className="min-h-screen relative"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* ── Watercolor wash background ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, background: '#FEFEFE' }} />
        <div style={{
          position: 'absolute', top: '-15%', left: '-10%',
          width: '60%', height: '60%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 40%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', top: '20%', right: '-15%',
          width: '50%', height: '50%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, rgba(59,130,246,0.01) 40%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '10%',
          width: '45%', height: '45%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(244,114,182,0.05) 0%, transparent 60%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', top: '5%', right: '10%',
          width: '30%', height: '30%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251,191,36,0.04) 0%, transparent 60%)',
          filter: 'blur(30px)',
        }} />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 pt-28 pb-24">
        {/* ── Greeting ── */}
        <p className="mb-2 text-sm" style={{ color: '#9ca3af' }}>
          {greeting}
        </p>

        {/* ── Heading ── */}
        <h1
          className="mb-3 text-center font-bold leading-tight"
          style={{ fontFamily: "'Syne', sans-serif", color: '#1a1a1a', fontSize: '36px' }}
        >
          What should students{' '}
          <span
            style={{
              background: 'linear-gradient(90deg, #059669, #0d9488)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            explore
          </span>{' '}
          today?
        </h1>

        <p className="mb-8 max-w-md text-center text-sm" style={{ color: '#9ca3af' }}>
          Describe a biology concept and we&apos;ll generate a fully interactive,
          standards-aligned VR experience in seconds.
        </p>

        {/* ── Input card ── */}
        <div className="w-full max-w-[640px] mb-8" style={glassCard}>
          <div className="p-5 pb-0">
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setActiveTopic(null);
              }}
              placeholder="Describe a biology topic or learning goal..."
              rows={3}
              className="w-full resize-none rounded-xl p-4 text-sm leading-relaxed outline-none transition-all"
              style={{
                backgroundColor: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(0,0,0,0.06)',
                color: '#1a1a1a',
                caretColor: '#10b981',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              onFocus={(e) => {
                e.target.style.border = '1px solid rgba(16,185,129,0.4)';
                e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)';
              }}
              onBlur={(e) => {
                e.target.style.border = '1px solid rgba(0,0,0,0.06)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div className="px-5 py-4 flex items-center justify-between">
            <span className="text-xs" style={{ color: '#9ca3af' }}>
              NGSS-aligned · ~60s
            </span>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200"
              style={{
                background: prompt.trim()
                  ? 'linear-gradient(135deg, #059669, #0d9488)'
                  : '#f3f4f6',
                color: prompt.trim() ? '#ffffff' : '#9ca3af',
                cursor: prompt.trim() ? 'pointer' : 'not-allowed',
                boxShadow: prompt.trim()
                  ? '0 4px 20px rgba(16,185,129,0.25)'
                  : 'none',
              }}
              onMouseEnter={(e) => {
                if (prompt.trim()) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 28px rgba(16,185,129,0.35)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = prompt.trim()
                  ? '0 4px 20px rgba(16,185,129,0.25)'
                  : 'none';
              }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate
            </button>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="w-full max-w-[640px] mb-8 flex items-center gap-4">
          <div className="flex-1" style={{ height: '1px', background: 'rgba(0,0,0,0.06)' }} />
          <span className="text-xs font-medium" style={{ color: '#9ca3af' }}>or pick a topic</span>
          <div className="flex-1" style={{ height: '1px', background: 'rgba(0,0,0,0.06)' }} />
        </div>

        {/* ── Topic cards grid ── */}
        <div className="w-full max-w-3xl mb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TOPICS.map((topic, i) => {
              const active = activeTopic === i;
              return (
                <button
                  key={topic.id}
                  onClick={() => selectTopic(i)}
                  className="group relative text-left rounded-2xl p-5 transition-all duration-200"
                  style={{
                    ...(active
                      ? {
                          background: 'rgba(240,253,244,0.7)',
                          border: '1.5px solid #86efac',
                          boxShadow: '0 4px 20px rgba(16,185,129,0.12)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                        }
                      : { ...glassCard }),
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)';
                      e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.transform = '';
                      e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.8)';
                    }
                  }}
                >
                  {'badge' in topic && topic.badge && (
                    <span
                      className="absolute top-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
                      style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}
                    >
                      {topic.badge}
                    </span>
                  )}

                  <div
                    className="mb-3 flex h-11 w-11 items-center justify-center rounded-full"
                    style={{ background: topic.gradient }}
                  >
                    {topic.icon}
                  </div>

                  <h3
                    className="text-[14px] font-semibold mb-1"
                    style={{ color: '#1a1a1a', fontFamily: "'Syne', sans-serif" }}
                  >
                    {topic.label}
                  </h3>

                  <p
                    className="text-xs leading-relaxed mb-3"
                    style={{
                      color: '#9ca3af',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {topic.desc}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {topic.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full text-[10px] font-medium"
                        style={{
                          padding: '2px 8px',
                          backgroundColor: 'rgba(0,0,0,0.04)',
                          color: '#9ca3af',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Trust signals ── */}
        <div
          className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium"
          style={{ color: '#9ca3af' }}
        >
          {['NGSS + AP Bio aligned', 'Web & VR ready', 'No code required'].map((stat) => (
            <span key={stat} className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {stat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
