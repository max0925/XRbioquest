import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { getClassroomRole } from '@/lib/classroom/roles';
import { parseReview } from '@/lib/assignments/gradebook';

type Context = { params: Promise<{ id: string; studentId: string }> };

export async function GET(_: Request, context: Context) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;
  if (getClassroomRole(auth.context.user) !== 'teacher') return NextResponse.json({ error: 'Only teachers can view submissions.' }, { status: 403 });
  const { id, studentId } = await context.params;
  const { data, error } = await auth.context.supabase.rpc('get_assignment_submission', { p_assignment_id: id, p_student_id: studentId });
  if (error) return NextResponse.json({ error: 'Submission is unavailable or you do not have access.' }, { status: 403 });
  return NextResponse.json({ answers: data ?? [] });
}

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;
  if (getClassroomRole(auth.context.user) !== 'teacher') return NextResponse.json({ error: 'Only teachers can review submissions.' }, { status: 403 });
  const { id, studentId } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const review = parseReview(body);
  if (!review) return NextResponse.json({ error: 'Invalid review fields.' }, { status: 400 });
  const { data, error } = await auth.context.supabase.rpc('save_assignment_review', {
    p_assignment_id: id,
    p_student_id: studentId,
    p_manual_adjustment: review.manualAdjustment,
    p_teacher_feedback: review.teacherFeedback,
  }).single();
  if (error || !data) return NextResponse.json({ error: 'Review could not be saved.' }, { status: 403 });
  return NextResponse.json({ review: data });
}
