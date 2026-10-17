export function parseReview(value: unknown): { manualAdjustment: number; teacherFeedback: string } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (typeof body.manualAdjustment !== 'number' || !Number.isFinite(body.manualAdjustment) || Math.abs(body.manualAdjustment) > 10_000) return null;
  if (typeof body.teacherFeedback !== 'string' || body.teacherFeedback.length > 4_000) return null;
  return { manualAdjustment: body.manualAdjustment, teacherFeedback: body.teacherFeedback.trim() };
}

export function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${text.replaceAll('"', '""')}"`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

export type StudentAssignmentStatus = 'not_started' | 'in_progress' | 'submitted' | 'needs_revision' | 'reviewed';

export function getStudentAssignmentAction(status: StudentAssignmentStatus, allowRetries: boolean) {
  if (status === 'submitted') return { enabled: false, label: 'Submitted · Awaiting review' };
  if (status === 'reviewed' && !allowRetries) return { enabled: false, label: 'Reviewed · Retries disabled' };
  if (status === 'in_progress') return { enabled: true, label: 'Resume experience' };
  if (status === 'needs_revision') return { enabled: true, label: 'Revise submission' };
  if (status === 'reviewed') return { enabled: true, label: 'Try again' };
  return { enabled: true, label: 'Start experience' };
}
