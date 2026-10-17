import {
  GRADEBOOK_ENDPOINT, type GradebookData, type GradebookFilters, type ReviewOutcome,
  parseGradebookError, parseGradebookSuccess, parseReviewSuccess,
} from './contract.ts';

type HttpResponse = { ok: boolean; status: number; json: () => Promise<unknown> };
export type GradebookRequest = (endpoint: string, init: RequestInit) => Promise<HttpResponse>;
export type GradebookLoadResult =
  | { kind: 'ready'; data: GradebookData }
  | { kind: 'auth' | 'forbidden' | 'error'; message: string; status: number | null; code: string };

const fallback = 'The Gradebook could not be loaded. Please try again.';
const requestDefault: GradebookRequest = (endpoint, init) => fetch(endpoint, init);

function endpointFor(filters: GradebookFilters) {
  const params = new URLSearchParams();
  if (filters.classId) params.set('classId', filters.classId);
  if (filters.assignmentId) params.set('assignmentId', filters.assignmentId);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return query ? `${GRADEBOOK_ENDPOINT}?${query}` : GRADEBOOK_ENDPOINT;
}

export async function loadGradebook(options: { signal: AbortSignal; filters?: GradebookFilters; request?: GradebookRequest }): Promise<GradebookLoadResult> {
  const request = options.request ?? requestDefault;
  try {
    const response = await request(endpointFor(options.filters ?? {}), { cache: 'no-store', signal: options.signal });
    const body = await response.json().catch(() => null);
    if (response.ok) {
      const data = parseGradebookSuccess(body);
      return data ? { kind: 'ready', data } : { kind: 'error', message: fallback, status: response.status, code: 'INVALID_RESPONSE' };
    }
    const error = parseGradebookError(body);
    const result = { message: error?.message ?? fallback, status: response.status, code: error?.code ?? 'HTTP_ERROR' };
    if (response.status === 401) return { kind: 'auth', ...result };
    if (response.status === 403) return { kind: 'forbidden', ...result };
    return { kind: 'error', ...result };
  } catch (error) {
    if (options.signal.aborted || isAbortError(error)) throw error;
    return { kind: 'error', message: fallback, status: null, code: 'NETWORK_ERROR' };
  }
}

export async function reviewSubmission(options: { attemptId: string; action: ReviewOutcome; feedback: string; signal: AbortSignal; request?: GradebookRequest }) {
  const request = options.request ?? requestDefault;
  try {
    const response = await request(`${GRADEBOOK_ENDPOINT}/${encodeURIComponent(options.attemptId)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, signal: options.signal,
      body: JSON.stringify({ action: options.action, feedback: options.feedback }),
    });
    const body = await response.json().catch(() => null);
    if (response.ok) {
      const review = parseReviewSuccess(body);
      return review ? { ok: true as const, review } : { ok: false as const, message: 'The server returned an invalid review response.', status: response.status };
    }
    const error = parseGradebookError(body);
    return { ok: false as const, message: error?.message ?? 'The review could not be saved.', status: response.status };
  } catch (error) {
    if (options.signal.aborted || isAbortError(error)) throw error;
    return { ok: false as const, message: 'The review could not be saved. Check your connection and try again.', status: null };
  }
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException ? error.name === 'AbortError' : error instanceof Error && error.name === 'AbortError';
}
