import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { getClassroomRole } from '@/lib/classroom/roles';
import { buildTeacherDashboard } from '@/lib/dashboard/summary';

type DatabaseError = { message?: string; code?: string; details?: string; hint?: string } | null;

function dashboardError(operation: string, error: DatabaseError) {
  console.error('[DASHBOARD] Supabase query failed', {
    operation,
    message: error?.message ?? 'Unknown database error',
    code: error?.code ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
  });
}

export async function GET() {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;

  const { user, supabase } = auth.context;
  const role = getClassroomRole(user);
  if (role === 'student') return NextResponse.json({ role, redirect: '/student' });
  if (role !== 'teacher') {
    return NextResponse.json(
      { error: 'Your account does not have a classroom role.', code: 'ROLE_REQUIRED' },
      { status: 403 },
    );
  }

  const [classesResult, assignmentsResult, experiencesResult] = await Promise.all([
    supabase.from('classes').select('id, name').eq('teacher_id', user.id),
    supabase.from('assignments')
      .select('id, class_id, title, due_at, status, created_at')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('game_configs')
      .select('id, title, visibility, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(6),
  ]);

  const initialFailure = [
    ['classes', classesResult.error],
    ['assignments', assignmentsResult.error],
    ['experiences', experiencesResult.error],
  ] as const;
  const failed = initialFailure.find(([, error]) => error);
  if (failed) {
    dashboardError(failed[0], failed[1]);
    return NextResponse.json({ error: 'Could not load the teacher dashboard.' }, { status: 500 });
  }

  const classes = classesResult.data ?? [];
  const assignments = assignmentsResult.data ?? [];
  const classIds = classes.map((classroom) => classroom.id);
  const assignmentIds = assignments.map((assignment) => assignment.id);
  const [membershipsResult, attemptsResult] = await Promise.all([
    classIds.length
      ? supabase.from('class_memberships').select('class_id, student_id').in('class_id', classIds)
      : Promise.resolve({ data: [], error: null }),
    assignmentIds.length
      ? supabase.from('assignment_attempts').select('assignment_id, student_id, status').in('assignment_id', assignmentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (membershipsResult.error) {
    dashboardError('class memberships', membershipsResult.error);
    return NextResponse.json({ error: 'Could not load classroom enrollment totals.' }, { status: 500 });
  }
  if (attemptsResult.error) {
    dashboardError('assignment attempts', attemptsResult.error);
    return NextResponse.json({ error: 'Could not load assignment completion totals.' }, { status: 500 });
  }

  return NextResponse.json({ role, ...buildTeacherDashboard({
    classes,
    assignments,
    experiences: experiencesResult.data ?? [],
    memberships: membershipsResult.data ?? [],
    attempts: attemptsResult.data ?? [],
  }) });
}
