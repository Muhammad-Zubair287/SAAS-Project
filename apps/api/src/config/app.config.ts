import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  name: process.env['APP_NAME'] ?? 'Workforce Cloud OS',
  version: process.env['APP_VERSION'] ?? '0.1.0',
  env: process.env['APP_ENV'] ?? 'development',
  port: parseInt(process.env['APP_PORT'] ?? '3001', 10),
  url: process.env['APP_URL'] ?? 'http://localhost:3001',
  apiPrefix: process.env['API_PREFIX'] ?? 'api',
  apiVersion: process.env['API_VERSION'] ?? 'v1',
  isProduction: (process.env['APP_ENV'] ?? 'development') === 'production',
  isDevelopment: (process.env['APP_ENV'] ?? 'development') === 'development',
}));
