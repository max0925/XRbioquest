import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const API_KEY = process.env.BLOCKADE_API_KEY; 

    if (!body.prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
    if (!API_KEY) return NextResponse.json({ error: 'API Key missing' }, { status: 500 });

    console.log(`[SKYBOX] 🚀 Starting generation: "${body.prompt.substring(0, 20)}..."`);

    // 1. 发起任务
    const startRes = await fetch('https://backend.blockadelabs.com/api/v1/skybox', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: body.prompt,
        skybox_style_id: 3, 
      }),
    });

    if (!startRes.ok) {
      const errText = await startRes.text();
      console.error('[SKYBOX] Start failed:', errText);
      return NextResponse.json({ error: 'Start failed' }, { status: startRes.status });
    }

    const startData = await startRes.json();
    const id = startData.id; 
    console.log(`[SKYBOX] ✓ Task ID: ${id}`);

    // 2. 轮询进度
    let attempts = 0;
    const maxAttempts = 60; 

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 2000)); 
      
      const checkRes = await fetch(`https://backend.blockadelabs.com/api/v1/imagine/requests/${id}`, {
        headers: { 'x-api-key': API_KEY }
      });

      if (checkRes.ok) {
        const rawData = await checkRes.json();
        
        // 🔥 核心修复：兼容处理，取 data.request 或者 data 本身
        const data = rawData.request || rawData;
        
        console.log(`[SKYBOX] Attempt ${attempts + 1}: ${data.status}`);

        if (data.status === 'complete') {
            console.log(`[SKYBOX] 🎉 Success! URL: ${data.file_url}`);
            return NextResponse.json({ file_url: data.file_url });
        }
        
        if (data.status === 'error' || data.status === 'failed') {
            throw new Error(`Generation failed: ${data.error_message}`);
        }
      } 
      attempts++;
    }
    
    throw new Error("Timeout");

  } catch (error: any) {
    console.error('[SKYBOX] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}