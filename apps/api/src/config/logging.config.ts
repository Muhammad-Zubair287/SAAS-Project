import { registerAs } from '@nestjs/config';

export const loggingConfig = registerAs('logging', () => ({
  level: process.env['LOG_LEVEL'] ?? 'info',
  pretty: (process.env['LOG_PRETTY'] ?? 'false') === 'true',
}));
