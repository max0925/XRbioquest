import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { getClassroomRole } from '@/lib/classroom/roles';
import { parseStartAttempt } from '@/lib/assignments/progress-validation';

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;
  if (getClassroomRole(auth.context.user) !== 'student') {
    return NextResponse.json({ error: 'Only students can start assignment attempts.' }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const fields = parseStartAttempt(body);
  if (!fields) return NextResponse.json({ error: 'Invalid assignment context.' }, { status: 400 });

  const { data, error } = await auth.context.supabase.rpc('start_assignment_attempt', {
    p_assignment_id: fields.assignmentId,
    p_experience_id: fields.experienceId,
  }).single();
  if (error || !data) {
    return NextResponse.json({ error: 'This assignment cannot be started or resumed.' }, { status: 403 });
  }
  return NextResponse.json({ attempt: data });
}
