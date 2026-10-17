import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { loadGradebook, reviewSubmission, type GradebookRequest } from '../lib/gradebook/client.ts';
import { parseGradebookSuccess, parseReviewRequest } from '../lib/gradebook/contract.ts';
import { parseDatabaseSubmission } from '../lib/gradebook/server.ts';

const emptySuccess = { ok: true, role: 'teacher', gradebook: { classes: [], assignments: [], submissions: [] } };
const submission = {
  attemptId: 'attempt-1', classId: 'class-1', className: 'Biology', assignmentId: 'assignment-1',
  assignmentTitle: 'Cell Quest', studentId: 'student-1', studentName: 'Student Alpha',
  submittedAt: '2026-09-30T12:00:00.000Z', status: 'submitted', autoScore: 8, maxScore: 10,
  manualAdjustment: 0, finalScore: 8, teacherFeedback: null, reviewedAt: null,
};

function response(status: number, body: unknown): GradebookRequest {
  return async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });
}

test('Gradebook contract accepts normal teacher and honest empty responses', () => {
  assert.deepEqual(parseGradebookSuccess(emptySuccess), emptySuccess.gradebook);
  const body = { ok: true, role: 'teacher', gradebook: { classes: [{ id: 'class-1', name: 'Biology' }], assignments: [{ id: 'assignment-1', classId: 'class-1', title: 'Cell Quest' }], submissions: [submission] } };
  assert.deepEqual(parseGradebookSuccess(body), body.gradebook);
});

test('Gradebook contract rejects malformed success data', () => {
  assert.equal(parseGradebookSuccess({ ...emptySuccess, gradebook: { ...emptySuccess.gradebook, submissions: [{ ...submission, status: 'completed' }] } }), null);
  assert.equal(parseGradebookSuccess({ ok: true, role: 'teacher', gradebook: { classes: [], assignments: [] } }), null);
});

test('review request enforces outcomes, feedback bounds, and revision feedback', () => {
  assert.deepEqual(parseReviewRequest({ action: 'reviewed', feedback: ' Good work. ' }), { action: 'reviewed', feedback: 'Good work.' });
  assert.deepEqual(parseReviewRequest({ action: 'reviewed', feedback: '' }), { action: 'reviewed', feedback: '' });
  assert.equal(parseReviewRequest({ action: 'needs_revision', feedback: '   ' }), null);
  assert.equal(parseReviewRequest({ action: 'approved', feedback: 'x' }), null);
  assert.equal(parseReviewRequest({ action: 'reviewed', feedback: 'x'.repeat(4001) }), null);
});

test('database rows are normalized without trusting unknown JSON', () => {
  assert.deepEqual(parseDatabaseSubmission({
    attempt_id: 'attempt-1', class_id: 'class-1', class_name: 'Biology', assignment_id: 'assignment-1',
    assignment_title: 'Cell Quest', student_id: 'student-1', student_name: 'Student Alpha',
    submitted_at: submission.submittedAt, attempt_status: 'submitted', auto_score: '8.00', max_score: 10,
    manual_adjustment: '0', final_score: '8', teacher_feedback: null, reviewed_at: null,
  }), submission);
  assert.equal(parseDatabaseSubmission({ attempt_id: 'attempt-1' }), null);
});

test('Gradebook client handles 401, 403, server errors, malformed JSON, and network failure', async () => {
  const signal = new AbortController().signal;
  const auth = await loadGradebook({ signal, request: response(401, { ok: false, error: { code: 'AUTH_REQUIRED', message: 'Sign in.' } }) });
  const forbidden = await loadGradebook({ signal, request: response(403, { ok: false, error: { code: 'TEACHER_ROLE_REQUIRED', message: 'Teachers only.' } }) });
  const unavailable = await loadGradebook({ signal, request: response(503, { ok: false, error: { code: 'GRADEBOOK_UNAVAILABLE', message: 'Try later.' } }) });
  const malformed = await loadGradebook({ signal, request: response(200, { ok: true, role: 'teacher', gradebook: {} }) });
  const network = await loadGradebook({ signal, request: async () => { throw new Error('private network detail'); } });
  assert.equal(auth.kind, 'auth'); assert.equal(forbidden.kind, 'forbidden');
  assert.equal(unavailable.kind, 'error'); assert.equal(malformed.kind, 'error'); assert.equal(network.kind, 'error');
  if (network.kind === 'error') assert.doesNotMatch(network.message, /private network detail/);
});

test('review client accepts a valid transition and rejects malformed API success', async () => {
  const signal = new AbortController().signal;
  const valid = await reviewSubmission({ attemptId: 'attempt-1', action: 'reviewed', feedback: 'Good work.', signal, request: response(200, { ok: true, review: { attemptId: 'attempt-1', status: 'reviewed', teacherFeedback: 'Good work.', reviewedAt: '2026-09-30T13:00:00.000Z', manualAdjustment: 0, finalScore: 8 } }) });
  const malformed = await reviewSubmission({ attemptId: 'attempt-1', action: 'reviewed', feedback: '', signal, request: response(200, { ok: true, review: { status: 'reviewed' } }) });
  assert.equal(valid.ok, true); assert.equal(malformed.ok, false);
});

test('server and RLS layers constrain Gradebook data to the authenticated teacher', async () => {
  const route = await readFile('app/api/gradebook/route.ts', 'utf8');
  const reviewRoute = await readFile('app/api/gradebook/[attemptId]/route.ts', 'utf8');
  const migration = await readFile('supabase/migrations/20260930000000_assignment_review_workflow.sql', 'utf8');
  assert.match(route, /getClassroomRole\(user\) !== 'teacher'/);
  assert.match(route, /\.eq\('teacher_id', user\.id\)/);
  assert.match(reviewRoute, /review_assignment_attempt/);
  assert.match(migration, /assignment\.teacher_id = auth\.uid\(\)/);
  assert.match(migration, /classroom\.teacher_id = auth\.uid\(\)/);
  assert.match(migration, /attempt\.student_id/);
  assert.match(migration, /attempt\.status = 'submitted'/);
  assert.match(migration, /REVIEW_ACCESS_DENIED/);
});
