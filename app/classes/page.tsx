'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, GraduationCap, Loader2, Plus, Users } from 'lucide-react';

type Classroom = { id: string; name: string; grade: string; subject: string; joinCode: string; studentCount: number };
type Notice = { kind: 'success' | 'error'; text: string };

export default function ClassesPage() {
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [isTeacher, setIsTeacher] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const response = await fetch('/api/classes', { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (response.status === 401) { setAuthRequired(true); return; }
      if (!response.ok) throw new Error(body.error || 'Could not load classes.');
      if (body.role !== 'teacher') { setIsTeacher(false); return; }
      setClasses(Array.isArray(body.classes) ? body.classes : []);
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not load classes.' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadClasses(); }, [loadClasses]);

  async function createClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setCreating(true); setNotice(null);
    try {
      const response = await fetch('/api/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), grade: form.get('grade'), subject: form.get('subject') }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not create class.');
      setClasses((current) => [body.class, ...current]);
      formElement.reset();
      setNotice({ kind: 'success', text: 'Class created. The join code is ready to share.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not create class.' });
    } finally { setCreating(false); }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setNotice({ kind: 'success', text: 'Join code copied.' });
    } catch {
      setNotice({ kind: 'error', text: 'Could not copy the join code. Select and copy it manually.' });
    }
  }

  if (loading) return <PageShell><div className="flex min-h-[50vh] items-center justify-center gap-3 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" /> Loading classes…</div></PageShell>;
  if (authRequired) return <PageShell><StateCard title="Sign in to view your classes" description="Teacher classes and student rosters are available after you sign in."><Link href="/login?redirect=/classes" className="inline-flex min-h-11 items-center rounded-lg bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">Sign in</Link></StateCard></PageShell>;
  if (!isTeacher) return <PageShell><StateCard title="This is the teacher workspace" description="Student accounts can join a class and view their enrolled classes from Student Access."><Link href="/join" className="inline-flex min-h-11 items-center rounded-lg bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">Go to Student Access</Link></StateCard></PageShell>;

  return <PageShell>
    <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="mb-2 font-semibold text-emerald-700">TEACHER SPACE</p><h1 className="text-4xl font-bold text-slate-900">My Classes</h1><p className="mt-2 text-slate-600">Create a class and share its private join code with your students.</p></div><Link href="/join" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">Student Access →</Link></div>
    {notice && <div role={notice.kind === 'error' ? 'alert' : 'status'} className={`mb-5 rounded-lg border px-4 py-3 text-sm ${notice.kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{notice.text}</div>}
    <div className="grid gap-7 lg:grid-cols-[390px_1fr]">
      <form onSubmit={createClass} className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-2 font-semibold text-slate-900"><Plus className="h-5 w-5 text-emerald-600" /> Create a class</div><div className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">Class name<input required name="name" maxLength={120} placeholder="Biology Period 3" className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
        <label className="block text-sm font-medium text-slate-700">Grade<input required name="grade" maxLength={40} placeholder="Grade 10" className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
        <label className="block text-sm font-medium text-slate-700">Subject<input required name="subject" maxLength={80} defaultValue="Biology" className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
        <button disabled={creating} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{creating && <Loader2 className="h-4 w-4 animate-spin" />}{creating ? 'Creating…' : 'Create class'}</button>
      </div></form>
      <section aria-label="Your classes">{classes.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><GraduationCap className="mx-auto mb-3 h-10 w-10 text-emerald-600" /><h2 className="font-semibold text-slate-900">Your first class starts here</h2><p className="mt-1 text-sm text-slate-600">Create a class, then share its generated code with students.</p></div> : <div className="grid gap-4 sm:grid-cols-2">{classes.map((classroom) => <article key={classroom.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">{classroom.name}</h2><p className="text-sm text-slate-500">{classroom.grade} · {classroom.subject}</p></div><Users className="h-5 w-5 text-emerald-600" /></div><div className="mt-6 flex items-center justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Student join code</p><p className="mt-1 select-all font-mono text-xl font-bold tracking-widest text-slate-900">{classroom.joinCode}</p></div><button type="button" onClick={() => copyCode(classroom.joinCode)} aria-label={`Copy join code for ${classroom.name}`} className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 focus:ring-2 focus:ring-emerald-500"><Copy className="h-4 w-4" /></button></div><p className="mt-5 text-sm text-slate-500">{classroom.studentCount} student{classroom.studentCount === 1 ? '' : 's'} joined</p></article>)}</div>}</section>
    </div>
  </PageShell>;
}

function PageShell({ children }: { children: React.ReactNode }) { return <div className="min-h-screen bg-slate-50 px-6 pb-16 pt-28"><div className="mx-auto max-w-6xl">{children}</div></div>; }
function StateCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><GraduationCap className="mx-auto mb-4 h-10 w-10 text-emerald-600" /><h1 className="text-2xl font-bold text-slate-900">{title}</h1><p className="mx-auto mb-6 mt-2 max-w-md text-slate-600">{description}</p>{children}</div>; }
