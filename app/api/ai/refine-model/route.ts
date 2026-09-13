import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';

export const maxDuration = 30;

const MESHY_DISABLED = false;
const MESHY_API_URL = 'https://api.meshy.ai/v2/text-to-3d';

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;

  // Guard: Return immediately if Meshy is disabled
  if (MESHY_DISABLED) {
    return NextResponse.json({
      error: 'Meshy AI is temporarily disabled for testing',
      disabled: true
    }, { status: 503 });
  }
  try {
    const { previewTaskId } = await request.json();

    if (typeof previewTaskId !== 'string' || !previewTaskId || previewTaskId.length > 200) {
      return NextResponse.json({ error: 'previewTaskId is required' }, { status: 400 });
    }

    const apiKey = process.env.MESHY_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Meshy API key not configured' }, { status: 500 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(MESHY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        mode: 'refine',
        preview_task_id: previewTaskId,
        texture_richness: 'high',
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      console.error('[MESHY] Provider rejected refinement', { status: response.status });
      return NextResponse.json({ error: 'Model refinement failed' }, { status: 502 });
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
    return NextResponse.json({ error: 'Model refinement failed' }, { status: 500 });
  }
}
