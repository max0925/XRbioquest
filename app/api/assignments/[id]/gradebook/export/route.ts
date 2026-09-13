import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api/auth';
import { getClassroomRole } from '@/lib/classroom/roles';
import { csvCell, formatDuration } from '@/lib/assignments/gradebook';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;
  if (getClassroomRole(auth.context.user) !== 'teacher') return NextResponse.json({ error: 'Only teachers can export Gradebook.' }, { status: 403 });
  const { id } = await context.params;
  const { data, error } = await auth.context.supabase.rpc('get_assignment_gradebook', { p_assignment_id: id });
  if (error) return NextResponse.json({ error: 'Gradebook is unavailable or you do not have access.' }, { status: 403 });

  const header = ['Student', 'Status', 'Started', 'Completed', 'Duration', 'Auto score', 'Teacher adjustment', 'Final score', 'Attempts'];
  const rows = (data ?? []).map((row) => [
    row.display_name, row.status, row.started_at, row.completed_at,
    formatDuration(row.duration_seconds), `${row.auto_score} / ${row.max_score}`,
    row.manual_adjustment, row.final_score, row.attempt_count,
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gradebook-${id}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
