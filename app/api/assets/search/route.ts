import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || "";

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

    const data = await response.json();
    // 确保返回 data.results 数组，防止前端 map 报错
    return NextResponse.json(data.results || []);
  } catch (error) {
    return NextResponse.json([]);
  }
}