export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const raw = searchParams.get('url');

  if (!raw) return new Response('URL required', { status: 400 });

  // ✅ 关键：把相对路径转成绝对 URL
  const absolute = raw.startsWith('http')
    ? raw
    : new URL(raw, origin).toString();

  let upstream: Response;
  try {
    upstream = await fetch(absolute);
  } catch (err) {
    console.error('[proxy-model] fetch failed', { raw, absolute, err });
    return new Response(
      JSON.stringify({ error: 'Proxy failed', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(text || `Upstream error ${upstream.status}`, {
      status: upstream.status,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  const buffer = await upstream.arrayBuffer();

  return new Response(buffer, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'model/gltf-binary',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
