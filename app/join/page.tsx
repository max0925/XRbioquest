'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Loader2 } from 'lucide-react';

type JoinedClass = { id: string; name: string; grade: string; subject: string };
type Notice = { kind: 'success' | 'error'; text: string };

export default function JoinClassPage() {
  const [joinCode, setJoinCode] = useState('');
  const [classes, setClasses] = useState<JoinedClass[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [isStudent, setIsStudent] = useState(true);

  const loadClasses = useCallback(async (preserveNotice = false) => {
    setLoading(true);
    if (!preserveNotice) setNotice(null);
    try {
      const response = await fetch('/api/classes', { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (response.status === 401) { setAuthRequired(true); return; }
      if (!response.ok) throw new Error(body.error || 'Could not load joined classes.');
      if (body.role !== 'student') { setIsStudent(false); return; }
      setClasses(Array.isArray(body.classes) ? body.classes : []);
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not load joined classes.' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadClasses(); }, [loadClasses]);

  async function joinClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoining(true); setNotice(null);
    try {
      const response = await fetch('/api/classes/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ joinCode }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not join class.');
      setJoinCode('');
      setNotice({ kind: 'success', text: body.alreadyJoined ? `You are already in ${body.class.name}.` : `You joined ${body.class.name}.` });
      await loadClasses(true);
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not join class.' });
    } finally { setJoining(false); }
  }

  return <div className="min-h-screen bg-slate-50 px-6 pb-16 pt-28"><div className="mx-auto max-w-4xl">
    <div className="mb-8"><p className="text-sm font-semibold text-emerald-700">STUDENT ACCESS</p><h1 className="mt-2 text-4xl font-bold text-slate-900">My Classes</h1><p className="mt-2 text-slate-600">Join with the 8-character code from your teacher.</p></div>
    {loading ? <div className="flex min-h-48 items-center justify-center gap-3 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" /> Loading your classes…</div> : authRequired ? <StateCard title="Sign in to join a class" description="Your memberships are saved to your student account."><Link href="/login?redirect=/join" className="inline-flex min-h-11 items-center rounded-lg bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">Sign in</Link></StateCard> : !isStudent ? <StateCard title="Student accounts join classes" description="This account is configured as a teacher."><Link href="/classes" className="inline-flex min-h-11 items-center rounded-lg bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">Go to Teacher Space</Link></StateCard> : <div className="grid gap-7 md:grid-cols-[340px_1fr]">
      <form onSubmit={joinClass} className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><label htmlFor="join-code" className="block font-semibold text-slate-900">Class join code</label><input id="join-code" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} required maxLength={12} autoComplete="off" spellCheck={false} placeholder="ABCD2345" className="mt-3 min-h-12 w-full rounded-lg border border-slate-300 px-4 font-mono text-lg uppercase tracking-widest outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /><button disabled={joining} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{joining && <Loader2 className="h-4 w-4 animate-spin" />}{joining ? 'Joining…' : 'Join class'}</button>{notice && <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`mt-5 rounded-lg border p-3 text-sm ${notice.kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{notice.text}</p>}</form>
      <section aria-label="Joined classes">{classes.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><BookOpen className="mx-auto mb-3 h-9 w-9 text-emerald-600" /><h2 className="font-semibold text-slate-900">No classes yet</h2><p className="mt-1 text-sm text-slate-600">Enter your teacher’s join code to get started.</p></div> : <div className="space-y-3">{classes.map((classroom) => <article key={classroom.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900">{classroom.name}</h2><p className="mt-1 text-sm text-slate-500">{classroom.grade} · {classroom.subject}</p></article>)}</div>}</section>
    </div>}
  </div></div>;
}

function StateCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><BookOpen className="mx-auto mb-4 h-10 w-10 text-emerald-600" /><h2 className="text-2xl font-bold text-slate-900">{title}</h2><p className="mx-auto mb-6 mt-2 max-w-md text-slate-600">{description}</p>{children}</div>; }
