import { NextRequest, NextResponse } from 'next/server';
import { getClientId, decrementGeneration } from '@/lib/meshyRateLimit';

// ═══════════════════════════════════════════════════════════════════════════
// MESHY API GUARD - Set to true to disable all Meshy API calls for testing
// ═══════════════════════════════════════════════════════════════════════════
const MESHY_DISABLED = false; // ✅ RE-ENABLED with server-side hard limits

// ✅ 必须同步使用 v2 地址
const MESHY_API_URL = 'https://api.meshy.ai/v2/text-to-3d';

export async function GET(request: NextRequest) {
  // Guard: Return immediately if Meshy is disabled
  if (MESHY_DISABLED) {
    return NextResponse.json({
      error: 'Meshy AI is temporarily disabled for testing',
      disabled: true
    }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const apiKey = process.env.MESHY_API_KEY;

    // ✅ 请求 v2 状态接口
    const response = await fetch(`${MESHY_API_URL}/${taskId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Status check failed' }, { status: response.status });
    }

    const data = await response.json();
    const status = data.status;

    // Get client ID for rate limiting
    const clientId = getClientId(request.headers);

    if (status === 'SUCCEEDED') {
      // ✅ Decrement counter on success
      decrementGeneration(clientId);

      const modelUrl = data.model_urls?.glb;
      if (!modelUrl) {
        console.error(`[MESHY] TaskId ${taskId}: SUCCEEDED but no model URL`, data);
        return NextResponse.json({
          status: 'FAILED',
          error: 'Model generation succeeded but no URL provided',
          taskId: taskId,
        });
      }

      console.log(`[MESHY] ✓ TaskId ${taskId}: Model ready - ${modelUrl.substring(0, 60)}...`);

      return NextResponse.json({
        status: 'SUCCEEDED',
        modelUrl: modelUrl,
        thumbnail: data.thumbnail_url || null,
        taskId: taskId,
      });
    } else if (status === 'FAILED' || status === 'EXPIRED') {
      // ✅ Decrement counter on failure
      decrementGeneration(clientId);

      const errorMsg = data.task_error?.message || 'Generation failed';
      console.error(`[MESHY] ✗ TaskId ${taskId}: ${status} - ${errorMsg}`);

      return NextResponse.json({
        status: status,
        error: errorMsg,
        taskId: taskId,
      });
    } else {
      // Status is PENDING or IN_PROGRESS
      const progress = data.progress || 0;
      console.log(`[MESHY] TaskId ${taskId}: ${status} (${progress}%)`);

      return NextResponse.json({
        status: status,
        progress: progress,
        taskId: taskId,
      });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
