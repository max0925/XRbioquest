import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { getClassroomRole } from '@/lib/classroom/roles';
import { parseProgress } from '@/lib/assignments/progress-validation';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;
  if (getClassroomRole(auth.context.user) !== 'student') {
    return NextResponse.json({ error: 'Only students can save assignment progress.' }, { status: 403 });
  }
  const { id } = await context.params;
  if (!id || id.length > 100) return NextResponse.json({ error: 'Invalid attempt.' }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const fields = parseProgress(body);
  if (!fields) return NextResponse.json({ error: 'Invalid progress data.' }, { status: 400 });

  const { data, error } = await auth.context.supabase.rpc('record_assignment_phase', {
    p_attempt_id: id,
    p_experience_id: fields.experienceId,
    p_phase_id: fields.phaseId,
    p_answer: fields.answer,
  }).single();
  if (error || !data) return NextResponse.json({ error: 'Progress could not be saved.' }, { status: 403 });
  return NextResponse.json({ progress: data });
}
