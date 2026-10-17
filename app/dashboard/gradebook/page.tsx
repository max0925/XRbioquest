'use client';

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, CheckCircle2, ClipboardCheck, Loader2, RotateCcw } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { isAbortError, loadGradebook, reviewSubmission } from '@/lib/gradebook/client';
import type { GradebookData, GradebookFilters, GradebookSubmission, ReviewOutcome, ReviewStatus } from '@/lib/gradebook/contract';

type PageState = 'loading' | 'ready' | 'auth' | 'forbidden' | 'error';
const statuses: Array<{ value: '' | ReviewStatus; label: string }> = [
  { value: '', label: 'All statuses' }, { value: 'submitted', label: 'Needs review' },
  { value: 'reviewed', label: 'Reviewed' }, { value: 'needs_revision', label: 'Needs revision' },
  { value: 'in_progress', label: 'In progress' },
];

export default function TeacherGradebookPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-50 px-5 pt-28"><Loading/></div>}><GradebookContent/></Suspense>;
}

function GradebookContent() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<GradebookFilters>(() => {
    return searchParams.get('status') === 'submitted' ? { status: 'submitted' } : {};
  });
  const [data, setData] = useState<GradebookData | null>(null);
  const [state, setState] = useState<PageState>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<GradebookSubmission | null>(null);

  const load = useCallback((signal: AbortSignal) => loadGradebook({ signal, filters }), [filters]);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.kind === 'ready') { setData(result.data); setState('ready'); return; }
      setMessage(result.message); setState(result.kind);
      if (process.env.NODE_ENV === 'development' && result.kind === 'error') {
        console.warn('[GRADEBOOK] Request failed', { endpoint: '/api/gradebook', status: result.status, code: result.code });
      }
    }).catch((error: unknown) => {
      if (controller.signal.aborted || isAbortError(error)) return;
      setMessage('The Gradebook could not be loaded. Please try again.'); setState('error');
    });
    return () => controller.abort();
  }, [load, retry]);

  function changeFilter(key: keyof GradebookFilters, value: string) {
    setSelected(null); setState('loading'); setMessage(null);
    setFilters((current) => {
      const next = { ...current, [key]: value || undefined };
      if (key === 'classId' && current.assignmentId) next.assignmentId = undefined;
      return next;
    });
  }

  const assignments = useMemo(() => data?.assignments.filter((item) => !filters.classId || item.classId === filters.classId) ?? [], [data, filters.classId]);
  const reload = () => { setState('loading'); setMessage(null); setRetry((value) => value + 1); };

  return <div className="min-h-screen bg-slate-50"><Navigation/><main className="px-5 pb-16 pt-28 sm:px-6"><div className="mx-auto max-w-7xl">
    <Link href="/dashboard" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-800"><ArrowLeft className="h-4 w-4"/>Dashboard</Link>
    <header className="mb-8"><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Teacher workspace</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Gradebook</h1><p className="mt-2 max-w-2xl text-slate-600">Review student submissions across your classes and return focused feedback.</p></header>
    {state === 'auth' ? <Gate title="Sign in to view the Gradebook" message={message} href="/login?redirect=/dashboard/gradebook" label="Sign in"/>
      : state === 'forbidden' ? <Gate title="Teacher access required" message={message} href="/student" label="Go to My Learning"/>
      : state === 'error' ? <ErrorState message={message} onRetry={reload}/>
      : <>
        <Filters data={data} assignments={assignments} filters={filters} disabled={state === 'loading'} onChange={changeFilter}/>
        {state === 'loading' ? <Loading/> : data && <SubmissionList submissions={data.submissions} onSelect={setSelected}/>}
      </>}
    {selected && <ReviewPanel submission={selected} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); reload(); }}/>}
  </div></main></div>;
}

