import { Logger } from '@nestjs/common';
import type { EventEnvelope } from '../../../platform/outbox/event-envelope.interface';

export interface WorkerLogResult {
  status: 'success' | 'skipped' | 'failed';
  detail?: string;
}

/**
 * Structured worker execution telemetry.
 * Success/observation details → DEBUG (quiet default terminal).
 * Unexpected skips → WARN. Failures → ERROR.
 * Metadata (eventId/correlationId/tenantId) is preserved for DEBUG/WARN/ERROR.
 */
export function logWorkerExecution(
  logger: Logger,
  workerName: string,
  event: EventEnvelope,
  startedAt: number,
  result: WorkerLogResult,
): void {
  const payload = {
    workerName,
    tenantId: event.tenantId,
    eventId: event.eventId,
    correlationId: event.correlationId,
    eventType: event.eventType,
    executionTimeMs: Date.now() - startedAt,
    result: result.status,
    detail: result.detail,
  };

  if (result.status === 'failed') {
    logger.error(payload);
    return;
  }

  if (result.status === 'skipped') {
    const unhandled = (result.detail ?? '').toLowerCase().includes('unhandled');
    if (unhandled) {
      logger.warn(payload);
    } else {
      // Suspicious but non-fatal skips (e.g. missing fields) stay visible.
      logger.warn(payload);
    }
    return;
  }

  logger.debug(payload);
}
