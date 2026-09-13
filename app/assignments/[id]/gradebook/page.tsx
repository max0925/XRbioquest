'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Download, Loader2, XCircle } from 'lucide-react';

type Status = 'not_started' | 'in_progress' | 'completed';
type StudentRow = {
  student_id: string; display_name: string; attempt_id: string | null; status: Status;
  started_at: string | null; last_activity_at: string | null; completed_at: string | null;
  duration_seconds: number | null; auto_score: number; max_score: number;
  manual_adjustment: number; final_score: number; teacher_feedback: string | null; attempt_count: number;
};
type Answer = {
  phase_id: string; phase_name: string; student_answer: string; is_correct: boolean | null;
  awarded_points: number | null; needs_review: boolean; manual_adjustment: number; teacher_feedback: string | null;
};
type AssignmentInfo = { id: string; title: string; className: string };

const filters: Array<{ value: 'all' | Status; label: string }> = [
  { value: 'all', label: 'All' }, { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' }, { value: 'completed', label: 'Completed' },
];

export default function GradebookPage() {
  const { id } = useParams<{ id: string }>();
  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<'ready' | 'auth' | 'forbidden' | 'error'>('ready');
  const [notice, setNotice] = useState<string | null>(null);

  const loadGradebook = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/assignments/${encodeURIComponent(id)}/gradebook`, { cache: 'no-store' });
      if (response.status === 401) { setState('auth'); return; }
      if (response.status === 403) { setState('forbidden'); return; }
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not load Gradebook.');
      setAssignment(body.assignment); setStudents(body.students ?? []); setState('ready');
    } catch { setState('error'); } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void loadGradebook(); }, [loadGradebook]);
  const visibleStudents = useMemo(() => filter === 'all' ? students : students.filter((student) => student.status === filter), [filter, students]);

  async function openStudent(student: StudentRow) {
    if (!student.attempt_id) return;
    setSelected(student); setDetailLoading(true); setNotice(null);
    try {
      const response = await fetch(`/api/assignments/${encodeURIComponent(id)}/gradebook/${encodeURIComponent(student.student_id)}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not load submission.');
      setAnswers(body.answers ?? []);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not load submission.'); }
    finally { setDetailLoading(false); }
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    setSaving(true); setNotice(null);
    try {
      const response = await fetch(`/api/assignments/${encodeURIComponent(id)}/gradebook/${encodeURIComponent(selected.student_id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualAdjustment: Number(form.get('adjustment')), teacherFeedback: String(form.get('feedback') ?? '') }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not save review.');
      setNotice('Teacher review saved.'); await loadGradebook();
      setSelected((current) => current ? { ...current, manual_adjustment: body.review.manual_adjustment, final_score: body.review.final_score, teacher_feedback: body.review.teacher_feedback } : current);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not save review.'); }
    finally { setSaving(false); }
  }

  if (loading) return <Shell><Loading label="Loading Gradebook…" /></Shell>;
  if (state === 'auth') return <Shell><Gate title="Sign in to view Gradebook" href={`/login?redirect=/assignments/${id}/gradebook`} label="Sign in" /></Shell>;
  if (state === 'forbidden') return <Shell><Gate title="You do not have access to this Gradebook" href="/assignments" label="Back to Assignments" /></Shell>;
  if (state === 'error' || !assignment) return <Shell><Gate title="Gradebook could not be loaded" href="/assignments" label="Back to Assignments" /></Shell>;

  return <Shell>
    <Link href="/assignments" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700"><ArrowLeft className="h-4 w-4" /> Assignments</Link>
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="font-semibold text-emerald-700">TEACHER SPACE</p><h1 className="mt-2 text-4xl font-bold text-slate-900">Gradebook</h1><p className="mt-2 text-slate-600">{assignment.title} · {assignment.className}</p></div><a href={`/api/assignments/${encodeURIComponent(id)}/gradebook/export`} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-emerald-500"><Download className="h-4 w-4" /> Export CSV</a></header>
    <div className="mb-5 flex flex-wrap gap-2" aria-label="Filter students by status">{filters.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={`min-h-11 cursor-pointer rounded-full px-4 text-sm font-semibold transition-colors ${filter === item.value ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{item.label}</button>)}</div>
    {students.length === 0 ? <Empty text="No students are enrolled in this class yet." /> : visibleStudents.length === 0 ? <Empty text="No students match this status." /> : <GradeTable students={visibleStudents} onSelect={openStudent} />}
    {selected && <DetailPanel student={selected} answers={answers} loading={detailLoading} saving={saving} notice={notice} onClose={() => { setSelected(null); setAnswers([]); setNotice(null); }} onSave={saveReview} />}
  </Shell>;
}

function GradeTable({ students, onSelect }: { students: StudentRow[]; onSelect: (student: StudentRow) => void }) {
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600"><tr>{['Student', 'Status', 'Last activity', 'Completed', 'Duration', 'Score', 'Attempts'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{students.map((student) => <tr key={student.student_id} className="hover:bg-slate-50"><td className="px-4 py-3"><button disabled={!student.attempt_id} onClick={() => onSelect(student)} className="min-h-11 cursor-pointer font-semibold text-slate-900 underline-offset-4 hover:text-emerald-700 hover:underline disabled:cursor-default disabled:no-underline">{student.display_name}</button></td><td className="px-4 py-3 capitalize">{student.status.replace('_', ' ')}</td><td className="px-4 py-3 text-slate-600">{formatDate(student.last_activity_at)}</td><td className="px-4 py-3 text-slate-600">{formatDate(student.completed_at)}</td><td className="px-4 py-3">{formatDuration(student.duration_seconds)}</td><td className="px-4 py-3"><span className="font-semibold">{student.final_score} / {student.max_score}</span>{student.manual_adjustment !== 0 && <span className="ml-2 text-xs text-slate-500">Auto {student.auto_score}; {signed(student.manual_adjustment)}</span>}</td><td className="px-4 py-3">{student.attempt_count}</td></tr>)}</tbody></table></div>;
}

function DetailPanel({ student, answers, loading, saving, notice, onClose, onSave }: { student: StudentRow; answers: Answer[]; loading: boolean; saving: boolean; notice: string | null; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  return <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="submission-heading"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-emerald-700">SUBMISSION DETAIL</p><h2 id="submission-heading" className="mt-1 text-2xl font-bold text-slate-900">{student.display_name}</h2><p className="mt-1 text-sm text-slate-600">Attempt {student.attempt_count} · Auto score {student.auto_score} / {student.max_score}</p></div><button onClick={onClose} aria-label="Close submission detail" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><XCircle className="h-5 w-5" /></button></div>
    {loading ? <Loading label="Loading submission…" /> : <div className="mt-6 space-y-3">{answers.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-slate-600">No quiz answers have been submitted for this attempt.</p> : answers.map((answer) => <article key={answer.phase_id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-semibold text-slate-900">{answer.phase_name}</h3><span className={`inline-flex items-center gap-1 text-sm font-semibold ${answer.needs_review ? 'text-amber-700' : answer.is_correct ? 'text-emerald-700' : 'text-red-700'}`}>{answer.needs_review ? 'Needs review' : answer.is_correct ? <><CheckCircle2 className="h-4 w-4" /> Correct</> : <><XCircle className="h-4 w-4" /> Incorrect</>}</span></div><p className="mt-2 text-sm text-slate-600">Answer: {answer.student_answer}</p><p className="mt-1 text-sm text-slate-600">Points: {answer.awarded_points ?? 'Needs review'}</p></article>)}</div>}
    <form onSubmit={onSave} className="mt-7 grid gap-4 border-t border-slate-200 pt-6 md:grid-cols-[180px_1fr_auto]"><label className="text-sm font-medium text-slate-700">Teacher adjustment<input name="adjustment" type="number" step="0.01" defaultValue={student.manual_adjustment} required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 focus:ring-2 focus:ring-emerald-500" /></label><label className="text-sm font-medium text-slate-700">Teacher feedback<textarea name="feedback" maxLength={4000} defaultValue={student.teacher_feedback ?? ''} rows={3} className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-emerald-500" /></label><button disabled={saving} className="min-h-11 cursor-pointer self-end rounded-lg bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">{saving ? 'Saving…' : 'Save review'}</button></form>{notice && <p role="status" className="mt-3 text-sm font-medium text-slate-700">{notice}</p>}
  </section>;
}

function formatDate(value: string | null) { return value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'; }
function formatDuration(value: number | null) { if (value === null) return '—'; const minutes = Math.floor(value / 60); return minutes ? `${minutes}m ${value % 60}s` : `${value}s`; }
function signed(value: number) { return value > 0 ? `+${value}` : String(value); }
function Shell({ children }: { children: React.ReactNode }) { return <main className="min-h-screen bg-slate-50 px-5 pb-16 pt-28"><div className="mx-auto max-w-7xl">{children}</div></main>; }
function Loading({ label }: { label: string }) { return <div className="flex min-h-48 items-center justify-center gap-3 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" /> {label}</div>; }
function Gate({ title, href, label }: { title: string; href: string; label: string }) { return <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-9 text-center"><h1 className="text-2xl font-bold text-slate-900">{title}</h1><Link href={href} className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-emerald-600 px-5 font-semibold text-white">{label}</Link></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-600">{text}</div>; }
