import { createHash, randomBytes } from 'crypto';

// Generates a 64-char hex random token (256 bits of entropy).
export function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

// SHA-256 hash of a token — deterministic, enabling DB index lookup.
// Used for invitation tokens and password reset tokens (not passwords — use PasswordService for those).
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
