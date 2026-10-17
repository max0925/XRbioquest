import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { isValidGameId } from '@/lib/api/experience-validation';
import { canMutateGameExperience } from '@/lib/api/game-config-access';
import { applyStructuredLesson, StructuredLessonError } from '@/lib/structured-editor/validation';
import { getClassroomRole } from '@/lib/classroom/roles';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;
  if (getClassroomRole(auth.context.user) !== 'teacher') {
    return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidGameId(id)) {
    return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
  }

  const { user, supabase } = auth.context;
  const { data, error } = await supabase
    .from('game_configs')
    .select('id, user_id, config, title, subject, prompt, visibility, is_published, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error || !data || !canMutateGameExperience(user.id, data)) {
    return NextResponse.json({ error: 'Game config not found' }, { status: 404 });
  }
  const { count, error: assignmentError } = await supabase
    .from('assignments')
    .select('id', { count: 'exact', head: true })
    .eq('experience_id', id)
    .eq('teacher_id', user.id);
  if (assignmentError) {
    return NextResponse.json({ error: 'Could not load editing status' }, { status: 500 });
  }
  return NextResponse.json({ game: data, isAssigned: (count ?? 0) > 0 });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;
  if (getClassroomRole(auth.context.user) !== 'teacher') {
    return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidGameId(id)) return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { user, supabase } = auth.context;
  const { data: record, error: readError } = await supabase
    .from('game_configs').select('user_id, config').eq('id', id).maybeSingle();
  if (readError || !record || !canMutateGameExperience(user.id, record)) {
    return NextResponse.json({ error: 'Game config not found' }, { status: 404 });
  }

  let config;
  try {
    config = applyStructuredLesson(record.config, (body as Record<string, unknown>).structuredLesson);
  } catch (error) {
    if (error instanceof StructuredLessonError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid lesson configuration' }, { status: 400 });
  }
  const { error: updateError } = await supabase.from('game_configs').update({ config })
    .eq('id', id).eq('user_id', user.id);
  if (updateError) return NextResponse.json({ error: 'Failed to save lesson changes' }, { status: 500 });
  return NextResponse.json({ success: true, config });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;

  const { id } = await params;
  if (!isValidGameId(id)) {
    return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
  }

  const { user, supabase } = auth.context;
  const { data: record, error: readError } = await supabase
    .from('game_configs')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();
  if (readError || !record || !canMutateGameExperience(user.id, record)) {
    return NextResponse.json({ error: 'Game config not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('game_configs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) {
    console.error('[game-configs] Delete failed', { gameId: id, userId: user.id });
    return NextResponse.json({ error: 'Failed to delete game config' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
