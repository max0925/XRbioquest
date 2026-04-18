import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  const { id, config, title } = await request.json();

  if (!id || !config) {
    return NextResponse.json({ error: 'Missing id or config' }, { status: 400 });
  }

  const updatePayload: Record<string, any> = { config };
  if (title) updatePayload.title = title;

  const { error } = await supabase
    .from('game_configs')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    console.error('[update-game-config] Failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log('[update-game-config] Saved config for', id);
  return NextResponse.json({ success: true });
}
