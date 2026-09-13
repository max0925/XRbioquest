export type AssignmentFields = {
  classId: string;
  experienceId: string;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  allowRetries: boolean;
};

function boundedText(value: unknown, max: number, required: boolean): string | null {
  if (value === undefined || value === null || value === '') return required ? null : '';
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if ((required && !text) || text.length > max) return null;
  return text;
}

export function parseAssignmentFields(value: unknown): AssignmentFields | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const classId = boundedText(body.classId, 100, true);
  const experienceId = boundedText(body.experienceId, 128, true);
  const title = boundedText(body.title, 200, true);
  const instructions = boundedText(body.instructions, 2_000, false);
  if (!classId || !experienceId || !title || instructions === null || typeof body.allowRetries !== 'boolean') return null;

  let dueAt: string | null = null;
  if (body.dueAt !== undefined && body.dueAt !== null && body.dueAt !== '') {
    if (typeof body.dueAt !== 'string') return null;
    const parsed = new Date(body.dueAt);
    if (Number.isNaN(parsed.getTime())) return null;
    dueAt = parsed.toISOString();
  }
  return { classId, experienceId, title, instructions: instructions || null, dueAt, allowRetries: body.allowRetries };
}
