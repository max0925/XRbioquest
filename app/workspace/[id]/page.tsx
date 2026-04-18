'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'ai' | 'user';
  text: string;
  typing?: boolean;
}

// ─── Generation step labels ──────────────────────────────────────────────────

const GEN_STEPS = [
  'Analyzing learning objectives...',
  'Selecting NGSS standards...',
  'Choosing environment & assets...',
  'Designing quest chain & phases...',
  'Writing knowledge cards & quiz...',
];

// ─── Phase type labels ───────────────────────────────────────────────────────

const PHASE_TYPE_MAP: Record<string, string> = {
  intro: 'Intro', click: 'Click', drag: 'Drag',
  'drag-multi': 'Drag Multi', 'drag-chain': 'Drag Chain',
  quiz: 'Quiz', complete: 'Complete',
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [config, setConfig] = useState<any>(null);
  const [gameId, setGameId] = useState<string | null>(id === 'new' ? null : id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const generatingRef = useRef(false);

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load existing config ──
  useEffect(() => {
    if (id === 'new') return;
    const supabase = createClient();
    supabase
      .from('game_configs')
      .select('config')
      .eq('id', id)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError('Experience not found.');
          setLoading(false);
          return;
        }
        setConfig(data.config);
        setLoading(false);
        setMessages([buildWelcomeMessage(data.config)]);
      });
  }, [id]);

  // ── Generation flow ──
  useEffect(() => {
    if (id !== 'new' || generatingRef.current) return;
    generatingRef.current = true;

    const promptParam = searchParams.get('prompt');
    if (!promptParam) {
      setError('No prompt provided.');
      setLoading(false);
      return;
    }

    setMessages([{ role: 'user', text: promptParam }]);
    runGeneration(promptParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function runGeneration(prompt: string) {
    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      if (stepIdx < GEN_STEPS.length) {
        const stepText = GEN_STEPS[stepIdx];
        setMessages((prev) => {
          const updated = prev.map((m) => (m.typing ? { ...m, typing: false } : m));
          return [...updated, { role: 'ai', text: stepText, typing: true }];
        });
        stepIdx++;
      } else {
        clearInterval(stepInterval);
      }
    }, 2200);

    try {
      const res = await fetch('/api/assemble-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      clearInterval(stepInterval);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Generation failed (${res.status})`);
      }

      const data = await res.json();
      const cfg = data.config;

      const dbId = crypto.randomUUID();
      const supabase = createClient();
      const { error: dbErr } = await supabase.from('game_configs').insert({
        id: dbId,
        config: cfg,
        title: cfg.meta?.title ?? 'Untitled Experience',
        subject: cfg.meta?.subject ?? 'Biology',
        prompt,
      });
      if (dbErr) throw new Error(`Could not save: ${dbErr.message}`);

      // Wait for DB row to be fully readable before rendering iframe
      console.log('[WORKSPACE] Config saved, waiting for propagation...');
      await new Promise((r) => setTimeout(r, 1000));

      // Set config before gameId — gameId triggers iframe render
      setConfig(cfg);
      setLoading(false);
      window.history.replaceState(null, '', `/workspace/${dbId}`);
      setGameId(dbId);

      setMessages((prev) => {
        const userMsg = prev.find((m) => m.role === 'user');
        return [...(userMsg ? [{ ...userMsg }] : []), buildWelcomeMessage(cfg)];
      });
    } catch (err: any) {
      clearInterval(stepInterval);
      setLoading(false);
      setError(err.message);
      setMessages((prev) => [
        ...prev.filter((m) => !m.typing),
        { role: 'ai', text: `Something went wrong: ${err.message}. Go back to /create and try again.` },
      ]);
    }
  }

  // ── Send message → call edit-game API ──
  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || !config || !gameId || isEditing) return;
    if (!overrideText) setInput('');

    setIsEditing(true);
    setMessages((prev) => [...prev, { role: 'user', text }, { role: 'ai', text: 'Thinking...', typing: true }]);

    try {
      const history = messages
        .filter((m) => !m.typing)
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/edit-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, message: text, history }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Edit failed (${res.status})`);
      }

      const data = await res.json();
      const newConfig = data.config;
      const aiMsg = data.message ?? 'Changes applied.';

      console.log('[EDIT] Got new config from API:', newConfig.phases?.length, 'phases,', newConfig.assets?.length, 'assets');
      console.log('[EDIT] Saving to Supabase via server route, gameId:', gameId);

      // Save via server-side API route (uses service role key, bypasses RLS)
      const saveRes = await fetch('/api/update-game-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: gameId,
          config: newConfig,
          title: newConfig.meta?.title ?? config.meta?.title,
        }),
      });
      const saveResult = await saveRes.json();

      if (!saveRes.ok) {
        console.error('[EDIT] Save FAILED:', saveResult.error);
        setConfig(newConfig);
        setMessages((prev) => [
          ...prev.filter((m) => !m.typing),
          { role: 'ai', text: aiMsg },
          { role: 'ai', text: `\u26a0\ufe0f Changes applied locally but not saved: ${saveResult.error}` },
        ]);
        setIsEditing(false);
        return;
      }

      console.log('[EDIT] Save OK for', gameId);

      // Update local state
      setConfig(newConfig);
      setMessages((prev) => [
        ...prev.filter((m) => !m.typing),
        { role: 'ai', text: aiMsg },
        { role: 'ai', text: '\u2705 Saved & preview refreshing...' },
      ]);

      // Wait for DB write to propagate, then refresh iframe
      await new Promise((r) => setTimeout(r, 600));
      console.log('[EDIT] Refreshing iframe');
      setIframeKey((k) => k + 1);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev.filter((m) => !m.typing),
        { role: 'ai', text: `Something went wrong: ${err.message}` },
      ]);
    } finally {
      setIsEditing(false);
    }
  }, [input, config, gameId, isEditing, messages]);

  const title = config?.meta?.title ?? 'Loading...';
  const subject = config?.meta?.subject ?? '';
  const phases: any[] = config?.phases ?? [];
  const quickActions: Record<string, string> = {
    'Add Quiz': 'Add a quiz question about...',
    'Change Environment': 'Change the environment to...',
    'More Phases': 'Add more phases about...',
    'Edit Intro': 'Rewrite the intro story to...',
  };
  const isGenerating = id === 'new' && !config && !error;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ═══ Top Bar ═══ */}
      <div
        style={{
          height: 48, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          background: '#fff',
        }}
      >
        {/* Left: logo + breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/bio.png" alt="BioQuest" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'contain' }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.01em' }}>
              BIOQUEST
            </span>
          </Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
          <button
            onClick={() => router.push('/create')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, color: '#6b7280',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Create
          </button>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>
            Workspace
          </span>
        </div>

        {/* Center: title */}
        <span
          style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            fontSize: 14, fontWeight: 600, color: '#1a1a1a',
            maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontFamily: "'Syne', sans-serif",
          }}
        >
          {isGenerating ? 'Generating...' : title}
        </span>

        {/* Right: share */}
        <button
          disabled={!gameId}
          onClick={() => {
            if (gameId) {
              navigator.clipboard.writeText(`${window.location.origin}/play/${gameId}`);
              setShareCopied(true);
              setTimeout(() => setShareCopied(false), 2000);
            }
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: shareCopied ? '#059669' : gameId ? 'linear-gradient(135deg, #059669, #0d9488)' : '#e5e7eb',
            border: 'none', borderRadius: 8, padding: '6px 14px',
            cursor: gameId ? 'pointer' : 'default',
            fontSize: 12, fontWeight: 600,
            color: gameId ? '#fff' : '#9ca3af',
            fontFamily: "'DM Sans', sans-serif",
            transition: 'background 200ms',
          }}
        >
          {shareCopied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
              Link Copied!
            </>
          ) : !gameId ? (
            'Generating...'
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
              </svg>
              Share with Students
            </>
          )}
        </button>
      </div>

      {/* ═══ Main: chat + preview ═══ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* ── Left: Chat Panel ── */}
        <div
          style={{
            width: 380, flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            background: '#FAFAF8',
            borderRight: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          {/* Meta header */}
          {config && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', margin: 0, marginBottom: 6, fontFamily: "'Syne', sans-serif" }}>
                {title}
              </h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {subject && (
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#059669', background: 'rgba(16,185,129,0.08)', borderRadius: 100, padding: '2px 10px' }}>
                    {subject}
                  </span>
                )}
                <span style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', background: 'rgba(0,0,0,0.04)', borderRadius: 100, padding: '2px 10px' }}>
                  {phases.filter((p: any) => p.type !== 'intro' && p.type !== 'complete').length} phases
                </span>
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
            {error && !config && (
              <div style={{ textAlign: 'center', color: '#dc2626', fontSize: 13, marginTop: 40 }}>
                {error}
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    maxWidth: '85%', padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    fontSize: 13, lineHeight: 1.6, color: '#1a1a1a',
                    background: msg.role === 'ai' ? 'rgba(16,185,129,0.08)' : 'rgba(0,0,0,0.04)',
                  }}
                >
                  {msg.typing ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981', animation: 'pulse 1s ease-in-out infinite' }} />
                      {msg.text}
                    </span>
                  ) : msg.text}
                </div>
              </div>
            ))}

            {config && phases.length > 0 && (
              <div style={{ marginTop: 8, marginBottom: 12 }}>
                <PhaseList phases={phases} expandedPhase={expandedPhase} onToggle={(idx) => setExpandedPhase(expandedPhase === idx ? null : idx)} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions */}
          {config && !isEditing && (
            <div style={{ padding: '0 16px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(quickActions).map(([label, prompt]) => (
                <button
                  key={label}
                  onClick={() => { setInput(prompt); setTimeout(() => inputRef.current?.focus(), 0); }}
                  style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 100, padding: '4px 12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 150ms' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; e.currentTarget.style.color = '#059669'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'; }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={isGenerating ? 'Generating...' : isEditing ? 'Applying changes...' : 'Tell me what to change...'}
              disabled={isGenerating || isEditing}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', background: '#fff', fontSize: 13, color: '#1a1a1a', outline: 'none', fontFamily: "'DM Sans', sans-serif", transition: 'border-color 150ms, box-shadow 150ms', opacity: (isGenerating || isEditing) ? 0.5 : 1 }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(16,185,129,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.08)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(0,0,0,0.08)'; e.target.style.boxShadow = 'none'; }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isGenerating || isEditing}
              style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: input.trim() && !isGenerating && !isEditing ? 'linear-gradient(135deg, #059669, #0d9488)' : '#e5e7eb', cursor: input.trim() && !isGenerating && !isEditing ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 150ms' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !isGenerating && !isEditing ? '#fff' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Right: Game Preview ── */}
        <div style={{ flex: 1, background: '#000', position: 'relative' }}>
          {!gameId ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              {isGenerating ? (
                <>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#10b981', animation: 'spin 1s linear infinite' }} />
                  <span style={{ color: '#6b7280', fontSize: 13 }}>Generating experience...</span>
                </>
              ) : (
                <span style={{ color: '#6b7280', fontSize: 13 }}>{error ? 'Could not load preview' : 'Loading...'}</span>
              )}
            </div>
          ) : (
            <iframe
              key={iframeKey}
              src={`/play/${gameId}`}
              style={{ border: 'none', width: '100%', height: '100%' }}
              allow="xr-spatial-tracking; microphone"
            />
          )}

          {/* Course Info FAB */}
          {config && (
            <button
              onClick={() => setDrawerOpen(true)}
              style={{
                position: 'absolute', top: 16, right: 16, zIndex: 20,
                width: 44, height: 44, borderRadius: '50%',
                background: '#fff', border: 'none',
                boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 150ms, box-shadow 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)'; }}
              title="Course Overview"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                <path d="M8 7h8M8 11h6" />
              </svg>
            </button>
          )}

          {/* Course Info Drawer */}
          {drawerOpen && config && (
            <CourseDrawer config={config} onClose={() => setDrawerOpen(false)} />
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}

// ─── Welcome message builder ─────────────────────────────────────────────────

function buildWelcomeMessage(cfg: any): ChatMessage {
  const title = cfg?.meta?.title ?? 'Untitled';
  const subject = cfg?.meta?.subject ?? 'biology';
  const interactiveCount = cfg?.phases?.filter((p: any) => p.type !== 'intro' && p.type !== 'complete').length ?? 0;
  const hasQuiz = cfg?.phases?.some((p: any) => p.type === 'quiz');
  const envPreset = cfg?.environment?.preset ?? 'default';

  return {
    role: 'ai',
    text: `Your experience "${title}" is ready! It has ${interactiveCount} interactive phases${hasQuiz ? ' (including quiz)' : ''}, covering ${subject}. Environment: ${envPreset}. You can play it in the preview, or tell me what to change.`,
  };
}

// ─── Course Overview Drawer ──────────────────────────────────────────────────

function CourseDrawer({ config, onClose }: { config: any; onClose: () => void }) {
  const phases: any[] = config?.phases ?? [];
  const tg = config?.teacher_guide;

  // Fallback: infer objectives from knowledge cards when teacher_guide is missing
  const knowledgeCards = phases
    .filter((p: any) => p.knowledge_card?.title)
    .map((p: any) => p.knowledge_card);

  // Phase type stats
  const typeCounts: Record<string, number> = {};
  phases.forEach((p: any) => {
    const t = p.type ?? 'unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  const subject = config?.meta?.subject ?? '';
  const title = config?.meta?.title ?? '';
  const gradeBand = config?.meta?.grade_band ?? '';

  // Build full lesson plan markdown for "Copy All"
  const buildLessonPlan = (): string => {
    const lines: string[] = [`# ${title}`, ''];
    if (tg?.learning_objectives?.length) {
      lines.push('## Learning Objectives');
      tg.learning_objectives.forEach((o: string) => lines.push(`- ${o}`));
      lines.push('');
    }
    if (tg?.essential_questions?.length) {
      lines.push('## Essential Questions');
      tg.essential_questions.forEach((q: string) => lines.push(`- ${q}`));
      lines.push('');
    }
    if (tg?.vocabulary?.length) {
      lines.push('## Key Vocabulary');
      tg.vocabulary.forEach((v: any) => lines.push(`- **${v.term}**: ${v.definition}`));
      lines.push('');
    }
    if (tg?.ngss_standards?.length) {
      lines.push('## Curriculum Alignment');
      if (subject) lines.push(`Subject: ${subject}`);
      if (gradeBand) lines.push(`Grade Band: ${gradeBand}`);
      tg.ngss_standards.forEach((s: any) => lines.push(`- ${s.code}: ${s.description}`));
      lines.push('');
    }
    if (tg?.pedagogical_notes) {
      lines.push('## Teaching Approach');
      lines.push(tg.pedagogical_notes);
      lines.push(`\nPhase breakdown: ${Object.entries(typeCounts).map(([t, c]) => `${c} ${t}`).join(', ')}`);
      lines.push('');
    }
    if (tg?.assessment_suggestions?.length) {
      lines.push('## Assessment Ideas');
      tg.assessment_suggestions.forEach((a: string) => lines.push(`- ${a}`));
      lines.push('');
    }
    if (tg?.prerequisite_knowledge?.length) {
      lines.push('## Prerequisites');
      tg.prerequisite_knowledge.forEach((p: string) => lines.push(`- ${p}`));
      lines.push('');
    }
    if (tg?.cross_curricular_connections?.length) {
      lines.push('## Cross-Curricular Connections');
      tg.cross_curricular_connections.forEach((c: string) => lines.push(`- ${c}`));
      lines.push('');
    }
    return lines.join('\n');
  };

  const [copiedAll, setCopiedAll] = useState(false);
  const handleCopyAll = () => {
    navigator.clipboard.writeText(buildLessonPlan());
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  };

  const sectionIcon = (icon: string) => (
    <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0, width: 18, textAlign: 'center' }}>{icon}</span>
  );

  const bulletItem = (icon: string, text: string, key: number) => (
    <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 12, lineHeight: '20px', flexShrink: 0 }}>{icon}</span>
      <p style={{ margin: 0, fontSize: 12, color: '#374151', lineHeight: '20px' }}>{text}</p>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0, zIndex: 30,
          background: 'rgba(0,0,0,0.3)',
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 380, zIndex: 40,
          background: '#fff', borderLeft: '1px solid rgba(0,0,0,0.08)',
          display: 'flex', flexDirection: 'column',
          animation: 'slideIn 250ms ease-out',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
            </svg>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Syne', sans-serif" }}>
              Teacher Guide
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: '#6b7280' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>

          {/* Section 1: Learning Objectives */}
          <AccordionSection title="Learning Objectives" defaultOpen>
            {(tg?.learning_objectives?.length ?? 0) > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {tg.learning_objectives.map((obj: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    {sectionIcon('\u2705')}
                    <p style={{ margin: 0, fontSize: 12, color: '#374151', lineHeight: '20px', flex: 1 }}>{obj}</p>
                  </div>
                ))}
              </div>
            ) : knowledgeCards.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>Inferred from knowledge cards:</p>
                {knowledgeCards.map((kc: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    {sectionIcon('\u2705')}
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{kc.title}</p>
                      {kc.body && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>{kc.body}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>No objectives available.</p>
            )}
          </AccordionSection>

          {/* Section 2: Essential Questions */}
          {(tg?.essential_questions?.length ?? 0) > 0 && (
            <AccordionSection title="Essential Questions" defaultOpen>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {tg.essential_questions.map((q: string, i: number) => bulletItem('\u2753', q, i))}
              </div>
            </AccordionSection>
          )}

          {/* Section 3: Key Vocabulary */}
          {(tg?.vocabulary?.length ?? 0) > 0 && (
            <AccordionSection title="Key Vocabulary" defaultOpen={false}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tg.vocabulary.map((v: any, i: number) => (
                  <div key={i}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>{v.term}</span>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>{v.definition}</p>
                  </div>
                ))}
              </div>
            </AccordionSection>
          )}

          {/* Section 4: Curriculum Alignment */}
          <AccordionSection title="Curriculum Alignment" defaultOpen>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {subject && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', width: 60, flexShrink: 0 }}>Subject</span>
                  <span style={{ fontSize: 12, color: '#1a1a1a' }}>{subject}</span>
                </div>
              )}
              {gradeBand && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', width: 60, flexShrink: 0 }}>Grade</span>
                  <span style={{ fontSize: 12, color: '#1a1a1a' }}>{gradeBand}</span>
                </div>
              )}
              {(tg?.ngss_standards?.length ?? 0) > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  {tg.ngss_standards.map((s: any, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: '#059669',
                        background: 'rgba(16,185,129,0.1)', borderRadius: 4, padding: '2px 6px',
                        flexShrink: 0, fontFamily: 'monospace',
                      }}>{s.code}</span>
                      <p style={{ margin: 0, fontSize: 11, color: '#6b7280', lineHeight: '18px' }}>{s.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {['NGSS', 'AP Bio'].map((tag) => (
                    <span key={tag} style={{ fontSize: 10, fontWeight: 600, color: '#059669', background: 'rgba(16,185,129,0.08)', borderRadius: 100, padding: '2px 10px' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Section 5: Teaching Approach */}
          <AccordionSection title="Teaching Approach" defaultOpen>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
                {tg?.pedagogical_notes ??
                  'This experience uses inquiry-based learning through interactive VR. Students explore 3D environments while completing interactive challenges.'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {Object.entries(typeCounts).map(([type, count]) => (
                  <span
                    key={type}
                    style={{
                      fontSize: 11, fontWeight: 500,
                      color: type === 'quiz' ? '#7c3aed' : type === 'intro' || type === 'complete' ? '#9ca3af' : '#059669',
                      background: type === 'quiz' ? 'rgba(124,58,237,0.08)' : type === 'intro' || type === 'complete' ? 'rgba(0,0,0,0.04)' : 'rgba(16,185,129,0.08)',
                      borderRadius: 100, padding: '2px 10px',
                    }}
                  >
                    {count} {PHASE_TYPE_MAP[type] ?? type}
                  </span>
                ))}
              </div>
            </div>
          </AccordionSection>

          {/* Section 6: Assessment Ideas */}
          {(tg?.assessment_suggestions?.length ?? 0) > 0 && (
            <AccordionSection title="Assessment Ideas" defaultOpen={false}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {tg.assessment_suggestions.map((a: string, i: number) => bulletItem('\uD83D\uDCDD', a, i))}
              </div>
            </AccordionSection>
          )}

          {/* Section 7: Prerequisites & Connections */}
          {((tg?.prerequisite_knowledge?.length ?? 0) > 0 || (tg?.cross_curricular_connections?.length ?? 0) > 0) && (
            <AccordionSection title="Prerequisites & Connections" defaultOpen={false}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(tg?.prerequisite_knowledge?.length ?? 0) > 0 && (
                  <div>
                    <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prerequisites</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {tg.prerequisite_knowledge.map((p: string, i: number) => bulletItem('\u2022', p, i))}
                    </div>
                  </div>
                )}
                {(tg?.cross_curricular_connections?.length ?? 0) > 0 && (
                  <div>
                    <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cross-Curricular</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {tg.cross_curricular_connections.map((c: string, i: number) => bulletItem('\uD83D\uDD17', c, i))}
                    </div>
                  </div>
                )}
              </div>
            </AccordionSection>
          )}
        </div>

        {/* Copy All Button */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <button
            onClick={handleCopyAll}
            style={{
              width: '100%', padding: '10px 16px',
              background: copiedAll ? '#059669' : 'linear-gradient(135deg, #059669, #10b981)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 200ms',
            }}
          >
            {copiedAll ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                Copied to Clipboard
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                Copy All for Lesson Plan
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Accordion Section ───────────────────────────────────────────────────────

function AccordionSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, color: '#1a1a1a',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {title}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: '0 20px 16px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Copy Button ─────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      onClick={handleCopy}
      title={label ?? 'Copy to clipboard'}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0,
        color: copied ? '#059669' : '#9ca3af',
        transition: 'color 150ms',
      }}
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
}

// ─── Phase List ──────────────────────────────────────────────────────────────

function PhaseList({ phases, expandedPhase, onToggle }: { phases: any[]; expandedPhase: number | null; onToggle: (idx: number) => void }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#6b7280', fontFamily: "'DM Sans', sans-serif" }}
      >
        <span>{phases.filter((p: any) => p.type !== 'intro' && p.type !== 'complete').length} Phases</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 200ms' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {!collapsed && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          {phases.map((phase: any, idx: number) => {
            const isOpen = expandedPhase === idx;
            const typeLabel = PHASE_TYPE_MAP[phase.type] ?? phase.type;
            const knowledgeTitle = phase.knowledge_card?.title;

            return (
              <div key={phase.id || idx}>
                <button
                  onClick={() => onToggle(idx)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: isOpen ? 'rgba(16,185,129,0.04)' : 'none', border: 'none', borderTop: idx > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none', cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans', sans-serif" }}
                >
                  <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: phase.type === 'intro' || phase.type === 'complete' ? 'rgba(0,0,0,0.06)' : 'rgba(16,185,129,0.1)', color: phase.type === 'intro' || phase.type === 'complete' ? '#9ca3af' : '#059669' }}>
                    {idx + 1}
                  </span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#1a1a1a' }}>
                    {phase.instruction ? (phase.instruction.length > 50 ? phase.instruction.slice(0, 50) + '...' : phase.instruction) : typeLabel}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', background: 'rgba(0,0,0,0.04)', borderRadius: 100, padding: '1px 7px' }}>
                    {typeLabel}
                  </span>
                </button>
                {isOpen && (
                  <div style={{ padding: '6px 14px 12px 42px', fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
                    {phase.instruction && <p style={{ margin: '0 0 4px' }}>{phase.instruction}</p>}
                    {knowledgeTitle && <p style={{ margin: 0, color: '#059669' }}>Knowledge: {knowledgeTitle}</p>}
                    {phase.type === 'quiz' && phase.question && <p style={{ margin: '4px 0 0', fontStyle: 'italic' }}>Q: {phase.question}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
