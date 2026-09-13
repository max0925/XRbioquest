import { randomBytes } from 'node:crypto';
import { JOIN_CODE_LENGTH } from './validation.ts';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_UNBIASED_BYTE = 256 - (256 % ALPHABET.length);

export function createJoinCode(): string {
  let code = '';
  while (code.length < JOIN_CODE_LENGTH) {
    const bytes = randomBytes(JOIN_CODE_LENGTH - code.length);
    for (const byte of bytes) {
      if (byte >= MAX_UNBIASED_BYTE) continue;
      code += ALPHABET[byte % ALPHABET.length];
      if (code.length === JOIN_CODE_LENGTH) break;
    }
  }
  return code;
}
