import { createClient } from '@supabase/supabase-js';

// Admin client using service role key — bypasses RLS.
// Only use in server-side code that has no user context (webhooks, cron jobs).
let _admin: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase admin env vars missing');
    _admin = createClient(url, key);
  }
  return _admin;
}
