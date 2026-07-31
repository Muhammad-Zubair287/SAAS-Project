import { registerAs } from '@nestjs/config';

// M02: Auth-specific configuration (password policy, lockout, invitation expiry).
// JWT-related config (secret, token expiry) lives in jwt.config.ts.
export const authConfig = registerAs('auth', () => ({
  bcryptRounds: parseInt(process.env['BCRYPT_ROUNDS'] ?? '12', 10),
  maxLoginAttempts: parseInt(process.env['MAX_LOGIN_ATTEMPTS'] ?? '5', 10),
  lockoutDurationMinutes: parseInt(process.env['LOCKOUT_DURATION_MINUTES'] ?? '30', 10),
  passwordResetExpiryHours: parseInt(process.env['PASSWORD_RESET_EXPIRY_HOURS'] ?? '24', 10),
  invitationExpiryHours: parseInt(process.env['INVITATION_EXPIRY_HOURS'] ?? '72', 10),
  mfaEncryptionKey: process.env['MFA_ENCRYPTION_KEY'] ?? '',
}));
