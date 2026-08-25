import { Injectable, Logger } from '@nestjs/common';
import { trace, type Span } from '@opentelemetry/api';
import type { EventEnvelope } from '../outbox/event-envelope.interface';

@Injectable()
export class WorkerTelemetryService {
  private readonly logger = new Logger(WorkerTelemetryService.name);

  async trace<T>(
    consumerName: string,
    event: EventEnvelope,
    action: () => Promise<T>,
  ): Promise<T> {
    const tracer = trace.getTracer('workforce-cloud-os.worker');
    return tracer.startActiveSpan(`consumer.${consumerName}`, async (span: Span) => {
      span.setAttribute('event.id', event.eventId);
      span.setAttribute('event.type', event.eventType);
      if (event.tenantId) span.setAttribute('tenant.id', event.tenantId);
      if (event.correlationId) span.setAttribute('correlation.id', event.correlationId);
      this.logger.debug(
        {
          consumerName,
          eventId: event.eventId,
          correlationId: event.correlationId,
          tenantId: event.tenantId,
          eventType: event.eventType,
        },
        'Worker event started',
      );
      try {
        const result = await action();
        span.end();
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.end();
        throw error;
      }
    });
  }
}
