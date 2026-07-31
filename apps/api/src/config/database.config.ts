import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  url: process.env['DATABASE_URL'] ?? '',
  healthTimeoutMs: parseInt(process.env['HEALTH_TIMEOUT'] ?? '3000', 10),
}));
