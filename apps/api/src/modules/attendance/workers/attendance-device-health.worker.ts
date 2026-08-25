import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ConsumerInboxRepository } from '../../../platform/inbox/consumer-inbox.repository';
import { DeadLetterService } from '../../../platform/dead-letter/dead-letter.service';
import { WorkerExecutionContextService } from '../../../platform/execution-context/worker-execution-context.service';
import type { EventEnvelope } from '../../../platform/outbox/event-envelope.interface';
import { PlatformMetricsService } from '../../../platform/telemetry/platform-metrics.service';
import { WorkerTelemetryService } from '../../../platform/telemetry/worker-telemetry.service';
import { AbstractConsumer } from '../../../platform/worker/abstract-consumer';
import { ATTENDANCE_EVENTS } from '../constants/attendance-events.constants';
import { DeviceHealthService } from '../services/device-health.service';
import type {
  DeviceHealthScanPayload,
  DeviceHeartbeatPayload,
} from './attendance-outbox.consumer';
import { logWorkerExecution } from './attendance-worker-logging';

@Injectable()
export class AttendanceDeviceHealthWorker extends AbstractConsumer<
  DeviceHeartbeatPayload | DeviceHealthScanPayload
> {
  protected readonly consumerName = 'attendance-device-health';
  private readonly logger = new Logger(AttendanceDeviceHealthWorker.name);

  constructor(
    inbox: ConsumerInboxRepository,
    context: WorkerExecutionContextService,
    telemetry: WorkerTelemetryService,
    metrics: PlatformMetricsService,
    deadLetter: DeadLetterService,
    private readonly deviceHealth: DeviceHealthService,
  ) {
    super(inbox, context, telemetry, metrics, deadLetter);
  }

  protected async handle(
    event: EventEnvelope<DeviceHeartbeatPayload | DeviceHealthScanPayload>,
    _job: Job<EventEnvelope<DeviceHeartbeatPayload | DeviceHealthScanPayload>>,
  ): Promise<void> {
    const startedAt = Date.now();
    const correlationId = event.correlationId ?? event.eventId;

    if (event.eventType === ATTENDANCE_EVENTS.DEVICE_HEALTH_SCAN_REQUESTED) {
      const tenantId = (event.payload as DeviceHealthScanPayload).tenantId ?? event.tenantId;
      if (tenantId) {
        await this.deviceHealth.inspectTenantDeviceHealth(String(tenantId), correlationId);
      } else {
        await this.deviceHealth.inspectAllTenants(correlationId);
      }
      logWorkerExecution(this.logger, this.consumerName, event, startedAt, {
        status: 'success',
        detail: 'Device health scan completed',
      });
      return;
    }

    const tenantId = event.tenantId;
    if (!tenantId) {
      throw new Error('Tenant context is required for device health processing');
    }

    const deviceId = (event.payload as DeviceHeartbeatPayload).deviceId;
    if (!deviceId) {
      logWorkerExecution(this.logger, this.consumerName, event, startedAt, {
        status: 'skipped',
        detail: 'Missing deviceId in heartbeat payload',
      });
      return;
    }

    await this.deviceHealth.processHeartbeatEvent(
      tenantId,
      {
        deviceId,
        health: (event.payload as DeviceHeartbeatPayload).health,
        cpu: (event.payload as DeviceHeartbeatPayload).cpu,
        memory: (event.payload as DeviceHeartbeatPayload).memory,
        disk: (event.payload as DeviceHeartbeatPayload).disk,
        queueLength: (event.payload as DeviceHeartbeatPayload).queueLength,
      },
      correlationId,
    );

    logWorkerExecution(this.logger, this.consumerName, event, startedAt, {
      status: 'success',
      detail: `Processed heartbeat for device ${deviceId}`,
    });
  }
}
