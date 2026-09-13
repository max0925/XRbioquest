import type { User } from '@supabase/supabase-js';

export async function resolveAuthenticatedUser(
  getUser: () => Promise<{ data: { user: User | null }; error: unknown }>,
): Promise<User | null> {
  try {
    const { data, error } = await getUser();
    return error ? null : data.user;
  } catch {
    return null;
  }
}
