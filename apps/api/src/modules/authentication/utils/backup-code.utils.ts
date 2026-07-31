import { randomBytes } from 'crypto';

const BACKUP_CODE_COUNT = 10;

export function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const hex = randomBytes(4).toString('hex').toUpperCase();
    return `${hex.slice(0, 4)}-${hex.slice(4)}`;
  });
}
