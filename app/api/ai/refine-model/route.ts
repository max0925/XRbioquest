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
    const apiKey = process.env.MESHY_API_KEY;

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

    const data = await response.json();
    return NextResponse.json({ taskId: data.result });
  } catch (error) {
    return NextResponse.json({ error: 'Refine failed' }, { status: 500 });
  }
}