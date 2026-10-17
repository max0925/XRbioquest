import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { getClassroomRole } from '@/lib/classroom/roles';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;
  if (getClassroomRole(auth.context.user) !== 'teacher') {
    return NextResponse.json({ error: 'Only teachers can view Gradebook.' }, { status: 403 });
  }
  const { id } = await context.params;
  const [gradebookResult, assignmentResult] = await Promise.all([
    auth.context.supabase.rpc('get_assignment_gradebook', { p_assignment_id: id }),
    auth.context.supabase.from('assignments').select('id, title, class_id, allow_retries').eq('id', id).eq('teacher_id', auth.context.user.id).maybeSingle(),
  ]);
  if (gradebookResult.error || assignmentResult.error || !assignmentResult.data) return NextResponse.json({ error: 'Gradebook is unavailable or you do not have access.' }, { status: 403 });
  const { data: classroom, error: classroomError } = await auth.context.supabase.from('classes').select('name').eq('id', assignmentResult.data.class_id).single();
  if (classroomError || !classroom) return NextResponse.json({ error: 'Gradebook details could not be loaded.' }, { status: 500 });
  return NextResponse.json({
    assignment: { id: assignmentResult.data.id, title: assignmentResult.data.title, className: classroom.name, allowRetries: assignmentResult.data.allow_retries },
    students: gradebookResult.data ?? [],
  });
}
