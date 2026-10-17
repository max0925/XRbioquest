import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { resolveAuthenticatedUser } from './auth-policy';

type AuthClient = Awaited<ReturnType<typeof createClient>>;

export type AuthenticatedRouteContext = {
  user: User;
  supabase: AuthClient;
};

export type RouteAuthResult =
  | { ok: true; context: AuthenticatedRouteContext }
  | { ok: false; response: NextResponse };

export async function getOptionalApiUser() {
  const supabase = await createClient();
  const user = await resolveAuthenticatedUser(() => supabase.auth.getUser());
  return { user, supabase };
}

export async function requireApiUser(): Promise<RouteAuthResult> {
  const { user, supabase } = await getOptionalApiUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      ),
    };
  }

  return { ok: true, context: { user, supabase } };
}
