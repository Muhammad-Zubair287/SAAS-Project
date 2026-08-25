import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import type { EventEnvelope } from '../../../platform/outbox/event-envelope.interface';
import { WorkerRuntimeService } from '../../../platform/worker/worker-runtime.service';
import { isAttendanceDomainEvent } from '../constants/attendance-events.constants';
import { AttendanceOutboxConsumer } from './attendance-outbox.consumer';

@Injectable()
export class AttendanceWorkerBootstrapService implements OnModuleInit {
  private readonly logger = new Logger('WORKER');

  constructor(
    private readonly runtime: WorkerRuntimeService,
    private readonly config: ConfigService,
    private readonly outboxConsumer: AttendanceOutboxConsumer,
  ) {}

  onModuleInit(): void {
    const queueName = this.config.getOrThrow<string>('queue.eventQueueName');
    this.runtime.register(queueName, (job: Job<EventEnvelope>) => this.dispatch(job));
    this.logger.log('Attendance workers ready');
    this.logger.debug(`Attendance worker processor registered on queue: ${queueName}`);
  }

  private async dispatch(job: Job<EventEnvelope>): Promise<void> {
    const eventType = job.data.eventType;
    if (!isAttendanceDomainEvent(eventType)) {
      return;
    }
    await this.outboxConsumer.process(job);
  }
}
