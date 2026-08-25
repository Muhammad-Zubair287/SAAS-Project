import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { QueueFactory } from '../../../platform/queue/queue.factory';
import { AbstractWorker } from '../../../platform/worker/abstract-worker';
import { WorkerRuntimeService } from '../../../platform/worker/worker-runtime.service';
import { ATTENDANCE_EVENTS } from '../constants/attendance-events.constants';

const DEFAULT_HEALTH_SCAN_INTERVAL_MS = 15 * 60 * 1000;

function formatInterval(ms: number): string {
  if (ms % (60 * 60 * 1000) === 0) return `${ms / (60 * 60 * 1000)}h`;
  if (ms % (60 * 1000) === 0) return `${ms / (60 * 1000)}m`;
  if (ms % 1000 === 0) return `${ms / 1000}s`;
  return `${ms}ms`;
}

@Injectable()
export class AttendanceDeviceHealthScheduler extends AbstractWorker<Record<string, unknown>>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('SCHEDULER');
  private timer?: NodeJS.Timeout;

  constructor(
    runtime: WorkerRuntimeService,
    private readonly config: ConfigService,
    private readonly queues: QueueFactory,
  ) {
    super(runtime);
  }

  onModuleInit(): void {
    const interval = this.config.get<number>(
      'attendance.deviceHealthScanIntervalMs',
      DEFAULT_HEALTH_SCAN_INTERVAL_MS,
    );
    this.timer = setInterval(() => void this.scheduleHealthScan(), interval);
    void this.scheduleHealthScan();
    this.logger.log(`Device health scan scheduled (${formatInterval(interval)})`);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async scheduleHealthScan(): Promise<void> {
    const queueName = this.config.getOrThrow<string>('queue.eventQueueName');
    const jobName = this.config.getOrThrow<string>('queue.eventJobName');
    const queue = this.queues.get(queueName);

    await queue.add(
      jobName,
      {
        eventId: randomUUID(),
        eventType: ATTENDANCE_EVENTS.DEVICE_HEALTH_SCAN_REQUESTED,
        tenantId: null,
        correlationId: randomUUID(),
        occurredAt: new Date().toISOString(),
        payload: {},
      },
      { jobId: `device-health-scan-${Date.now()}` },
    );
  }
}
