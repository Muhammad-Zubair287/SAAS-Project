import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import type { EventEnvelope } from '../outbox/event-envelope.interface';

export interface WorkerExecutionContext {
  tenantId?: string | null;
  correlationId?: string;
  causationId?: string;
  eventId: string;
  eventType: string;
}

const workerContextStorage = new AsyncLocalStorage<WorkerExecutionContext>();

@Injectable()
export class WorkerExecutionContextService {
  constructor(private readonly prisma: PrismaService) {}

  get context(): WorkerExecutionContext | undefined {
    return workerContextStorage.getStore();
  }

  execute<T>(event: EventEnvelope, action: () => Promise<T>): Promise<T> {
    const store: WorkerExecutionContext = {
      tenantId: event.tenantId,
      correlationId: event.correlationId,
      causationId: event.causationId,
      eventId: event.eventId,
      eventType: event.eventType,
    };
    const run = () => workerContextStorage.run(store, action);
    return event.tenantId
      ? this.prisma.withTenantTransaction(event.tenantId, run)
      : this.prisma.withTransaction(run);
  }
}
