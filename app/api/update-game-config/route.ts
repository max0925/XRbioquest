import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { userOwnsGameConfig } from '@/lib/api/game-config-access';
import { getClassroomRole } from '@/lib/classroom/roles';

const MAX_CONFIG_BYTES = 1_000_000;

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;
  if (getClassroomRole(auth.context.user) !== 'teacher') {
    return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { id, config, title } = body as Record<string, unknown>;

  if (typeof id !== 'string' || id.length > 128 || !config || typeof config !== 'object') {
    return NextResponse.json({ error: 'Missing id or config' }, { status: 400 });
  }
  if (title !== undefined && (typeof title !== 'string' || title.length > 200)) {
    return NextResponse.json({ error: 'Invalid title' }, { status: 400 });
  }
  if (JSON.stringify(config).length > MAX_CONFIG_BYTES) {
    return NextResponse.json({ error: 'Config is too large' }, { status: 413 });
  }

  const { user, supabase } = auth.context;
  if (!(await userOwnsGameConfig(supabase, user.id, id))) {
    return NextResponse.json(
      { error: 'Game config not found', code: 'GAME_CONFIG_NOT_FOUND' },
      { status: 404 },
    );
  }

  const updatePayload: Record<string, unknown> = { config };
  if (title) updatePayload.title = title;

  const { error } = await supabase
    .from('game_configs')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[update-game-config] Update failed', { gameId: id, userId: user.id });
    return NextResponse.json({ error: 'Failed to update game config' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
