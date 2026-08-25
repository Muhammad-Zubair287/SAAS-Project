import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, type AttendanceDeviceHeartbeat } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditEventSeverity } from '../../../common/enums/platform.enum';
import { AttendanceDeviceRepository } from '../repositories/attendance-device.repository';
import { AttendanceDeviceHeartbeatRepository } from '../repositories/attendance-device-heartbeat.repository';
import { DeviceRegistryService } from './device-registry.service';

export interface HeartbeatInput {
  ipAddress?: string;
  cpu?: number; // Percentage 0-100
  memory?: number; // Percentage 0-100
  disk?: number; // Percentage 0-100
  queueLength?: number; // Number of pending events
  firmwareVersion?: string;
  clockOffsetMs?: number; // Offset from server clock (ms)
  lastSyncAt?: Date;
  metadata?: Record<string, unknown>;
}

export enum DeviceHealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  OFFLINE = 'OFFLINE',
}

/**
 * DeviceHeartbeatService
 *
 * Handles periodic heartbeat messages from devices.
 * Records:
 * - Device metrics (CPU, memory, disk, queue length)
 * - Firmware version and clock offset
 * - Last seen timestamp
 * - Health status (computed from metrics)
 *
 * Heartbeats are fire-and-forget from the device perspective.
 * Failed heartbeats are logged but do not cause errors.
 */
@Injectable()
export class DeviceHeartbeatService {
  private readonly logger = new Logger(DeviceHeartbeatService.name);

  // Health thresholds
  private readonly HEALTHY_CPU_THRESHOLD = 80; // % usage
  private readonly HEALTHY_MEMORY_THRESHOLD = 80; // % usage
  private readonly HEALTHY_DISK_THRESHOLD = 85; // % usage
  private readonly HEALTHY_QUEUE_THRESHOLD = 100; // pending events
  private readonly CLOCK_OFFSET_WARNING_MS = 5000; // 5 seconds

