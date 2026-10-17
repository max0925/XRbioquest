import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { getClassroomRole } from '@/lib/classroom/roles';
import { isReviewStatus, type GradebookApiResponse, type GradebookErrorCode } from '@/lib/gradebook/contract';
import { parseDatabaseAssignment, parseDatabaseClass, parseDatabaseSubmission, parseRows, validIdentifier } from '@/lib/gradebook/server';

function failure(status: number, code: GradebookErrorCode, message: string) {
  const body: GradebookApiResponse = { ok: false, error: { code, message } };
  return NextResponse.json(body, { status });
}

function logFailure(operation: string, error: { code?: string; message?: string } | null) {
  console.error('[GRADEBOOK] Database operation failed', {
    operation, code: error?.code ?? null, message: error?.message ?? 'Unknown database error',
  });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiUser();
    if ('response' in auth) return failure(401, 'AUTH_REQUIRED', 'Sign in to view the Gradebook.');
    const { user, supabase } = auth.context;
    if (getClassroomRole(user) !== 'teacher') return failure(403, 'TEACHER_ROLE_REQUIRED', 'Teacher access is required for the Gradebook.');

    const classId = request.nextUrl.searchParams.get('classId');
    const assignmentId = request.nextUrl.searchParams.get('assignmentId');
    const requestedStatus = request.nextUrl.searchParams.get('status');
    if ((classId !== null && !validIdentifier(classId)) || (assignmentId !== null && !validIdentifier(assignmentId))
      || (requestedStatus !== null && !isReviewStatus(requestedStatus))) {
      return failure(400, 'INVALID_FILTER', 'One or more Gradebook filters are invalid.');
    }

    const [classesResult, assignmentsResult] = await Promise.all([
      supabase.from('classes').select('id, name').eq('teacher_id', user.id).order('name'),
      supabase.from('assignments').select('id, class_id, title').eq('teacher_id', user.id).order('title'),
    ]);
    if (classesResult.error || assignmentsResult.error) {
      logFailure(classesResult.error ? 'load classes' : 'load assignments', classesResult.error ?? assignmentsResult.error);
      return failure(503, 'GRADEBOOK_UNAVAILABLE', 'Gradebook data is temporarily unavailable.');
    }
    const classes = parseRows(classesResult.data, parseDatabaseClass);
    const assignments = parseRows(assignmentsResult.data, parseDatabaseAssignment);
    if (!classes || !assignments) return failure(500, 'GRADEBOOK_UNAVAILABLE', 'Gradebook data has an unexpected structure.');
    if (classId && !classes.some((classroom) => classroom.id === classId)) {
      return failure(403, 'REVIEW_FORBIDDEN', 'You do not have access to that class.');
    }
    const selectedAssignment = assignmentId ? assignments.find((assignment) => assignment.id === assignmentId) : undefined;
    if (assignmentId && (!selectedAssignment || (classId && selectedAssignment.classId !== classId))) {
      return failure(403, 'REVIEW_FORBIDDEN', 'You do not have access to that assignment.');
    }

    const submissionsResult = await supabase.rpc('get_teacher_gradebook', {
      p_class_id: classId, p_assignment_id: assignmentId, p_status: requestedStatus,
    });
    if (submissionsResult.error) {
      logFailure('load submissions', submissionsResult.error);
      return failure(503, 'GRADEBOOK_UNAVAILABLE', 'Gradebook submissions are temporarily unavailable.');
    }
    const submissions = parseRows(submissionsResult.data, parseDatabaseSubmission);
    if (!submissions) return failure(500, 'GRADEBOOK_UNAVAILABLE', 'Gradebook submissions have an unexpected structure.');

    const body: GradebookApiResponse = { ok: true, role: 'teacher', gradebook: { classes, assignments, submissions } };
    return NextResponse.json(body);
  } catch (error) {
    console.error('[GRADEBOOK] Unexpected route failure', { message: error instanceof Error ? error.message : 'Unknown server error' });
    return failure(500, 'GRADEBOOK_UNAVAILABLE', 'Gradebook data is temporarily unavailable.');
  }
}
