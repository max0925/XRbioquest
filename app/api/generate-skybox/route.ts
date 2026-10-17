import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { userOwnsGameConfig } from '@/lib/api/game-config-access';

const MAX_PROMPT_LENGTH = 2_000;

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { prompt, gameId } = body as Record<string, unknown>;
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json({ error: 'A valid prompt is required' }, { status: 400 });
    }
    if (gameId !== undefined && (typeof gameId !== 'string' || gameId.length > 128)) {
      return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
    }

    const apiKey = process.env.BLOCKADE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Skybox generation is unavailable' }, { status: 503 });
    }

    const { user, supabase } = auth.context;
    if (typeof gameId === 'string' && !(await userOwnsGameConfig(supabase, user.id, gameId))) {
      return NextResponse.json(
        { error: 'Game config not found', code: 'GAME_CONFIG_NOT_FOUND' },
        { status: 404 },
      );
    }

    console.log('[SKYBOX] Starting authenticated generation', { userId: user.id, gameId: gameId ?? null });
    const startRes = await fetch('https://backend.blockadelabs.com/api/v1/skybox', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.trim(), skybox_style_id: 16 }),
    });
    if (!startRes.ok) {
      console.error('[SKYBOX] Provider rejected generation', { status: startRes.status });
      return NextResponse.json({ error: 'Skybox generation failed' }, { status: 502 });
    }

    const startData = await startRes.json();
    const taskId = startData.id;
    if (!taskId) throw new Error('Provider returned no task ID');

    let attempts = 0;
    let fileUrl: string | null = null;
    while (attempts < 60) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      const checkRes = await fetch(
        `https://backend.blockadelabs.com/api/v1/imagine/requests/${encodeURIComponent(taskId)}`,
        { headers: { 'x-api-key': apiKey } },
      );
      if (checkRes.ok) {
        const rawData = await checkRes.json();
        const data = rawData.request || rawData;
        if (data.status === 'complete') {
          fileUrl = data.file_url;
          break;
        }
        if (data.status === 'error' || data.status === 'failed') {
          throw new Error('Provider generation failed');
        }
      }
      attempts += 1;
    }
    if (!fileUrl) throw new Error('Provider generation timed out');

    let patched = false;
    if (typeof gameId === 'string') {
      const { data: row, error: fetchError } = await supabase
        .from('game_configs')
        .select('config')
        .eq('id', gameId)
        .eq('user_id', user.id)
        .single();
      if (fetchError || !row?.config) {
        console.error('[SKYBOX] Owned config fetch failed', { gameId, userId: user.id });
        return NextResponse.json({ error: 'Skybox generated but could not be saved' }, { status: 500 });
      }

      const updatedConfig = {
        ...row.config,
        environment: { ...(row.config.environment || {}), skybox_url: fileUrl },
      };
      const { error: updateError } = await supabase
        .from('game_configs')
        .update({ config: updatedConfig })
        .eq('id', gameId)
        .eq('user_id', user.id);
      if (updateError) {
        console.error('[SKYBOX] Owned config update failed', { gameId, userId: user.id });
        return NextResponse.json({ error: 'Skybox generated but could not be saved' }, { status: 500 });
      }
      patched = true;
    }

    return NextResponse.json({ file_url: fileUrl, patched, patchError: null });
  } catch (error: unknown) {
    console.error('[SKYBOX] Generation failed', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Skybox generation failed' }, { status: 502 });
  }
}
