'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, CalendarDays, ClipboardList, Loader2 } from 'lucide-react';

type Option = { id: string; name?: string; title?: string | null };
type Assignment = { id: string; class_id: string; experience_id: string; title: string; className: string; experienceTitle: string; instructions: string | null; due_at: string | null; allow_retries: boolean; status: string; created_at: string };
type Notice = { kind: 'success' | 'error'; text: string };

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [experiences, setExperiences] = useState<Option[]>([]);
  const [selectedExperience, setSelectedExperience] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const [listResponse, optionsResponse] = await Promise.all([fetch('/api/assignments', { cache: 'no-store' }), fetch('/api/assignments/options', { cache: 'no-store' })]);
      if (listResponse.status === 401 || optionsResponse.status === 401) { setAuthRequired(true); return; }
      if (listResponse.status === 403 || optionsResponse.status === 403) { setForbidden(true); return; }
      const [listBody, optionsBody] = await Promise.all([listResponse.json().catch(() => ({})), optionsResponse.json().catch(() => ({}))]);
      if (!listResponse.ok || !optionsResponse.ok) throw new Error(listBody.error || optionsBody.error || 'Could not load assignments.');
      setAssignments(listBody.assignments ?? []); setClasses(optionsBody.classes ?? []); setExperiences(optionsBody.experiences ?? []);
    } catch (error) { setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not load assignments.' }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadPage(); }, [loadPage]);

  function chooseExperience(id: string) {
    setSelectedExperience(id);
    const experience = experiences.find((item) => item.id === id);
    setTitle(experience?.title || 'Untitled experience');
  }

  async function createAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    setCreating(true); setNotice(null);
    try {
      const response = await fetch('/api/assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classId: form.get('classId'), experienceId: selectedExperience, title, instructions: form.get('instructions'), dueAt: form.get('dueAt'), allowRetries: form.get('allowRetries') === 'on' }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not create assignment.');
      formElement.reset(); setSelectedExperience(''); setTitle(''); setNotice({ kind: 'success', text: 'Assignment created and visible to enrolled students.' }); await loadPage();
    } catch (error) { setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not create assignment.' }); }
    finally { setCreating(false); }
  }

  if (loading) return <Shell><Loading /></Shell>;
  if (authRequired) return <Shell><Gate title="Sign in to manage assignments" href="/login?redirect=/assignments" label="Sign in" /></Shell>;
  if (forbidden) return <Shell><Gate title="Assignments are managed by teachers" href="/student" label="Go to My Learning" /></Shell>;

  return <Shell><header className="mb-9"><p className="font-semibold text-emerald-700">TEACHER SPACE</p><h1 className="mt-2 text-4xl font-bold text-slate-900">Assignments</h1><p className="mt-2 text-slate-600">Assign one of your published experiences to a class.</p></header>
    {notice && <div role={notice.kind === 'error' ? 'alert' : 'status'} className={`mb-5 rounded-lg border p-3 text-sm ${notice.kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{notice.text}</div>}
    <div className="grid gap-7 lg:grid-cols-[390px_1fr]">
      <form onSubmit={createAssignment} className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="flex items-center gap-2 font-semibold text-slate-900"><ClipboardList className="h-5 w-5 text-emerald-600" /> Create assignment</h2>
        {classes.length === 0 || experiences.length === 0 ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{classes.length === 0 ? 'Create a class first.' : 'Publish an experience before creating an assignment.'}</p> : <>
          <label className="block text-sm font-medium text-slate-700">Class<select required name="classId" className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 focus:ring-2 focus:ring-emerald-100"><option value="">Select a class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="block text-sm font-medium text-slate-700">Published experience<select required value={selectedExperience} onChange={(event) => chooseExperience(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 focus:ring-2 focus:ring-emerald-100"><option value="">Select an experience</option>{experiences.map((item) => <option key={item.id} value={item.id}>{item.title || 'Untitled experience'}</option>)}</select></label>
          <label className="block text-sm font-medium text-slate-700">Assignment title<input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 focus:ring-2 focus:ring-emerald-100" /></label>
          <label className="block text-sm font-medium text-slate-700">Teacher instructions <span className="font-normal text-slate-500">(optional)</span><textarea name="instructions" maxLength={2000} rows={3} className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-emerald-100" /></label>
          <label className="block text-sm font-medium text-slate-700">Due date <span className="font-normal text-slate-500">(optional)</span><input type="datetime-local" name="dueAt" className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 focus:ring-2 focus:ring-emerald-100" /></label>
          <label className="flex min-h-11 items-center gap-3 text-sm text-slate-700"><input type="checkbox" name="allowRetries" defaultChecked className="h-4 w-4 accent-emerald-600" /> Allow students to retry</label>
          <button disabled={creating} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{creating && <Loader2 className="h-4 w-4 animate-spin" />}{creating ? 'Creating…' : 'Create assignment'}</button>
        </>}
      </form>
      <section aria-label="Assigned work">{assignments.length === 0 ? <Empty title="No assignments yet" text="Choose a published experience and a class to create the first assignment." /> : <div className="space-y-4">{assignments.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-900">{item.title}</h2><p className="mt-1 text-sm text-slate-600">{item.className} · {item.experienceTitle}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700">{item.status}</span></div><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500"><span>Due: {formatDate(item.due_at, 'No due date')}</span><span>Created: {formatDate(item.created_at)}</span><span>{item.allow_retries ? 'Retries allowed' : 'One attempt'}</span></div><Link href={`/assignments/${encodeURIComponent(item.id)}/gradebook`} className="mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-emerald-200 px-4 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 focus:ring-2 focus:ring-emerald-500">Open Gradebook</Link></article>)}</div>}</section>
    </div></Shell>;
}

function formatDate(value: string | null, fallback = '') { return value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : fallback; }
function Shell({ children }: { children: React.ReactNode }) { return <main className="min-h-screen bg-slate-50 px-6 pb-16 pt-28"><div className="mx-auto max-w-6xl">{children}</div></main>; }
function Loading() { return <div className="flex min-h-[50vh] items-center justify-center gap-3 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" /> Loading assignments…</div>; }
function Gate({ title, href, label }: { title: string; href: string; label: string }) { return <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-9 text-center"><h1 className="text-2xl font-bold text-slate-900">{title}</h1><Link href={href} className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-emerald-600 px-5 font-semibold text-white">{label}</Link></div>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><CalendarDays className="mx-auto mb-3 h-10 w-10 text-emerald-600" /><h2 className="font-semibold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-600">{text}</p></div>; }
