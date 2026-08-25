import { registerAs } from '@nestjs/config';
import type { LogLevel } from '@nestjs/common';

export type AppLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Maps application LOG_LEVEL → NestJS ConsoleLogger levels.
 * Nest has no 'trace'/'fatal'/'info' — those map onto verbose/error/log.
 */
export function resolveNestLogLevels(
  level: string | undefined = process.env['LOG_LEVEL'],
): LogLevel[] {
  const normalised = (level ?? 'info').toLowerCase();
  switch (normalised) {
    case 'trace':
      return ['verbose', 'debug', 'log', 'warn', 'error'];
    case 'debug':
      return ['debug', 'log', 'warn', 'error'];
    case 'info':
      return ['log', 'warn', 'error'];
    case 'warn':
      return ['warn', 'error'];
    case 'error':
    case 'fatal':
      return ['error'];
    default:
      return ['log', 'warn', 'error'];
  }
}

export function isDebugLoggingEnabled(
  level: string | undefined = process.env['LOG_LEVEL'],
): boolean {
  const normalised = (level ?? 'info').toLowerCase();
  return normalised === 'debug' || normalised === 'trace';
}

export const loggingConfig = registerAs('logging', () => ({
  level: (process.env['LOG_LEVEL'] ?? 'info') as AppLogLevel,
  pretty: (process.env['LOG_PRETTY'] ?? 'false') === 'true',
  nestLevels: resolveNestLogLevels(process.env['LOG_LEVEL']),
}));
