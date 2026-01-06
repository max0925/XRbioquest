import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    // 调用 Blockade Labs API
    const response = await fetch('https://backend.blockadelabs.com/api/v1/skybox', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': process.env.BLOCKADE_LABS_API_KEY! 
      },
      body: JSON.stringify({
        prompt: prompt,
        generator: 'stable-skybox', // 使用稳定版本
      }),
    });

    const data = await response.json();
    
    // 注意：这里返回的是任务信息，包含 id
    // 因为生成全景图需要约 20 秒，我们需要返回 id 给前端进行轮询
    return NextResponse.json({ id: data.id, status: data.status });
  } catch (error) {
    return NextResponse.json({ error: 'Skybox trigger failed' }, { status: 500 });
  }
}