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
  REDIS_DB: z.coerce.number().int().min(0).default(0),
  REDIS_TLS: z.enum(['true', 'false']).default('false'),
  REDIS_MAX_RECONNECT_DELAY_MS: z.coerce.number().int().positive().default(30000),
  QUEUE_DEFAULT_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  QUEUE_RETRY_DELAY_MS: z.coerce.number().int().positive().default(1000),
  QUEUE_RETRY_MAX_DELAY_MS: z.coerce.number().int().positive().default(300000),
  QUEUE_EVENT_NAME: z.string().min(1).default('platform-domain-events'),
  QUEUE_EVENT_JOB_NAME: z.string().min(1).default('domain-event'),
  QUEUE_DEAD_LETTER_NAME: z.string().min(1).default('platform-dead-letter'),
  QUEUE_DEAD_LETTER_JOB_NAME: z.string().min(1).default('dead-letter-event'),
  OUTBOX_RELAY_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  OUTBOX_RELAY_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(100),
  OUTBOX_RELAY_ENABLED: z.enum(['true', 'false']).default('true'),

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

  // Browser refresh cookie (HttpOnly)
  AUTH_REFRESH_COOKIE_NAME: z.string().default('wcos_refresh'),
  AUTH_REFRESH_COOKIE_PATH: z.string().default('/api/v1/auth'),
  AUTH_REFRESH_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  AUTH_REFRESH_COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  AUTH_REFRESH_COOKIE_DOMAIN: z.string().optional(),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // M02: Web app base URL used in invitation / password-reset email links.
  // Distinct from APP_URL (API). Defaults to local web origin.
  WEB_APP_URL: z.string().url().default('http://localhost:3000'),

  // M02: Shared email delivery (invitation + password reset). Full M13 later.
  EMAIL_ENABLED: z.enum(['true', 'false']).default('false'),
  EMAIL_PROVIDER: z.enum(['smtp']).default('smtp'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(['true', 'false']).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM_NAME: z.string().default('Workforce Cloud OS'),
  EMAIL_FROM_ADDRESS: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().email().optional(),
  ),
  // Optional absolute/relative path for local email capture during development smoke tests.
  EMAIL_CAPTURE_DIR: z.string().optional(),

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
}).superRefine((data, ctx) => {
  if (data.EMAIL_ENABLED !== 'true') {
    return;
  }

  if (!data.SMTP_HOST?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['SMTP_HOST'],
      message: 'SMTP_HOST is required when EMAIL_ENABLED=true',
    });
  }

  if (!data.EMAIL_FROM_ADDRESS?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['EMAIL_FROM_ADDRESS'],
      message: 'EMAIL_FROM_ADDRESS is required when EMAIL_ENABLED=true',
    });
  }
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
