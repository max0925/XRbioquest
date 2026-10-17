import { NextRequest, NextResponse } from 'next/server';
import { getOptionalApiUser } from '@/lib/api/auth';
import { canReadGameExperience } from '@/lib/api/game-config-access';
import { isValidGameId } from '@/lib/api/experience-validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!isValidGameId(id)) {
    return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
  }

  const { user, supabase } = await getOptionalApiUser();
  const { data, error } = await supabase
    .from('game_configs')
    .select('config, user_id, visibility')
    .eq('id', id)
    .maybeSingle();

  if (error || !data || !canReadGameExperience(user?.id ?? null, data)) {
    return NextResponse.json({ error: 'Experience not found' }, { status: 404 });
  }

  return NextResponse.json(
    { config: data.config },
    { headers: { 'Cache-Control': data.visibility === 'published' || data.visibility === null
      ? 'public, max-age=60, stale-while-revalidate=300'
      : 'private, no-store' } },
  );
}
