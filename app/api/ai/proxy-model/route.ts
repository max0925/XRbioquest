export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get('url');

  if (!raw) return new Response(JSON.stringify({ error: 'URL required' }), { status: 400 });

  const url = encodeURI(raw);

  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    // ✅ 转发二进制文件流，绕过前端 CORS
    return new Response(buffer, {
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Proxy failed for URL:', raw);
    return new Response(JSON.stringify({ error: 'Proxy failed' }), { status: 500 });
  }
}