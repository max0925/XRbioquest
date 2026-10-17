import {
  DASHBOARD_ENDPOINT,
  type DashboardData,
  parseDashboardError,
  parseDashboardSuccess,
} from './contract.ts';

type DashboardHttpResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

export type DashboardRequest = (
  endpoint: string,
  init: { cache: 'no-store'; signal: AbortSignal },
) => Promise<DashboardHttpResponse>;

export type DashboardDiagnostic = {
  endpoint: typeof DASHBOARD_ENDPOINT;
  status: number | null;
  code: string;
  message: string;
};

export type DashboardLoadResult =
  | { kind: 'ready'; data: DashboardData }
  | { kind: 'auth'; message: string }
  | { kind: 'forbidden'; message: string; redirect?: '/student' }
  | { kind: 'error'; message: string; diagnostic: DashboardDiagnostic };

const DEFAULT_ERROR_MESSAGE = 'The dashboard could not be loaded. Please try again.';

function errorResult(status: number | null, code: string, message = DEFAULT_ERROR_MESSAGE): DashboardLoadResult {
  return {
    kind: 'error',
    message,
    diagnostic: { endpoint: DASHBOARD_ENDPOINT, status, code, message },
  };
}

async function defaultRequest(endpoint: string, init: { cache: 'no-store'; signal: AbortSignal }) {
  return fetch(endpoint, init);
}

export async function loadTeacherDashboard(options: {
  signal: AbortSignal;
  request?: DashboardRequest;
}): Promise<DashboardLoadResult> {
  const request = options.request ?? defaultRequest;
  let response: DashboardHttpResponse;

  try {
    response = await request(DASHBOARD_ENDPOINT, { cache: 'no-store', signal: options.signal });
  } catch (error) {
    if (options.signal.aborted || isAbortError(error)) throw error;
    return errorResult(null, 'NETWORK_ERROR');
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Invalid or empty JSON is handled as a response-contract failure below.
  }

  const apiError = parseDashboardError(body);
  if (response.status === 401) {
    return { kind: 'auth', message: apiError?.error.message ?? 'Sign in to view your teacher dashboard.' };
  }
  if (response.status === 403) {
    return {
      kind: 'forbidden',
      message: apiError?.error.message ?? 'This account does not have teacher access.',
      ...(apiError?.redirect === '/student' ? { redirect: '/student' as const } : {}),
    };
  }
  if (!response.ok) {
    return errorResult(
      response.status,
      apiError?.error.code ?? 'HTTP_ERROR',
      apiError?.error.message ?? DEFAULT_ERROR_MESSAGE,
    );
  }

  const success = parseDashboardSuccess(body);
  if (!success) return errorResult(response.status, 'INVALID_RESPONSE');
  return { kind: 'ready', data: success.dashboard };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
