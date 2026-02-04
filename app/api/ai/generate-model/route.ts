import { NextRequest, NextResponse } from 'next/server';
import { getClientId, checkRateLimit, incrementGeneration } from '@/lib/meshyRateLimit';

export const maxDuration = 30;

const MESHY_DISABLED = false;
const MESHY_API_URL = 'https://api.meshy.ai/v2/text-to-3d';

export async function POST(request: NextRequest) {
  // Guard: Return immediately if Meshy is disabled
  if (MESHY_DISABLED) {
    return NextResponse.json({
      error: 'Meshy AI is temporarily disabled for testing',
      disabled: true
    }, { status: 503 });
  }

  // 🔒 SERVER-SIDE HARD LIMIT ENFORCEMENT
  const clientId = getClientId(request.headers);
  const rateCheck = checkRateLimit(clientId);

  if (!rateCheck.allowed) {
    console.warn(`[RATE LIMIT] ✗ Client ${clientId.substring(0, 10)}: Request blocked (${rateCheck.current}/${rateCheck.limit})`);
    return NextResponse.json({
      error: `Rate limit exceeded: Maximum ${rateCheck.limit} concurrent model generations allowed`,
      limit: rateCheck.limit,
      current: rateCheck.current
    }, { status: 429 });
  }

  // Increment counter
  incrementGeneration(clientId);

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

    if (!taskId) {
      console.error('[MESHY] No taskId received from API:', generateData);
      return NextResponse.json({ error: 'Meshy API did not return a taskId' }, { status: 500 });
    }

    console.log(`[MESHY] ✓ Generation started - TaskId: ${taskId}, Prompt: "${prompt.substring(0, 50)}..."`);

    return NextResponse.json({
      success: true,
      taskId: taskId,
      message: 'Generation started with PBR texturing',
      clientId: clientId // Return clientId for tracking
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
