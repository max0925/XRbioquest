import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    // DISABLED FOR LOCAL TESTING - Comment out Blockade Labs API call
    /*
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
    */

    // Mock response for local testing
    console.log(`[SKYBOX] ✓ MOCK Generation - Prompt: "${prompt}"`);

    return NextResponse.json({
      id: 'mock-skybox-id-' + Date.now(),
      status: 'complete',
      url: null // No actual skybox URL in local testing
    });
  } catch (error) {
    return NextResponse.json({ error: 'Skybox trigger failed' }, { status: 500 });
  }
}