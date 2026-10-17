export const GRADEBOOK_ENDPOINT = '/api/gradebook';

export const REVIEW_STATUSES = ['in_progress', 'submitted', 'needs_revision', 'reviewed'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type ReviewOutcome = 'reviewed' | 'needs_revision';

export type GradebookClass = { id: string; name: string };
export type GradebookAssignment = { id: string; classId: string; title: string };
export type GradebookSubmission = {
  attemptId: string;
  classId: string;
  className: string;
  assignmentId: string;
  assignmentTitle: string;
  studentId: string;
  studentName: string;
  submittedAt: string | null;
  status: ReviewStatus;
  autoScore: number;
  maxScore: number;
  manualAdjustment: number;
  finalScore: number;
  teacherFeedback: string | null;
  reviewedAt: string | null;
};

export type GradebookData = {
  classes: GradebookClass[];
  assignments: GradebookAssignment[];
  submissions: GradebookSubmission[];
};

export type GradebookErrorCode =
  | 'AUTH_REQUIRED'
  | 'TEACHER_ROLE_REQUIRED'
  | 'INVALID_FILTER'
  | 'INVALID_REQUEST'
  | 'REVIEW_FORBIDDEN'
  | 'GRADEBOOK_UNAVAILABLE';

export type GradebookApiResponse =
  | { ok: true; role: 'teacher'; gradebook: GradebookData }
  | { ok: false; error: { code: GradebookErrorCode; message: string } };

export type ReviewApiResponse =
  | { ok: true; review: Pick<GradebookSubmission, 'attemptId' | 'status' | 'teacherFeedback' | 'reviewedAt' | 'manualAdjustment' | 'finalScore'> }
  | { ok: false; error: { code: GradebookErrorCode; message: string } };

export type GradebookFilters = { classId?: string; assignmentId?: string; status?: ReviewStatus };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string { return typeof value === 'string'; }
function isNullableString(value: unknown): value is string | null { return value === null || isString(value); }
function isNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
export function isReviewStatus(value: unknown): value is ReviewStatus {
  return typeof value === 'string' && REVIEW_STATUSES.some((status) => status === value);
}

function parseClass(value: unknown): GradebookClass | null {
  if (!isRecord(value) || !isString(value.id) || !isString(value.name)) return null;
  return { id: value.id, name: value.name };
}

function parseAssignment(value: unknown): GradebookAssignment | null {
  if (!isRecord(value) || !isString(value.id) || !isString(value.classId) || !isString(value.title)) return null;
  return { id: value.id, classId: value.classId, title: value.title };
}

function parseSubmission(value: unknown): GradebookSubmission | null {
  if (!isRecord(value)) return null;
  const { attemptId, classId, className, assignmentId, assignmentTitle, studentId, studentName,
    submittedAt, status, autoScore, maxScore, manualAdjustment, finalScore, teacherFeedback, reviewedAt } = value;
  if (![attemptId, classId, className, assignmentId, assignmentTitle, studentId, studentName].every(isString)) return null;
  if (!isNullableString(submittedAt) || !isReviewStatus(status) || !isNullableString(teacherFeedback) || !isNullableString(reviewedAt)) return null;
  if (![autoScore, maxScore, manualAdjustment, finalScore].every(isNumber)) return null;
  return {
    attemptId: attemptId as string, classId: classId as string, className: className as string,
    assignmentId: assignmentId as string, assignmentTitle: assignmentTitle as string,
    studentId: studentId as string, studentName: studentName as string, submittedAt, status,
    autoScore: autoScore as number, maxScore: maxScore as number,
    manualAdjustment: manualAdjustment as number, finalScore: finalScore as number,
    teacherFeedback, reviewedAt,
  };
}

function parseArray<T>(value: unknown, parse: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null;
  const result: T[] = [];
  for (const item of value) { const parsed = parse(item); if (!parsed) return null; result.push(parsed); }
  return result;
}

export function parseGradebookSuccess(value: unknown): GradebookData | null {
  if (!isRecord(value) || value.ok !== true || value.role !== 'teacher' || !isRecord(value.gradebook)) return null;
  const classes = parseArray(value.gradebook.classes, parseClass);
  const assignments = parseArray(value.gradebook.assignments, parseAssignment);
  const submissions = parseArray(value.gradebook.submissions, parseSubmission);
  return classes && assignments && submissions ? { classes, assignments, submissions } : null;
}

const ERROR_CODES = new Set<GradebookErrorCode>([
  'AUTH_REQUIRED', 'TEACHER_ROLE_REQUIRED', 'INVALID_FILTER', 'INVALID_REQUEST',
  'REVIEW_FORBIDDEN', 'GRADEBOOK_UNAVAILABLE',
]);

export function parseGradebookError(value: unknown): { code: GradebookErrorCode; message: string } | null {
  if (!isRecord(value) || value.ok !== false || !isRecord(value.error)) return null;
  if (!isString(value.error.code) || !ERROR_CODES.has(value.error.code as GradebookErrorCode) || !isString(value.error.message)) return null;
  return { code: value.error.code as GradebookErrorCode, message: value.error.message };
}

export function parseReviewRequest(value: unknown): { action: ReviewOutcome; feedback: string } | null {
  if (!isRecord(value) || (value.action !== 'reviewed' && value.action !== 'needs_revision') || typeof value.feedback !== 'string') return null;
  const feedback = value.feedback.trim();
  if (feedback.length > 4000 || (value.action === 'needs_revision' && feedback.length === 0)) return null;
  return { action: value.action, feedback };
}

export function parseReviewSuccess(value: unknown): Extract<ReviewApiResponse, { ok: true }>['review'] | null {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.review)) return null;
  const review = parseSubmission({
    attemptId: value.review.attemptId, classId: '', className: '', assignmentId: '', assignmentTitle: '',
    studentId: '', studentName: '', submittedAt: null, status: value.review.status,
    autoScore: 0, maxScore: 0, manualAdjustment: value.review.manualAdjustment,
    finalScore: value.review.finalScore, teacherFeedback: value.review.teacherFeedback, reviewedAt: value.review.reviewedAt,
  });
  if (!review || (review.status !== 'reviewed' && review.status !== 'needs_revision')) return null;
  return { attemptId: review.attemptId, status: review.status, teacherFeedback: review.teacherFeedback,
    reviewedAt: review.reviewedAt, manualAdjustment: review.manualAdjustment, finalScore: review.finalScore };
}
