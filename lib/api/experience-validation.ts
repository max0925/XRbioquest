import type { ExperienceVisibility } from './game-config-access';

export const MAX_GAME_CONFIG_BYTES = 1_000_000;

export function isValidGameId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
}

export function isValidGameConfig(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  try {
    return JSON.stringify(value).length <= MAX_GAME_CONFIG_BYTES;
  } catch {
    return false;
  }
}

export function isExperienceVisibility(value: unknown): value is Exclude<ExperienceVisibility, null> {
  return value === 'draft' || value === 'published';
}

export function optionalShortText(value: unknown, maxLength: number): value is string | undefined {
  return value === undefined || (typeof value === 'string' && value.trim().length <= maxLength);
}
