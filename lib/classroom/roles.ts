import type { User } from '@supabase/supabase-js';

export type ClassroomRole = 'teacher' | 'student';

export function getClassroomRole(user: Pick<User, 'app_metadata'>): ClassroomRole | null {
  const role = user.app_metadata?.role;
  return role === 'teacher' || role === 'student' ? role : null;
}
