export const JOIN_CODE_LENGTH = 8;

export function normalizeJoinCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase().replace(/[\s-]+/g, '');
  return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(code) ? code : null;
}

export function optionalClassText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}

export type ClassFields = { name: string; grade: string; subject: string };

export function parseClassFields(value: unknown): ClassFields | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const name = optionalClassText(body.name, 120);
  const grade = optionalClassText(body.grade, 40);
  const subject = optionalClassText(body.subject, 80);
  return name && grade && subject ? { name, grade, subject } : null;
}

export function parseJoinRequest(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return normalizeJoinCode((value as Record<string, unknown>).joinCode);
}
