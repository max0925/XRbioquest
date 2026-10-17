type StartAttemptFields = { assignmentId: string; experienceId: string };
type RecordProgressFields = { experienceId: string; phaseId: string; answer: { option_id: string } | null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function boundedString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const result = value.trim();
  return result && result.length <= max ? result : null;
}

export function parseStartAttempt(value: unknown): StartAttemptFields | null {
  if (!isRecord(value)) return null;
  const assignmentId = boundedString(value.assignmentId, 100);
  const experienceId = boundedString(value.experienceId, 128);
  return assignmentId && experienceId ? { assignmentId, experienceId } : null;
}

export function parseProgress(value: unknown): RecordProgressFields | null {
  if (!isRecord(value)) return null;
  const experienceId = boundedString(value.experienceId, 128);
  const phaseId = boundedString(value.phaseId, 200);
  if (!experienceId || !phaseId) return null;
  if (value.answer === undefined || value.answer === null) return { experienceId, phaseId, answer: null };
  if (!isRecord(value.answer)) return null;
  const optionId = boundedString(value.answer.option_id, 200);
  if (!optionId || Object.keys(value.answer).some((key) => key !== 'option_id')) return null;
  return { experienceId, phaseId, answer: { option_id: optionId } };
}
