import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { getClassroomRole } from '@/lib/classroom/roles';
import { parseAssignmentFields } from '@/lib/assignments/validation';

const assignmentColumns = 'id, class_id, experience_id, teacher_id, title, instructions, due_at, allow_retries, status, created_at, updated_at';

export async function GET() {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;
  const { user, supabase } = auth.context;
  const role = getClassroomRole(user);
  if (!role) return NextResponse.json({ error: 'Your account does not have an assignment role.' }, { status: 403 });

  let query = supabase.from('assignments').select(assignmentColumns).order('created_at', { ascending: false });
  if (role === 'teacher') query = query.eq('teacher_id', user.id);
  else query = query.eq('status', 'active');
  const { data: assignments, error } = await query;
  if (error) return NextResponse.json({ error: 'Failed to load assignments' }, { status: 500 });
  if (!assignments?.length) return NextResponse.json({ role, assignments: [] });

  const classIds = [...new Set(assignments.map((item) => item.class_id))];
  const experienceIds = [...new Set(assignments.map((item) => item.experience_id))];
  const [classesResult, experiencesResult, attemptsResult] = await Promise.all([
    supabase.from('classes').select('id, name').in('id', classIds),
    supabase.from('game_configs').select('id, title').in('id', experienceIds),
    role === 'student'
      ? supabase.from('assignment_attempts').select('id, assignment_id, attempt_number, status, progress_percent, auto_score, max_score').in('assignment_id', assignments.map((item) => item.id)).order('attempt_number', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (classesResult.error || experiencesResult.error || attemptsResult.error) {
    return NextResponse.json({ error: 'Failed to load complete assignment details' }, { status: 500 });
  }
  const classNames = new Map((classesResult.data ?? []).map((item) => [item.id, item.name]));
  const experienceTitles = new Map((experiencesResult.data ?? []).map((item) => [item.id, item.title]));
  const latestAttempts = new Map<string, (typeof attemptsResult.data)[number]>();
  for (const attempt of attemptsResult.data ?? []) {
    if (!latestAttempts.has(attempt.assignment_id)) latestAttempts.set(attempt.assignment_id, attempt);
  }
  const latestAttemptIds = [...latestAttempts.values()].map((attempt) => attempt.id);
  const reviewsResult = role === 'student' && latestAttemptIds.length
    ? await supabase.from('assignment_reviews').select('attempt_id, manual_adjustment, teacher_feedback').in('attempt_id', latestAttemptIds)
    : { data: [], error: null };
  if (reviewsResult.error) return NextResponse.json({ error: 'Failed to load assignment feedback' }, { status: 500 });
  const reviews = new Map((reviewsResult.data ?? []).map((review) => [review.attempt_id, review]));
  if (assignments.some((item) => !classNames.has(item.class_id) || !experienceTitles.has(item.experience_id))) {
    return NextResponse.json({ error: 'Failed to load complete assignment details' }, { status: 500 });
  }
  return NextResponse.json({ role, assignments: assignments.map((item) => {
    const attempt = latestAttempts.get(item.id);
    const review = attempt ? reviews.get(attempt.id) : null;
    return { ...item, className: classNames.get(item.class_id), experienceTitle: experienceTitles.get(item.experience_id), attempt: attempt ? { ...attempt, manual_adjustment: review?.manual_adjustment ?? 0, final_score: Number(attempt.auto_score) + Number(review?.manual_adjustment ?? 0), teacher_feedback: review?.teacher_feedback ?? null } : null };
  }) });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;
  const { user, supabase } = auth.context;
  if (getClassroomRole(user) !== 'teacher') return NextResponse.json({ error: 'Only teachers can create assignments.' }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const fields = parseAssignmentFields(body);
  if (!fields) return NextResponse.json({ error: 'Invalid assignment fields.' }, { status: 400 });

  const { data, error } = await supabase.from('assignments').insert({
    class_id: fields.classId, experience_id: fields.experienceId, teacher_id: user.id,
    title: fields.title, instructions: fields.instructions, due_at: fields.dueAt,
    allow_retries: fields.allowRetries,
  }).select(assignmentColumns).single();
  if (error || !data) return NextResponse.json({ error: 'Could not create assignment. Check that the class and published experience are yours.' }, { status: 400 });
  return NextResponse.json({ assignment: data }, { status: 201 });
}
