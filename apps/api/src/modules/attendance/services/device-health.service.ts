import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { AttendanceDeviceHeartbeatRepository } from '../repositories/attendance-device-heartbeat.repository';
import { AttendanceDeviceRepository } from '../repositories/attendance-device.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { ATTENDANCE_EVENTS } from '../constants/attendance-events.constants';

export interface DeviceHealthSummary {
  deviceId: string;
  lastSeenAt?: Date;
  healthStatus: string;
  averageCpu?: number;
  averageMemory?: number;
  averageDisk?: number;
  outstandingQueue?: number;
}

/**
 * DeviceHealthService
 *
 * Aggregates heartbeat metrics and computes health summaries for devices.
 * Detects stale/offline devices and generates simple summaries for monitoring.
 */
@Injectable()
export class DeviceHealthService {
  private readonly logger = new Logger(DeviceHealthService.name);

  constructor(
    private readonly heartbeatRepo: AttendanceDeviceHeartbeatRepository,
    private readonly deviceRepo: AttendanceDeviceRepository,
    private readonly prisma: PrismaService,
  ) {}

  async summarizeTenantDevices(tenantId: string): Promise<DeviceHealthSummary[]> {
    // Get devices for tenant
    const { data: devices } = await this.deviceRepo.findMany(tenantId, {});
    const summaries: DeviceHealthSummary[] = [];

    for (const d of devices) {
      const latest = await this.heartbeatRepo.findLatestForDevice(d.id, tenantId);
      const recent = await this.heartbeatRepo.findByDeviceId(d.id, tenantId, 50);

      const avgCpu = this.average(recent.map((r) => r.cpu).filter((v) => v !== null) as number[]);
      const avgMem = this.average(recent.map((r) => r.memory).filter((v) => v !== null) as number[]);
      const avgDisk = this.average(recent.map((r) => r.disk).filter((v) => v !== null) as number[]);
      const outstandingQueue = recent.length > 0 ? (recent[0]?.queueLength ?? 0) : 0;

      const healthStatus = this.determineStatus(d, latest, avgCpu, avgMem, avgDisk, outstandingQueue);

      summaries.push({
        deviceId: d.id,
        lastSeenAt: d.lastSeenAt ?? latest?.occurredAt ?? undefined,
        healthStatus,
        averageCpu: avgCpu,
        averageMemory: avgMem,
        averageDisk: avgDisk,
        outstandingQueue,
      });
    }

    return summaries;
  }

  /** Worker entry point: inspect all active tenants and publish health change events. */
  async inspectAllTenants(correlationId: string): Promise<void> {
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });
    for (const tenant of tenants) {
      await this.inspectTenantDeviceHealth(tenant.id, correlationId);
    }
  }

  /** Worker entry point: inspect devices for a tenant and publish DeviceHealthChanged events. */
  async inspectTenantDeviceHealth(tenantId: string, correlationId: string): Promise<void> {
    const summaries = await this.summarizeTenantDevices(tenantId);
    for (const summary of summaries) {
      if (summary.healthStatus === 'HEALTHY') {
        continue;
      }
      await this.prisma.withTenantTransaction(tenantId, async (tx) => {
        await tx.outboxEvent.create({
          data: {
            tenantId,
            eventId: randomUUID(),
            eventType: ATTENDANCE_EVENTS.DEVICE_HEALTH_CHANGED,
            payload: {
              deviceId: summary.deviceId,
              healthStatus: summary.healthStatus,
              lastSeenAt: summary.lastSeenAt?.toISOString(),
              averageCpu: summary.averageCpu,
              averageMemory: summary.averageMemory,
              averageDisk: summary.averageDisk,
              outstandingQueue: summary.outstandingQueue,
              correlationId,
            },
          },
        });
      });
    }
  }

  /** Process a heartbeat event and evaluate device health transitions. */
  async processHeartbeatEvent(
    tenantId: string,
    payload: {
      deviceId: string;
      health?: string;
      cpu?: number;
      memory?: number;
      disk?: number;
      queueLength?: number;
    },
    correlationId: string,
  ): Promise<void> {
    const device = await this.deviceRepo.findById(payload.deviceId, tenantId);
    if (!device) {
      return;
    }

    const latest = await this.heartbeatRepo.findLatestForDevice(payload.deviceId, tenantId);
    const healthStatus = this.determineStatus(
      device,
      latest,
      payload.cpu,
      payload.memory,
      payload.disk,
      payload.queueLength,
    );

    if (['OFFLINE', 'DEGRADED', 'UNHEALTHY', 'SUSPENDED'].includes(healthStatus)) {
      await this.prisma.withTenantTransaction(tenantId, async (tx) => {
        await tx.outboxEvent.create({
          data: {
            tenantId,
            eventId: randomUUID(),
            eventType: ATTENDANCE_EVENTS.DEVICE_HEALTH_CHANGED,
            payload: {
              deviceId: payload.deviceId,
              healthStatus,
              correlationId,
            },
          },
        });
      });
    }
  }

  private average(values: number[]): number | undefined {
    if (!values || values.length === 0) return undefined;
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round((sum / values.length) * 100) / 100;
  }

  private determineStatus(
    device: { status: string },
    latest: { occurredAt?: Date } | null,
    avgCpu?: number,
    avgMem?: number,
    avgDisk?: number,
    queueLen?: number,
  ): string {
    // If device is suspended or decommissioned, report that
    if (device.status === 'SUSPENDED') return 'SUSPENDED';
    if (device.status === 'DECOMMISSIONED') return 'DECOMMISSIONED';

    // If no recent heartbeat within 30 minutes, offline
    if (!latest || !latest.occurredAt) return 'OFFLINE';
    const ageMs = Date.now() - latest.occurredAt.getTime();
    if (ageMs > 30 * 60 * 1000) return 'OFFLINE';

    // Heuristic thresholds
    if ((avgCpu ?? 0) > 90 || (avgMem ?? 0) > 90 || (avgDisk ?? 0) > 95) return 'UNHEALTHY';
    if ((avgCpu ?? 0) > 75 || (avgMem ?? 0) > 75 || (avgDisk ?? 0) > 85 || (queueLen ?? 0) > 1000) return 'DEGRADED';

    return 'HEALTHY';
  }
}