  constructor(
    private readonly deviceRepo: AttendanceDeviceRepository,
    private readonly heartbeatRepo: AttendanceDeviceHeartbeatRepository,
    private readonly registryService: DeviceRegistryService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Receive and process a device heartbeat.
   * Records metrics, updates device health status.
   * Fire-and-forget: errors are logged but do not throw.
   */
  async receiveHeartbeat(
    deviceId: string,
    tenantId: string,
    input: HeartbeatInput,
    correlationId: string,
  ): Promise<void> {
    try {
      const device = await this.deviceRepo.findById(deviceId, tenantId);
      if (!device) {
        this.logger.warn(
          `Heartbeat received for unknown device ${deviceId} in tenant ${tenantId}`,
        );
        return;
      }

      const now = new Date();

      // Record heartbeat in database
      const heartbeat = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
        const created = await tx.attendanceDeviceHeartbeat.create({
          data: {
            tenantId,
            deviceId,
            occurredAt: now,
            ipAddress: input.ipAddress ?? null,
            cpu: input.cpu ?? null,
            memory: input.memory ?? null,
            disk: input.disk ?? null,
            queueLength: input.queueLength ?? null,
            firmwareVersion: input.firmwareVersion ?? null,
            clockOffsetMs: input.clockOffsetMs ?? null,
            lastSyncAt: input.lastSyncAt ?? null,
            metrics: this.buildMetricsJson(input),
            createdAt: now,
          },
        });

        // Outbox: Heartbeat received
        await tx.outboxEvent.create({
          data: {
            tenantId,
            eventId: randomUUID(),
            eventType: 'AttendanceDeviceHeartbeat.v1',
            payload: {
              deviceId,
              cpu: input.cpu,
              memory: input.memory,
              disk: input.disk,
              queueLength: input.queueLength,
              health: this.computeHealthStatus(input),
              correlationId,
            },
          },
        });

        return created;
      });

      // Update device last seen (fire-and-forget)
      void this.registryService.touchLastSeen(deviceId, tenantId).catch(() => undefined);

      // Log heartbeat (optional detailed analytics)
      this.logger.debug(
        `Heartbeat from device ${deviceId}: CPU=${input.cpu}%, Memory=${input.memory}%, Health=${this.computeHealthStatus(input)}`,
      );

      // Check for alerts (e.g., clock skew, high queue)
      this.checkHeartbeatAlerts(deviceId, tenantId, input, correlationId).catch((err) => {
        this.logger.error(
          `Error checking heartbeat alerts for device ${deviceId}:`,
          err,
        );
      });
    } catch (error) {
      // Never throw from heartbeat processing
      this.logger.error(
        `Error processing heartbeat for device ${deviceId}:`,
        error,
      );
    }
  }

  /**
   * Compute device health status from metrics.
   */
  computeHealthStatus(input: HeartbeatInput): DeviceHealthStatus {
    const issues: string[] = [];

    if (input.cpu !== undefined && input.cpu > this.HEALTHY_CPU_THRESHOLD) {
      issues.push(`CPU high (${input.cpu}%)`);
    }

    if (input.memory !== undefined && input.memory > this.HEALTHY_MEMORY_THRESHOLD) {
      issues.push(`Memory high (${input.memory}%)`);
    }

    if (input.disk !== undefined && input.disk > this.HEALTHY_DISK_THRESHOLD) {
      issues.push(`Disk usage high (${input.disk}%)`);
    }

    if (input.queueLength !== undefined && input.queueLength > this.HEALTHY_QUEUE_THRESHOLD) {
      issues.push(`Queue backlog high (${input.queueLength})`);
    }

    if (
      input.clockOffsetMs !== undefined &&
      Math.abs(input.clockOffsetMs) > this.CLOCK_OFFSET_WARNING_MS
    ) {
      issues.push(`Clock skew high (${input.clockOffsetMs}ms)`);
    }

    if (issues.length === 0) {
      return DeviceHealthStatus.HEALTHY;
    }

    if (issues.length <= 2) {
      return DeviceHealthStatus.DEGRADED;
    }

    return DeviceHealthStatus.UNHEALTHY;
  }

  /**
   * Build JSON metrics object for storage.
   */
  private buildMetricsJson(input: HeartbeatInput): Prisma.InputJsonValue {
    return {
      cpuPercentage: input.cpu,
      memoryPercentage: input.memory,
      diskPercentage: input.disk,
      queueLength: input.queueLength,
      firmwareVersion: input.firmwareVersion,
      clockOffsetMs: input.clockOffsetMs,
      lastSyncAt: input.lastSyncAt?.toISOString(),
      ...input.metadata,
    };
  }

  /**
   * Check for conditions that should trigger alerts.
   * Emits audit events for concerning conditions.
   */
  private async checkHeartbeatAlerts(
    deviceId: string,
    tenantId: string,
    input: HeartbeatInput,
    correlationId: string,
  ): Promise<void> {
    const alerts: Array<{ severity: string; message: string }> = [];

    // Check clock skew
    if (
      input.clockOffsetMs !== undefined &&
      Math.abs(input.clockOffsetMs) > this.CLOCK_OFFSET_WARNING_MS
    ) {
      alerts.push({
        severity: 'WARNING',
        message: `Device clock is ${input.clockOffsetMs}ms offset from server`,
      });
    }

    // Check queue backlog
    if (input.queueLength !== undefined && input.queueLength > this.HEALTHY_QUEUE_THRESHOLD) {
      alerts.push({
        severity: 'WARNING',
        message: `Device has high queue backlog: ${input.queueLength} pending events`,
      });
    }

    // Check critical resource usage
    if (input.disk !== undefined && input.disk > 95) {
      alerts.push({
        severity: 'ERROR',
        message: `Device disk usage critical: ${input.disk}%`,
      });
    }

    if (input.memory !== undefined && input.memory > 95) {
      alerts.push({
        severity: 'ERROR',
        message: `Device memory usage critical: ${input.memory}%`,
      });
    }

    // Record alerts as audit events
    if (alerts.length > 0) {
      try {
        await this.prisma.auditEvent.create({
          data: {
            tenantId,
            actorId: deviceId,
            actorType: 'DEVICE',
            module: 'ATTENDANCE',
            action: 'DeviceHeartbeatAlert',
            resourceType: 'attendance_device',
            resourceId: deviceId,
            metadata: {
              alerts,
              metrics: this.buildMetricsJson(input),
            } as Prisma.InputJsonValue,
            correlationId,
            severity: alerts.some((a) => a.severity === 'ERROR')
              ? AuditEventSeverity.CRITICAL
              : AuditEventSeverity.WARNING,
            occurredAt: new Date(),
          },
        });
      } catch (error) {
        // Audit failure should never block heartbeat
        this.logger.error(
          `Failed to record heartbeat alert for device ${deviceId}:`,
          error,
        );
      }
    }
  }

  /**
   * Get the latest heartbeat for a device.
   */
  async getLatestHeartbeat(
    deviceId: string,
    tenantId: string,
  ): Promise<AttendanceDeviceHeartbeat | null> {
    const heartbeats = await this.heartbeatRepo.findByDeviceId(deviceId, tenantId);
    return (heartbeats && heartbeats.length > 0 ? heartbeats[0] : null) as AttendanceDeviceHeartbeat | null;
  }

  /**
   * Get heartbeats within a time range (for analytics).
   */
  async getHeartbeatHistory(
    deviceId: string,
    tenantId: string,
    sinceHours: number = 24,
  ): Promise<AttendanceDeviceHeartbeat[]> {
    const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
    const until = new Date();
    return this.heartbeatRepo.findInDateRange(tenantId, deviceId, since, until);
  }

  /**
   * Detect offline devices (no heartbeat in timeout window).
   * Called by DeviceHealthService periodically.
   */
  async detectOfflineDevices(
    tenantId: string,
    offlineThresholdMinutes: number = 30,
  ): Promise<string[]> {
    const threshold = new Date(Date.now() - offlineThresholdMinutes * 60 * 1000);

    // Get all devices and check their latest heartbeat
    const devices = await this.deviceRepo.findMany(tenantId, {});
    const offlineDeviceIds: string[] = [];

    for (const device of devices.data) {
      const latest = await this.heartbeatRepo.findLatestForDevice(device.id, tenantId);
      if (!latest || latest.occurredAt < threshold) {
        offlineDeviceIds.push(device.id);
      }
    }

    return offlineDeviceIds;
  }
}
