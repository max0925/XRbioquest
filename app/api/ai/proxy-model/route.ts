export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  const url = searchParams.get('url');

  if (!url) return new Response(JSON.stringify({ error: 'URL required' }), { status: 400 });

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
    return new Response(JSON.stringify({ error: 'Proxy failed' }), { status: 500 });
  }
}