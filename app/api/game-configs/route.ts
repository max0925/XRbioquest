import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { isValidGameConfig, optionalShortText } from '@/lib/api/experience-validation';

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { config, title, subject, prompt } = body as Record<string, unknown>;
  if (!isValidGameConfig(config)) {
    return NextResponse.json({ error: 'Invalid or oversized game config' }, { status: 400 });
  }
  if (!optionalShortText(title, 200) || !optionalShortText(subject, 100) || !optionalShortText(prompt, 5_000)) {
    return NextResponse.json({ error: 'Invalid game metadata' }, { status: 400 });
  }

  const { user, supabase } = auth.context;
  const { data, error } = await supabase
    .from('game_configs')
    .insert({
      user_id: user.id,
      config,
      title: typeof title === 'string' ? title.trim() : null,
      subject: typeof subject === 'string' ? subject.trim() : null,
      prompt: typeof prompt === 'string' ? prompt.trim() : null,
      visibility: 'draft',
      is_published: false,
    })
    .select('id, visibility')
    .single();

  if (error || !data) {
    console.error('[game-configs] Create failed', { userId: user.id });
    return NextResponse.json({ error: 'Failed to create game config' }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, visibility: data.visibility }, { status: 201 });
}
