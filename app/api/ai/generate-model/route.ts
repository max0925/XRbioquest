import { NextRequest, NextResponse } from 'next/server';

// ✅ 必须使用 v2 接口
const MESHY_API_URL = 'https://api.meshy.ai/v2/text-to-3d';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.MESHY_API_KEY;

    // Step 1: 发起 Meshy v2 任务
    const generateResponse = await fetch(MESHY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        mode: 'preview', // ✅ v2 必填参数
        negative_prompt: 'low quality, blurry texture, monochrome',
        prompt: prompt,
        art_style: 'realistic',
        rich_text: true //
      }),
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error('❌ Meshy Error:', errorText);
      return NextResponse.json({ error: 'Meshy API rejected request' }, { status: 500 });
    }

    const generateData = await generateResponse.json();
    const taskId = generateData.result; // ✅ v2 返回结构

    console.log('🔄 Meshy v2 Task Started:', taskId);

    return NextResponse.json({
      success: true,
      taskId: taskId,
      message: 'Generation started via v2'
    });

  } catch (error: any) {
    console.error('❌ Server Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}