function Filters({ data, assignments, filters, disabled, onChange }: { data: GradebookData | null; assignments: GradebookData['assignments']; filters: GradebookFilters; disabled: boolean; onChange: (key: keyof GradebookFilters, value: string) => void }) {
  return <section aria-label="Gradebook filters" className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="grid gap-4 md:grid-cols-3">
      <Filter label="Class" value={filters.classId ?? ''} disabled={disabled} onChange={(value) => onChange('classId', value)} options={[{ value: '', label: 'All classes' }, ...(data?.classes.map((item) => ({ value: item.id, label: item.name })) ?? [])]}/>
      <Filter label="Assignment" value={filters.assignmentId ?? ''} disabled={disabled} onChange={(value) => onChange('assignmentId', value)} options={[{ value: '', label: 'All assignments' }, ...assignments.map((item) => ({ value: item.id, label: item.title }))]}/>
      <Filter label="Review status" value={filters.status ?? ''} disabled={disabled} onChange={(value) => onChange('status', value)} options={statuses}/>
    </div>
    <button type="button" onClick={() => onChange('status', 'submitted')} aria-pressed={filters.status === 'submitted'} disabled={disabled} className={`mt-4 min-h-11 rounded-lg px-4 text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 ${filters.status === 'submitted' ? 'bg-amber-600 text-white' : 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'}`}>Needs review</button>
  </section>;
}

