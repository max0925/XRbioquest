import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim();
  if (!query || query.length > 200) {
    return NextResponse.json({ error: 'A valid search query is required' }, { status: 400 });
  }

  const apiKey = process.env.SKETCHFAB_API_TOKEN;
  if (!apiKey) {
    return NextResponse.json({ error: 'Sketchfab API token not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://api.sketchfab.com/v3/search?type=models&q=${encodeURIComponent(query)}&downloadable=true`,
      {
        headers: {
          // ✅ 注意：Token 后面一定要有一个空格
          'Authorization': `Token ${apiKey}`, 
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Asset search failed' }, { status: 502 });
    }
    const data = await response.json();
    // 确保返回 data.results 数组，防止前端 map 报错
    return NextResponse.json(data.results || []);
  } catch {
    return NextResponse.json({ error: 'Asset search failed' }, { status: 502 });
  }
}
