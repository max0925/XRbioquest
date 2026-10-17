export const DASHBOARD_ENDPOINT = '/api/dashboard';

export type DashboardOverview = {
  classCount: number;
  totalStudents: number;
  activeAssignments: number;
  needsReview: number;
};

export type DashboardAssignment = {
  id: string;
  title: string;
  className: string;
  dueAt: string | null;
  status: string;
  completedCount: number;
  studentCount: number;
  completionRate: number;
};

export type DashboardExperience = {
  id: string;
  title: string;
  visibility: 'draft' | 'published';
  updatedAt: string;
};

export type DashboardData = {
  overview: DashboardOverview;
  recentAssignments: DashboardAssignment[];
  recentExperiences: DashboardExperience[];
};

export type DashboardSuccessResponse = {
  ok: true;
  role: 'teacher';
  dashboard: DashboardData;
};

export type DashboardErrorCode =
  | 'AUTH_REQUIRED'
  | 'ROLE_REQUIRED'
  | 'TEACHER_ROLE_REQUIRED'
  | 'DASHBOARD_UNAVAILABLE';

export type DashboardErrorResponse = {
  ok: false;
  error: {
    code: DashboardErrorCode;
    message: string;
  };
  redirect?: '/student';
};

export type DashboardApiResponse = DashboardSuccessResponse | DashboardErrorResponse;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function parseOverview(value: unknown): DashboardOverview | null {
  if (!isRecord(value)) return null;
  const { classCount, totalStudents, activeAssignments, needsReview } = value;
  if (!isNonNegativeNumber(classCount) || !isNonNegativeNumber(totalStudents) || !isNonNegativeNumber(activeAssignments) || !isNonNegativeNumber(needsReview)) return null;
  return { classCount, totalStudents, activeAssignments, needsReview };
}

function parseAssignment(value: unknown): DashboardAssignment | null {
  if (!isRecord(value)) return null;
  const { id, title, className, dueAt, status, completedCount, studentCount, completionRate } = value;
  if (!isString(id) || !isString(title) || !isString(className) || !isNullableString(dueAt) || !isString(status)) return null;
  if (!isNonNegativeNumber(completedCount) || !isNonNegativeNumber(studentCount) || !isNonNegativeNumber(completionRate)) return null;
  return { id, title, className, dueAt, status, completedCount, studentCount, completionRate };
}

function parseExperience(value: unknown): DashboardExperience | null {
  if (!isRecord(value)) return null;
  const { id, title, visibility, updatedAt } = value;
  if (!isString(id) || !isString(title) || !isString(updatedAt)) return null;
  if (visibility !== 'draft' && visibility !== 'published') return null;
  return { id, title, visibility, updatedAt };
}

function parseArray<T>(value: unknown, parser: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null;
  const parsed: T[] = [];
  for (const item of value) {
    const result = parser(item);
    if (!result) return null;
    parsed.push(result);
  }
  return parsed;
}

export function parseDashboardSuccess(value: unknown): DashboardSuccessResponse | null {
  if (!isRecord(value) || value.ok !== true || value.role !== 'teacher' || !isRecord(value.dashboard)) return null;
  const overview = parseOverview(value.dashboard.overview);
  const recentAssignments = parseArray(value.dashboard.recentAssignments, parseAssignment);
  const recentExperiences = parseArray(value.dashboard.recentExperiences, parseExperience);
  if (!overview || !recentAssignments || !recentExperiences) return null;
  return { ok: true, role: 'teacher', dashboard: { overview, recentAssignments, recentExperiences } };
}

const DASHBOARD_ERROR_CODES = new Set<DashboardErrorCode>([
  'AUTH_REQUIRED',
  'ROLE_REQUIRED',
  'TEACHER_ROLE_REQUIRED',
  'DASHBOARD_UNAVAILABLE',
]);

export function parseDashboardError(value: unknown): DashboardErrorResponse | null {
  if (!isRecord(value) || value.ok !== false || !isRecord(value.error)) return null;
  const { code, message } = value.error;
  if (!isString(code) || !DASHBOARD_ERROR_CODES.has(code as DashboardErrorCode) || !isString(message)) return null;
  if (value.redirect !== undefined && value.redirect !== '/student') return null;
  return {
    ok: false,
    error: { code: code as DashboardErrorCode, message },
    ...(value.redirect === '/student' ? { redirect: '/student' as const } : {}),
  };
}
