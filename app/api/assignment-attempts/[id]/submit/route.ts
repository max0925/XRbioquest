import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { getClassroomRole } from '@/lib/classroom/roles';

type Context = { params: Promise<{ id: string }> };

function validAttemptId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(_: Request, context: Context) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;
  if (getClassroomRole(auth.context.user) !== 'student') {
    return NextResponse.json({ error: 'Only students can submit assignment attempts.' }, { status: 403 });
  }

  const { id } = await context.params;
  if (!validAttemptId(id)) {
    return NextResponse.json({ error: 'Invalid attempt.' }, { status: 400 });
  }

  const { data, error } = await auth.context.supabase.rpc('submit_assignment_attempt', {
    p_attempt_id: id,
  }).single();
  if (error || !data) {
    const incomplete = error?.code === '22023';
    const forbidden = error?.code === '42501';
    return NextResponse.json(
      { error: incomplete
        ? 'Complete every required activity before submitting.'
        : forbidden
          ? 'This attempt cannot be submitted by the current student.'
          : 'Submission is temporarily unavailable. Please try again.' },
      { status: incomplete ? 409 : forbidden ? 403 : 503 },
    );
  }

  return NextResponse.json({ attempt: data });
}