function Filter({ label, value, disabled, options, onChange }: { label: string; value: string; disabled: boolean; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <label className="text-sm font-bold text-slate-700">{label}<select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function SubmissionList({ submissions, onSelect }: { submissions: GradebookSubmission[]; onSelect: (submission: GradebookSubmission) => void }) {
  if (submissions.length === 0) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><ClipboardCheck className="mx-auto h-10 w-10 text-emerald-700"/><h2 className="mt-3 text-xl font-bold text-slate-950">No submissions match these filters</h2><p className="mt-2 text-slate-600">Empty classes and assignments with no submissions are normal. Try another filter when students submit work.</p></div>;
  return <section aria-labelledby="submissions-heading"><div className="mb-3 flex items-center justify-between"><h2 id="submissions-heading" className="text-xl font-bold text-slate-950">Submissions</h2><p className="text-sm text-slate-500">{submissions.length} result{submissions.length === 1 ? '' : 's'}</p></div>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600"><tr>{['Student','Class','Assignment','Submitted','Status','Score','Feedback','Action'].map((heading) => <th key={heading} scope="col" className="px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{submissions.map((item) => <tr key={item.attemptId} className="hover:bg-slate-50"><td className="px-4 py-4 font-bold text-slate-950">{item.studentName}</td><td className="px-4 py-4 text-slate-600">{item.className}</td><td className="px-4 py-4 text-slate-700">{item.assignmentTitle}</td><td className="px-4 py-4 text-slate-600">{formatDate(item.submittedAt)}</td><td className="px-4 py-4"><StatusBadge status={item.status}/></td><td className="px-4 py-4 tabular-nums text-slate-700">{item.finalScore} / {item.maxScore}</td><td className="max-w-56 truncate px-4 py-4 text-slate-600">{item.teacherFeedback || '—'}</td><td className="px-4 py-4">{item.status === 'submitted' ? <button type="button" onClick={() => onSelect(item)} className="min-h-11 rounded-lg bg-emerald-700 px-4 font-bold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2">Review</button> : <span className="text-xs font-medium text-slate-500">No action needed</span>}</td></tr>)}</tbody></table></div>
  </section>;
}

function ReviewPanel({ submission, onClose, onSaved }: { submission: GradebookSubmission; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState<ReviewOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  useEffect(() => () => controller?.abort(), [controller]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const action = submitter instanceof HTMLButtonElement ? submitter.value : '';
    if (action !== 'reviewed' && action !== 'needs_revision') return;
    const form = new FormData(event.currentTarget); const feedback = String(form.get('feedback') ?? '');
    const nextController = new AbortController(); setController(nextController); setSaving(action); setError(null);
    const result = await reviewSubmission({ attemptId: submission.attemptId, action, feedback, signal: nextController.signal }).catch((caught: unknown) => {
      if (isAbortError(caught)) return null; return { ok: false as const, message: 'The review could not be saved.', status: null };
    });
    if (!result) return;
    setSaving(null); if (result.ok) onSaved(); else setError(result.message);
  }

  return <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/50 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="review-heading"><div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Submission review</p><h2 id="review-heading" className="mt-1 text-2xl font-bold text-slate-950">{submission.studentName}</h2><p className="mt-1 text-sm text-slate-600">{submission.assignmentTitle} · {submission.className}</p></div><button type="button" onClick={onClose} disabled={saving !== null} className="min-h-11 rounded-lg px-3 font-bold text-slate-600 hover:bg-slate-100">Close</button></div>
    <dl className="mt-6 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3"><div><dt className="text-xs font-bold uppercase text-slate-500">Submitted</dt><dd className="mt-1 text-sm text-slate-900">{formatDate(submission.submittedAt)}</dd></div><div><dt className="text-xs font-bold uppercase text-slate-500">Auto score</dt><dd className="mt-1 text-sm text-slate-900">{submission.autoScore} / {submission.maxScore}</dd></div><div><dt className="text-xs font-bold uppercase text-slate-500">Adjustment</dt><dd className="mt-1 text-sm text-slate-900">{submission.manualAdjustment}</dd></div></dl>
    <form className="mt-6" onSubmit={(event) => void submit(event)}><label className="text-sm font-bold text-slate-700">Feedback<textarea name="feedback" maxLength={4000} defaultValue={submission.teacherFeedback ?? ''} rows={5} placeholder="Add concise, actionable feedback. Feedback is required when requesting changes." className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"/></label>{error && <p role="alert" className="mt-3 flex gap-2 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800"><AlertCircle className="h-5 w-5 shrink-0"/>{error}</p>}<div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="submit" name="action" value="needs_revision" disabled={saving !== null} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-amber-400 bg-amber-50 px-4 font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-60"><RotateCcw className="h-4 w-4"/>{saving === 'needs_revision' ? 'Saving…' : 'Request changes'}</button><button type="submit" name="action" value="reviewed" disabled={saving !== null} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 font-bold text-white hover:bg-emerald-800 disabled:opacity-60">{saving === 'reviewed' ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="h-4 w-4"/>}{saving === 'reviewed' ? 'Saving…' : 'Mark reviewed'}</button></div></form>
  </div></div>;
}

function StatusBadge({ status }: { status: ReviewStatus }) { const styles = { in_progress: 'bg-blue-50 text-blue-800', submitted: 'bg-amber-100 text-amber-900', needs_revision: 'bg-orange-100 text-orange-900', reviewed: 'bg-emerald-50 text-emerald-800' }; const labels = { in_progress: 'In progress', submitted: 'Needs review', needs_revision: 'Needs revision', reviewed: 'Reviewed' }; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[status]}`}>{labels[status]}</span>; }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not submitted'; }
function Loading() { return <div className="flex min-h-64 items-center justify-center gap-3 text-slate-600" role="status"><Loader2 className="h-5 w-5 animate-spin"/>Loading Gradebook…</div>; }
function Gate({ title, message, href, label }: { title: string; message: string | null; href: string; label: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"><ClipboardCheck className="mx-auto h-10 w-10 text-emerald-700"/><h2 className="mt-4 text-xl font-bold text-slate-950">{title}</h2><p className="mx-auto mt-2 max-w-lg text-slate-600">{message}</p><Link href={href} className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-5 font-bold text-white">{label}</Link></div>; }
function ErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) { return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6"><h2 className="font-bold text-red-900">Could not load the Gradebook</h2><p className="mt-1 text-sm text-red-800">{message ?? 'Please try again.'}</p><button type="button" onClick={onRetry} className="mt-5 min-h-11 rounded-lg bg-red-800 px-4 text-sm font-bold text-white">Try again</button></div>; }
