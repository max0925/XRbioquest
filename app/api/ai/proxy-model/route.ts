export const runtime = 'nodejs';
export const maxDuration = 60; // GLB files can be large, allow up to 60s

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const raw = searchParams.get('url');

  if (!raw) return new Response('URL required', { status: 400 });

  const absolute = raw.startsWith('http')
    ? raw
    : new URL(raw, origin).toString();

  let upstream: Response;
  try {
    // Follow redirects (Meshy CDN may 302), set timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    upstream = await fetch(absolute, {
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (err: any) {
    console.error('[proxy-model] fetch failed', { raw, absolute, err: err.message });
    const status = err.name === 'AbortError' ? 504 : 500;
    return new Response(
      JSON.stringify({ error: 'Proxy failed', details: String(err) }),
      { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    console.error(`[proxy-model] upstream ${upstream.status}`, { url: absolute.substring(0, 80), body: text.substring(0, 200) });
    return new Response(text || `Upstream error ${upstream.status}`, {
      status: upstream.status,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Stream the response body instead of buffering entire GLB in memory
  const contentType = upstream.headers.get('content-type');
  const contentLength = upstream.headers.get('content-length');

  // Force correct MIME type for GLB — some CDNs return application/octet-stream
  const mime = (contentType && contentType.includes('gltf'))
    ? contentType
    : 'model/gltf-binary';

  const headers: Record<string, string> = {
    'Content-Type': mime,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=31536000, immutable',
  };

  if (contentLength) {
    headers['Content-Length'] = contentLength;
  }

  return new Response(upstream.body, { headers });
}
