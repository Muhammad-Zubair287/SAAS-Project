import { registerAs } from '@nestjs/config';

export const swaggerConfig = registerAs('swagger', () => ({
  enabled: (process.env['SWAGGER_ENABLED'] ?? 'true') === 'true',
  path: process.env['SWAGGER_PATH'] ?? 'docs',
  title: process.env['APP_NAME'] ?? 'Workforce Cloud OS',
  description: 'Workforce Cloud OS REST API — OpenAPI 3.1',
  version: process.env['API_VERSION'] ?? 'v1',
}));
