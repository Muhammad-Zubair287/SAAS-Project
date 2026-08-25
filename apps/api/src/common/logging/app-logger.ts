import { ConsoleLogger, type LogLevel } from '@nestjs/common';
import { resolveNestLogLevels } from '../../config/logging.config';

/**
 * Nest framework DI/routing dumps — TRACE/VERBOSE only.
 * DEBUG is reserved for worker/event telemetry, not module/route maps.
 */
const NEST_BOOTSTRAP_NOISE_CONTEXTS = new Set([
  'InstanceLoader',
  'RoutesResolver',
  'RouterExplorer',
  'NestFactory',
]);

function extractContext(optionalParams: unknown[]): string | undefined {
  if (optionalParams.length === 0) return undefined;
  const last = optionalParams[optionalParams.length - 1];
  return typeof last === 'string' ? last : undefined;
}

/**
 * Operational logger: concise default console, structured metadata preserved,
 * Nest bootstrap route/module dumps suppressed unless LOG_LEVEL=trace.
 */
export class AppLogger extends ConsoleLogger {
  constructor(context?: string, logLevels?: LogLevel[]) {
    super(context ?? 'Application', {
      logLevels: logLevels ?? resolveNestLogLevels(),
    });
  }

  private shouldSuppressBootstrapNoise(context?: string): boolean {
    if (!context || !NEST_BOOTSTRAP_NOISE_CONTEXTS.has(context)) return false;
    // Nest emits these as `log`; only surface when verbose/trace is enabled.
    return !this.isLevelEnabled('verbose');
  }

  override log(message: unknown, ...optionalParams: unknown[]): void {
    const context = extractContext(optionalParams);
    if (this.shouldSuppressBootstrapNoise(context)) {
      return;
    }
    super.log(message as string, ...optionalParams);
  }
}
