import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { getClassroomRole } from '@/lib/classroom/roles';
import { parseJoinRequest } from '@/lib/classroom/validation';

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const joinCode = parseJoinRequest(body);
  if (!joinCode) return NextResponse.json({ error: 'Enter a valid 8-character join code.' }, { status: 400 });

  const { user, supabase } = auth.context;
  if (getClassroomRole(user) !== 'student') {
    return NextResponse.json({ error: 'Only student accounts can join a class.' }, { status: 403 });
  }

  const { data, error } = await supabase.rpc('join_class_by_code', { join_code: joinCode });
  if (error) {
    if (error.message.includes('JOIN_RATE_LIMITED')) {
      return NextResponse.json({ error: 'Too many join attempts. Please wait and try again.' }, { status: 429 });
    }
    return NextResponse.json({ error: 'Classroom service is unavailable. Please try again.' }, { status: 503 });
  }
  const result = Array.isArray(data) ? data[0] : null;
  if (!result) return NextResponse.json({ error: 'That join code was not found.' }, { status: 404 });
  return NextResponse.json({ class: result, alreadyJoined: result.already_joined });
}
