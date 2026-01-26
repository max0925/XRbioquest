import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('url');

  if (!raw) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  const url = encodeURI(raw);

  try {
    console.log(`🔌 Proxying request to: ${url}`);

    const response = await fetch(url, {
      headers: {
        // 伪装 User-Agent 防止被拦截
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    if (!response.ok) {
      console.error(`❌ Upstream error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Upstream failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'model/gltf-binary';

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error: any) {
    console.error('🔥 Proxy Error Details:', error);
    return NextResponse.json(
      { error: 'Proxy failed', details: error.message },
      { status: 500 }
    );
  }
}