import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
// MESHY API GUARD - Set to true to disable all Meshy API calls for testing
// ═══════════════════════════════════════════════════════════════════════════
const MESHY_DISABLED = false; // ✅ RE-ENABLED

const MESHY_API_URL = 'https://api.meshy.ai/v2/text-to-3d';

export async function POST(request: NextRequest) {
  // Guard: Return immediately if Meshy is disabled
  if (MESHY_DISABLED) {
    return NextResponse.json({
      error: 'Meshy AI is temporarily disabled for testing',
      disabled: true
    }, { status: 503 });
  }
  try {
    const { previewTaskId } = await request.json();

    if (!previewTaskId) {
      return NextResponse.json({ error: 'previewTaskId is required' }, { status: 400 });
    }

    const apiKey = process.env.MESHY_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Meshy API key not configured' }, { status: 500 });
    }

    // ✅ 发起 Refine 任务，目标是精修贴图 (Texture)
    const response = await fetch(MESHY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        mode: 'refine', // ✅ 核心：模式改为 refine
        preview_task_id: previewTaskId,
        texture_richness: 'high'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MESHY] Refine request failed:', errorText);
      return NextResponse.json({ error: 'Meshy API rejected refine request', details: errorText }, { status: 500 });
    }

    const data = await response.json();
    const taskId = data.result;

    if (!taskId) {
      console.error('[MESHY] No refine taskId received from API:', data);
      return NextResponse.json({ error: 'Meshy API did not return a refine taskId' }, { status: 500 });
    }

    console.log(`[MESHY] ✓ Refine started - TaskId: ${taskId}, PreviewTaskId: ${previewTaskId}`);

    return NextResponse.json({ taskId: taskId });
  } catch (error: any) {
    console.error('[MESHY] Refine error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}