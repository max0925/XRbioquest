import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { getClassroomRole } from '@/lib/classroom/roles';
import { parseReviewRequest, type GradebookErrorCode, type ReviewApiResponse } from '@/lib/gradebook/contract';
import { parseDatabaseReview, validIdentifier } from '@/lib/gradebook/server';

function failure(status: number, code: GradebookErrorCode, message: string) {
  const body: ReviewApiResponse = { ok: false, error: { code, message } };
  return NextResponse.json(body, { status });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ attemptId: string }> }) {
  try {
    const auth = await requireApiUser();
    if ('response' in auth) return failure(401, 'AUTH_REQUIRED', 'Sign in to review a submission.');
    if (getClassroomRole(auth.context.user) !== 'teacher') return failure(403, 'TEACHER_ROLE_REQUIRED', 'Teacher access is required to review submissions.');
    const { attemptId } = await context.params;
    if (!validIdentifier(attemptId)) return failure(400, 'INVALID_REQUEST', 'The submission identifier is invalid.');
    let body: unknown;
    try { body = await request.json(); } catch { return failure(400, 'INVALID_REQUEST', 'The request body must be valid JSON.'); }
    const review = parseReviewRequest(body);
    if (!review) return failure(400, 'INVALID_REQUEST', 'Choose a valid review action and provide feedback when requesting changes.');

    const { data, error } = await auth.context.supabase.rpc('review_assignment_attempt', {
      p_attempt_id: attemptId, p_outcome: review.action, p_teacher_feedback: review.feedback,
    }).single();
    if (error) {
      const forbidden = error.code === '42501';
      console.error('[GRADEBOOK] Review operation failed', {
        operation: 'review submission', code: error.code ?? null,
        message: error.message ?? 'Unknown database error',
      });
      return failure(forbidden ? 403 : 503, forbidden ? 'REVIEW_FORBIDDEN' : 'GRADEBOOK_UNAVAILABLE',
        forbidden ? 'This submission is not pending review or does not belong to one of your classes.' : 'The review could not be saved. Please try again.');
    }
    const saved = parseDatabaseReview(data);
    if (!saved) return failure(500, 'GRADEBOOK_UNAVAILABLE', 'The saved review has an unexpected structure.');
    const response: ReviewApiResponse = { ok: true, review: saved };
    return NextResponse.json(response);
  } catch (error) {
    console.error('[GRADEBOOK] Unexpected review failure', { message: error instanceof Error ? error.message : 'Unknown server error' });
    return failure(500, 'GRADEBOOK_UNAVAILABLE', 'The review could not be saved. Please try again.');
  }
}
