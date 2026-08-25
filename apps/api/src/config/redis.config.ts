import { registerAs } from '@nestjs/config';

export const redisConfig = registerAs('redis', () => ({
  host: process.env['REDIS_HOST'] ?? 'localhost',
  port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
  password: process.env['REDIS_PASSWORD'] || undefined,
  database: parseInt(process.env['REDIS_DB'] ?? '0', 10),
  tls: (process.env['REDIS_TLS'] ?? 'false') === 'true',
  maxReconnectDelayMs: parseInt(process.env['REDIS_MAX_RECONNECT_DELAY_MS'] ?? '30000', 10),
}));
