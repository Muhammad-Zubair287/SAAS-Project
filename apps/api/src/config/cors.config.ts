import { registerAs } from '@nestjs/config';

export const corsConfig = registerAs('cors', () => ({
  origins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim()),
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Tenant-Id',
    'Idempotency-Key',
    'X-Correlation-ID',
    'If-Match',
  ],
  exposedHeaders: ['ETag', 'X-Correlation-ID'],
  credentials: true,
}));
