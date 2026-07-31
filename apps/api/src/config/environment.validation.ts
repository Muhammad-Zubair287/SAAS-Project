import { z } from 'zod';

const EnvironmentSchema = z.object({
  APP_NAME: z.string().default('Workforce Cloud OS'),
  APP_VERSION: z.string().default('0.1.0'),
  APP_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  APP_PORT: z.coerce.number().int().positive().default(3001),
  APP_URL: z.string().url().default('http://localhost:3001'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // M02 Auth policy
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(20).default(12),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOCKOUT_DURATION_MINUTES: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_EXPIRY_HOURS: z.coerce.number().int().positive().default(24),
  INVITATION_EXPIRY_HOURS: z.coerce.number().int().positive().default(72),
  // 64-char hex string (32 bytes) for AES-256-GCM TOTP secret encryption
  MFA_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'MFA_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)').optional(),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  API_PREFIX: z.string().default('api'),
  API_VERSION: z.string().default('v1'),

  SWAGGER_ENABLED: z.enum(['true', 'false']).default('true'),
  SWAGGER_PATH: z.string().default('docs'),

  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
  LOG_PRETTY: z.enum(['true', 'false']).default('false'),

  THROTTLE_TTL: z.coerce.number().int().positive().default(60000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),

  UPLOAD_MAX_FILE_SIZE: z.coerce.number().int().positive().default(10485760),
  UPLOAD_ALLOWED_MIME_TYPES: z
    .string()
    .default('image/jpeg,image/png,application/pdf'),

  HEALTH_TIMEOUT: z.coerce.number().int().positive().default(3000),
});

export type EnvironmentVariables = z.infer<typeof EnvironmentSchema>;

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const result = EnvironmentSchema.safeParse(config);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }
  return result.data;
}
