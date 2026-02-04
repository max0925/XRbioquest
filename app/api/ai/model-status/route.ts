import { NextRequest, NextResponse } from 'next/server';
import { getClientId, decrementGeneration } from '@/lib/meshyRateLimit';

// Increase serverless function timeout — Meshy status checks can be slow
export const maxDuration = 30; // seconds

const MESHY_DISABLED = false;
const MESHY_API_URL = 'https://api.meshy.ai/v2/text-to-3d';

export async function GET(request: NextRequest) {
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

    // Fetch with AbortController to prevent hanging requests
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25s client timeout

    const response = await fetch(`${MESHY_API_URL}/${taskId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ error: 'Status check failed' }, { status: response.status });
    }

    const data = await response.json();
    const status = data.status;

    const clientId = getClientId(request.headers);

    if (status === 'SUCCEEDED') {
      decrementGeneration(clientId);

      // Log all available model URLs for debugging
      console.log(`[MESHY] TaskId ${taskId}: SUCCEEDED — model_urls keys:`, Object.keys(data.model_urls || {}));
      if (data.texture_urls) {
        console.log(`[MESHY] TaskId ${taskId}: texture_urls count:`, data.texture_urls.length);
      }

      const modelUrl = data.model_urls?.glb;
      if (!modelUrl) {
        console.error(`[MESHY] TaskId ${taskId}: SUCCEEDED but no GLB URL. Available:`, data.model_urls);
        return NextResponse.json({
          status: 'FAILED',
          error: 'Model generation succeeded but no GLB URL provided',
          taskId: taskId,
        });
      }

      console.log(`[MESHY] ✓ TaskId ${taskId}: GLB ready — ${modelUrl.substring(0, 80)}...`);

      return NextResponse.json({
        status: 'SUCCEEDED',
        modelUrl: modelUrl,
        thumbnail: data.thumbnail_url || null,
        taskId: taskId,
        // Pass all available URLs so the client can pick the best one
        modelUrls: data.model_urls,
        hasTextures: !!(data.texture_urls && data.texture_urls.length > 0),
      });
    } else if (status === 'FAILED' || status === 'EXPIRED') {
      decrementGeneration(clientId);

      const errorMsg = data.task_error?.message || 'Generation failed';
      console.error(`[MESHY] ✗ TaskId ${taskId}: ${status} — ${errorMsg}`);

      return NextResponse.json({
        status: status,
        error: errorMsg,
        taskId: taskId,
      });
    } else {
      const progress = data.progress || 0;
      console.log(`[MESHY] TaskId ${taskId}: ${status} (${progress}%)`);

      return NextResponse.json({
        status: status,
        progress: progress,
        taskId: taskId,
      });
    }

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Meshy API request timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
