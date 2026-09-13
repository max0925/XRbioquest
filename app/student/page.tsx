'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Loader2 } from 'lucide-react';
import { getStudentAssignmentAction } from '@/lib/assignments/gradebook';

type Attempt = { status: 'in_progress' | 'completed'; progress_percent: number; auto_score: number; max_score: number; teacher_feedback?: string | null; manual_adjustment?: number; final_score?: number };
type Assignment = { id: string; experience_id: string; title: string; className: string; instructions: string | null; due_at: string | null; allow_retries: boolean; attempt: Attempt | null };

export default function StudentPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classCount, setClassCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<'ready' | 'auth' | 'forbidden' | 'error'>('ready');

  useEffect(() => { void (async () => {
    try {
      const [assignmentResponse, classResponse] = await Promise.all([fetch('/api/assignments', { cache: 'no-store' }), fetch('/api/classes', { cache: 'no-store' })]);
      if (assignmentResponse.status === 401 || classResponse.status === 401) { setState('auth'); return; }
      const [assignmentBody, classBody] = await Promise.all([assignmentResponse.json().catch(() => ({})), classResponse.json().catch(() => ({}))]);
      if (assignmentResponse.status === 403 || classBody.role !== 'student') { setState('forbidden'); return; }
      if (!assignmentResponse.ok || !classResponse.ok) throw new Error('load failed');
      setAssignments(assignmentBody.assignments ?? []);
      setClassCount(classBody.classes?.length ?? 0);
    } catch { setState('error'); } finally { setLoading(false); }
  })(); }, []);

  return <main className="min-h-screen bg-slate-50 px-6 pb-16 pt-28"><div className="mx-auto max-w-5xl">
    <header className="mb-9"><p className="font-semibold text-emerald-700">STUDENT SPACE</p><h1 className="mt-2 text-4xl font-bold text-slate-900">My Learning</h1><p className="mt-2 text-slate-600">Your assigned BioQuest experiences, all in one place.</p></header>
    {loading ? <Loading /> : state === 'auth' ? <Gate title="Sign in to view your learning" href="/login?redirect=/student" label="Sign in" /> : state === 'forbidden' ? <Gate title="My Learning is for student accounts" href="/dashboard" label="Go to Teacher Dashboard" /> : state === 'error' ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">Could not load your assignments. Please refresh and try again.</div> : classCount === 0 ? <Gate title="Join your first class" href="/join" label="Join a class" /> : assignments.length === 0 ? <Empty /> : <AssignmentGrid assignments={assignments} />}
  </div></main>;
}

function AssignmentGrid({ assignments }: { assignments: Assignment[] }) {
  return <section aria-labelledby="my-assignments"><h2 id="my-assignments" className="mb-4 text-xl font-bold text-slate-900">My Assignments</h2><div className="grid gap-4 md:grid-cols-2">
    {assignments.map((item) => <AssignmentCard key={item.id} assignment={item} />)}
  </div></section>;
}

function AssignmentCard({ assignment: item }: { assignment: Assignment }) {
  const status = item.attempt?.status === 'completed' ? 'Completed' : item.attempt ? 'In progress' : 'Not started';
  const progress = item.attempt?.progress_percent ?? 0;
  const action = getStudentAssignmentAction(item.attempt?.status ?? 'not_started', item.allow_retries);
  return <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-emerald-700">{item.className}</p><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{status}</span></div>
    <h3 className="mt-2 text-xl font-bold text-slate-900">{item.title}</h3>
    <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{item.instructions || 'Open the experience and complete the activity.'}</p>
    <div className="mt-5"><div className="mb-1.5 flex justify-between text-xs font-medium text-slate-600"><span>{progress}% complete</span><span>{scoreLabel(item.attempt)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={`${item.title} completion`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full rounded-full bg-emerald-600 transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div></div>
    <p className="mt-4 text-sm font-medium text-slate-500">{item.due_at ? `Due ${new Date(item.due_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : 'No due date'}</p>
    {item.attempt?.teacher_feedback && <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900"><span className="font-semibold">Teacher feedback:</span> {item.attempt.teacher_feedback}</p>}
    {!action.enabled ? <p className="mt-5 rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800">{action.label}</p> : <Link href={`/play/${encodeURIComponent(item.experience_id)}?assignmentId=${encodeURIComponent(item.id)}`} className="mt-5 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 font-semibold text-white transition-colors duration-200 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">{action.label} <ArrowRight className="h-4 w-4" /></Link>}
  </article>;
}

function scoreLabel(attempt: Attempt | null) {
  if (!attempt || attempt.max_score <= 0) return 'Score pending';
  const score = attempt.final_score ?? attempt.auto_score + (attempt.manual_adjustment ?? 0);
  return `${score} / ${attempt.max_score} final score`;
}
function Loading() { return <div className="flex min-h-64 items-center justify-center gap-3 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" /> Loading your assignments…</div>; }
function Gate({ title, href, label }: { title: string; href: string; label: string }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><BookOpen className="mx-auto mb-3 h-10 w-10 text-emerald-600" /><h2 className="text-xl font-bold text-slate-900">{title}</h2><Link href={href} className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-emerald-600 px-5 font-semibold text-white">{label}</Link></div>; }
function Empty() { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><BookOpen className="mx-auto mb-3 h-10 w-10 text-emerald-600" /><h2 className="font-semibold text-slate-900">No assignments yet</h2><p className="mt-1 text-sm text-slate-600">You’re enrolled. Your teacher will add learning experiences here.</p></div>; }
