import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { getClassroomRole } from '@/lib/classroom/roles';

export async function GET() {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;
  const { user, supabase } = auth.context;
  if (getClassroomRole(user) !== 'teacher') return NextResponse.json({ error: 'Only teachers can manage assignments.' }, { status: 403 });

  const [classesResult, experiencesResult] = await Promise.all([
    supabase.from('classes').select('id, name').eq('teacher_id', user.id).order('name'),
    supabase.from('game_configs').select('id, title').eq('user_id', user.id).eq('visibility', 'published').order('created_at', { ascending: false }),
  ]);
  if (classesResult.error || experiencesResult.error) return NextResponse.json({ error: 'Failed to load assignment options' }, { status: 500 });
  return NextResponse.json({ classes: classesResult.data ?? [], experiences: experiencesResult.data ?? [] });
}
