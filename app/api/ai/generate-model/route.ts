import { NextRequest, NextResponse } from 'next/server';

// Meshy v2 Text-to-3D API
const MESHY_API_URL = 'https://api.meshy.ai/v2/text-to-3d';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.MESHY_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Meshy API key not configured' }, { status: 500 });
    }

    // Meshy v2 Text-to-3D request with PBR texturing enabled
    const generateResponse = await fetch(MESHY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        mode: 'preview',
        prompt: prompt,
        art_style: 'realistic',
        negative_prompt: 'low quality, blurry, distorted, ugly, monochrome, flat shading',
        // PBR Material settings for textured output
        enable_pbr: true,
        texture_richness: 'high',
      }),
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      return NextResponse.json({ error: 'Meshy API rejected request', details: errorText }, { status: 500 });
    }

    const generateData = await generateResponse.json();
    const taskId = generateData.result;

    return NextResponse.json({
      success: true,
      taskId: taskId,
      message: 'Generation started with PBR texturing'
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}