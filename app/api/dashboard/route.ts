import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { getClassroomRole } from '@/lib/classroom/roles';
import { buildTeacherDashboard } from '@/lib/dashboard/summary';
import type { DashboardApiResponse, DashboardErrorCode } from '@/lib/dashboard/contract';

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

function errorResponse(status: number, code: DashboardErrorCode, message: string, redirect?: '/student') {
  const body: DashboardApiResponse = {
    ok: false,
    error: { code, message },
    ...(redirect ? { redirect } : {}),
  };
  return NextResponse.json(body, { status });
}

export async function GET() {
  try {
    const auth = await requireApiUser();
    if ('response' in auth) {
      return errorResponse(401, 'AUTH_REQUIRED', 'Sign in to view your teacher dashboard.');
    }

    const { user, supabase } = auth.context;
    const role = getClassroomRole(user);
    if (role === 'student') {
      return errorResponse(403, 'TEACHER_ROLE_REQUIRED', 'Teacher access is required for this dashboard.', '/student');
    }
    if (role !== 'teacher') {
      return errorResponse(403, 'ROLE_REQUIRED', 'This account does not have a classroom role.');
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
      return errorResponse(503, 'DASHBOARD_UNAVAILABLE', 'Dashboard data is temporarily unavailable.');
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
      return errorResponse(503, 'DASHBOARD_UNAVAILABLE', 'Dashboard data is temporarily unavailable.');
    }
    if (attemptsResult.error) {
      dashboardError('assignment attempts', attemptsResult.error);
      return errorResponse(503, 'DASHBOARD_UNAVAILABLE', 'Dashboard data is temporarily unavailable.');
    }

    const body: DashboardApiResponse = {
      ok: true,
      role: 'teacher',
      dashboard: buildTeacherDashboard({
        classes,
        assignments,
        experiences: experiencesResult.data ?? [],
        memberships: membershipsResult.data ?? [],
        attempts: attemptsResult.data ?? [],
      }),
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error('[DASHBOARD] Unexpected route failure', {
      message: error instanceof Error ? error.message : 'Unknown server error',
    });
    return errorResponse(500, 'DASHBOARD_UNAVAILABLE', 'Dashboard data is temporarily unavailable.');
  }
}
