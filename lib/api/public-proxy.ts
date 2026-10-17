import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { NextRequest } from 'next/server';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 120;
const MAX_URL_LENGTH = 4_096;
const MAX_RESPONSE_BYTES = 100 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const buckets = new Map<string, { count: number; resetAt: number }>();

function clientId(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function consumeRateLimit(request: NextRequest): boolean {
  const key = clientId(request);
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_REQUESTS_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

export function isPrivateAddress(address: string): boolean {
  if (address === '::1' || address === '::' || address.startsWith('fe80:') || address.startsWith('fc') || address.startsWith('fd')) {
    return true;
  }
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127);
  }
  return false;
}

async function validateTarget(raw: string, allowedHosts: ReadonlySet<string>): Promise<URL | null> {
  if (!raw || raw.length > MAX_URL_LENGTH) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  const hostname = url.hostname.toLowerCase();
  if (!allowedHosts.has(hostname) || hostname === 'localhost' || isIP(hostname)) return null;

  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) return null;
  } catch {
    return null;
  }
  return url;
}

async function fetchApprovedTarget(url: URL, allowedHosts: ReadonlySet<string>, method: 'GET' | 'HEAD') {
  let current = url;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetch(current, {
      method,
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    if (redirects === MAX_REDIRECTS) throw new Error('Too many redirects');
    const location = response.headers.get('location');
    if (!location) throw new Error('Invalid redirect');
    const redirected = await validateTarget(new URL(location, current).toString(), allowedHosts);
    if (!redirected) throw new Error('Redirect target is not allowed');
    current = redirected;
  }
  throw new Error('Too many redirects');
}

function limitStream(body: ReadableStream<Uint8Array> | null): ReadableStream<Uint8Array> | null {
  if (!body) return null;
  let received = 0;
  return body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      received += chunk.byteLength;
      if (received > MAX_RESPONSE_BYTES) {
        controller.error(new Error('Upstream asset is too large'));
        return;
      }
      controller.enqueue(chunk);
    },
  }));
}

export async function proxyPublicAsset(request: NextRequest, allowedHostnames: readonly string[]) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  if (!consumeRateLimit(request)) {
    return new Response('Too many requests', { status: 429, headers: { 'Retry-After': '60' } });
  }

  const raw = request.nextUrl.searchParams.get('url') || '';
  const allowedHosts = new Set(allowedHostnames.map((host) => host.toLowerCase()));
  const target = await validateTarget(raw, allowedHosts);
  if (!target) return new Response('URL is not allowed', { status: 403 });

  try {
    const upstream = await fetchApprovedTarget(target, allowedHosts, request.method as 'GET' | 'HEAD');
    if (!upstream.ok) return new Response('Upstream request failed', { status: upstream.status });

    const contentLength = Number(upstream.headers.get('content-length') || 0);
    if (contentLength > MAX_RESPONSE_BYTES) {
      upstream.body?.cancel();
      return new Response('Upstream asset is too large', { status: 413 });
    }

    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    });
    const contentType = upstream.headers.get('content-type');
    if (contentType) headers.set('Content-Type', contentType);
    if (contentLength) headers.set('Content-Length', String(contentLength));

    return new Response(request.method === 'HEAD' ? null : limitStream(upstream.body), {
      status: upstream.status,
      headers,
    });
  } catch {
    return new Response('Proxy request failed', { status: 502 });
  }
}
