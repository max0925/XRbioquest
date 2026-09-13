import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { isExperienceVisibility, isValidGameId } from '@/lib/api/experience-validation';
import { canMutateGameExperience, publicationUpdate } from '@/lib/api/game-config-access';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;

  const { id } = await params;
  if (!isValidGameId(id)) {
    return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const visibility = body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>).visibility
    : undefined;
  if (!isExperienceVisibility(visibility)) {
    return NextResponse.json({ error: 'Visibility must be draft or published' }, { status: 400 });
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
    .update(publicationUpdate(visibility))
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) {
    console.error('[game-configs] Publication update failed', { gameId: id, userId: user.id });
    return NextResponse.json({ error: 'Failed to update publication status' }, { status: 500 });
  }

  return NextResponse.json({ success: true, visibility });
}
