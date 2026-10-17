import type { GradebookAssignment, GradebookClass, GradebookSubmission, ReviewApiResponse } from './contract.ts';
import { isReviewStatus } from './contract.ts';

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function text(value: unknown): string | null { return typeof value === 'string' ? value : null; }
function nullableText(value: unknown): string | null | undefined { return value === null ? null : typeof value === 'string' ? value : undefined; }
function numeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
  return null;
}

export function parseDatabaseClass(value: unknown): GradebookClass | null {
  const row = record(value); if (!row) return null;
  const id = text(row.id); const name = text(row.name);
  return id && name ? { id, name } : null;
}

export function parseDatabaseAssignment(value: unknown): GradebookAssignment | null {
  const row = record(value); if (!row) return null;
  const id = text(row.id); const classId = text(row.class_id); const title = text(row.title);
  return id && classId && title ? { id, classId, title } : null;
}

export function parseDatabaseSubmission(value: unknown): GradebookSubmission | null {
  const row = record(value); if (!row) return null;
  const attemptId = text(row.attempt_id); const classId = text(row.class_id); const className = text(row.class_name);
  const assignmentId = text(row.assignment_id); const assignmentTitle = text(row.assignment_title);
  const studentId = text(row.student_id); const studentName = text(row.student_name);
  const submittedAt = nullableText(row.submitted_at); const teacherFeedback = nullableText(row.teacher_feedback);
  const reviewedAt = nullableText(row.reviewed_at); const status = row.attempt_status;
  const autoScore = numeric(row.auto_score); const maxScore = numeric(row.max_score);
  const manualAdjustment = numeric(row.manual_adjustment); const finalScore = numeric(row.final_score);
  if (!attemptId || !classId || !className || !assignmentId || !assignmentTitle || !studentId || !studentName) return null;
  if (submittedAt === undefined || teacherFeedback === undefined || reviewedAt === undefined || !isReviewStatus(status)) return null;
  if (autoScore === null || maxScore === null || manualAdjustment === null || finalScore === null) return null;
  return { attemptId, classId, className, assignmentId, assignmentTitle, studentId, studentName,
    submittedAt, status, autoScore, maxScore, manualAdjustment, finalScore, teacherFeedback, reviewedAt };
}

export function parseDatabaseReview(value: unknown): Extract<ReviewApiResponse, { ok: true }>['review'] | null {
  const row = record(value); if (!row) return null;
  const attemptId = text(row.attempt_id); const status = row.attempt_status;
  const teacherFeedback = nullableText(row.teacher_feedback); const reviewedAt = nullableText(row.reviewed_at);
  const manualAdjustment = numeric(row.manual_adjustment); const finalScore = numeric(row.final_score);
  if (!attemptId || (status !== 'reviewed' && status !== 'needs_revision') || teacherFeedback === undefined || reviewedAt === undefined) return null;
  if (manualAdjustment === null || finalScore === null) return null;
  return { attemptId, status, teacherFeedback, reviewedAt, manualAdjustment, finalScore };
}

export function parseRows<T>(value: unknown, parser: (row: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null;
  const parsed: T[] = [];
  for (const row of value) { const item = parser(row); if (!item) return null; parsed.push(item); }
  return parsed;
}

export function validIdentifier(value: string | null): value is string {
  return value !== null && value.length > 0 && value.length <= 100 && /^[a-zA-Z0-9-]+$/.test(value);
}
