import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { getClassroomRole } from '@/lib/classroom/roles';
import { parseClassFields } from '@/lib/classroom/validation';

export async function GET() {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;

  const { user, supabase } = auth.context;
  const role = getClassroomRole(user);
  if (!role) {
    return NextResponse.json({ error: 'Your account does not have a classroom role.' }, { status: 403 });
  }

  if (role === 'student') {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, grade, subject, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: 'Failed to load joined classes' }, { status: 500 });
    return NextResponse.json({ role, classes: data ?? [] });
  }

  const { data: classes, error } = await supabase
    .from('classes')
    .select('id, name, grade, subject, created_at, updated_at')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Failed to load classes' }, { status: 500 });
  const ids = (classes ?? []).map((item) => item.id);
  if (ids.length === 0) return NextResponse.json({ role, classes: [] });

  const [codesResult, membershipsResult] = await Promise.all([
    supabase.from('class_join_codes').select('class_id, code').in('class_id', ids),
    supabase.from('class_memberships').select('class_id').in('class_id', ids),
  ]);
  if (codesResult.error || membershipsResult.error) {
    return NextResponse.json({ error: 'Failed to load complete class details' }, { status: 500 });
  }
  const codes = codesResult.data;
  const memberships = membershipsResult.data;
  const codeByClass = new Map((codes ?? []).map((item) => [item.class_id, item.code]));
  const memberCount = new Map<string, number>();
  for (const membership of memberships ?? []) {
    memberCount.set(membership.class_id, (memberCount.get(membership.class_id) ?? 0) + 1);
  }

  if ((classes ?? []).some((item) => !codeByClass.has(item.id))) {
    return NextResponse.json({ error: 'Failed to load complete class details' }, { status: 500 });
  }
  return NextResponse.json({
    role,
    classes: (classes ?? []).map((item) => ({
      ...item,
      joinCode: codeByClass.get(item.id),
      studentCount: memberCount.get(item.id) ?? 0,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const fields = parseClassFields(body);
  if (!fields) {
    return NextResponse.json({ error: 'Name, grade, and subject are required.' }, { status: 400 });
  }

  const { user, supabase } = auth.context;
  if (getClassroomRole(user) !== 'teacher') {
    return NextResponse.json({ error: 'Only teachers can create classes.' }, { status: 403 });
  }

  const { data, error } = await supabase.rpc('create_class_with_join_code', {
    class_name: fields.name,
    class_grade: fields.grade,
    class_subject: fields.subject,
  });
  const classroom = Array.isArray(data) ? data[0] : null;
  if (error || !classroom) {
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
  }
  const { join_code: joinCode, ...classFields } = classroom;
  return NextResponse.json({ class: { ...classFields, joinCode, studentCount: 0 } }, { status: 201 });
}
