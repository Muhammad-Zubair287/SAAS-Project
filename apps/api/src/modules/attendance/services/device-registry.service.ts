import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, DeviceStatus, type AttendanceDevice } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditActorType, AuditEventSeverity } from '../../../common/enums/platform.enum';
import { APP_CONSTANTS } from '../../../common/constants/app.constants';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { ApiSuccessResponse } from '../../../common/interfaces/api-response.interface';
import { AttendanceDeviceRepository } from '../repositories/attendance-device.repository';
import type { ListAttendanceDevicesDto } from '../dto/list-attendance-devices.dto';
import { toDeviceResponse, type DeviceResponseDto } from '../dto/attendance-capture.dto';

export interface RegisterDeviceInput {
  name: string;
  deviceType: string;
  serialNumber: string;
  vendor?: string;
  model?: string;
  timezone?: string;
  metadata?: Record<string, unknown>;
}

export interface ProvisionDeviceInput {
  deviceFingerprint: string;
  publicKeyFingerprint: string;
  ipWhitelist?: string[];
}

export interface ReplaceDeviceInput {
  newSerialNumber: string;
  newDeviceFingerprint?: string;
  newPublicKeyFingerprint?: string;
}

/**
 * DeviceRegistryService
 *
 * Manages device lifecycle:
 * PENDING → ACTIVE → SUSPENDED → DECOMMISSIONED
 *
 * Also handles device replacement and credential rotation.
 * All state changes are atomic (device + audit + outbox).
 */
@Injectable()
export class DeviceRegistryService {
  private readonly logger = new Logger(DeviceRegistryService.name);

  constructor(
    private readonly deviceRepo: AttendanceDeviceRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findMany(
    query: ListAttendanceDevicesDto,
    tenantId: string,
  ): Promise<ApiSuccessResponse<DeviceResponseDto[]>> {
    const page = query.page ?? APP_CONSTANTS.DEFAULT_PAGE;
    const pageSize = query.pageSize ?? APP_CONSTANTS.DEFAULT_PAGE_SIZE;
    const { data, total } = await this.deviceRepo.findMany(tenantId, {
      page,
      pageSize,
      status: query.status,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return createPaginatedResponse(
      data.map(toDeviceResponse),
      total,
      page,
      pageSize,
    );
  }

  async findById(deviceId: string, tenantId: string): Promise<DeviceResponseDto> {
    const device = await this.deviceRepo.findById(deviceId, tenantId);
    if (!device) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Device not found.',
      });
    }
    return toDeviceResponse(device);
  }

  /**
   * Register a new device in PENDING status.
   * Device must be provisioned before it can be activated.
   */
  async registerDevice(
    tenantId: string,
    input: RegisterDeviceInput,
    actorId: string,
    actorEmail: string,
    correlationId: string,
  ): Promise<AttendanceDevice> {
    // Validate uniqueness: serial number must be unique per tenant
    const existing = await this.deviceRepo.findBySerialNumber(input.serialNumber, tenantId);
    if (existing) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_SERIAL_CONFLICT,
        statusCode: HttpStatus.CONFLICT,
        message: `Device with serial number "${input.serialNumber}" already exists in this tenant.`,
      });
    }

    const device = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const created = await tx.attendanceDevice.create({
        data: {
          tenantId,
          name: input.name,
          deviceType: input.deviceType,
          serialNumber: input.serialNumber,
          vendor: input.vendor ?? null,
          model: input.model ?? null,
          timezone: input.timezone ?? null,
          metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
          status: DeviceStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Audit: Device Registration
      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType: AuditActorType.USER,
          actorEmail,
          module: 'ATTENDANCE',
          action: 'DeviceRegistered',
          resourceType: 'attendance_device',
          resourceId: created.id,
          after: {
            id: created.id,
            name: created.name,
            serialNumber: created.serialNumber,
            status: created.status,
          } as Prisma.InputJsonValue,
          correlationId,
          severity: AuditEventSeverity.INFO,
          occurredAt: new Date(),
        },
      });

      // Outbox: Device registration event
      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'AttendanceDeviceRegistered.v1',
          payload: {
            deviceId: created.id,
            serialNumber: created.serialNumber,
            deviceType: created.deviceType,
            status: created.status,
            correlationId,
          },
        },
      });

      return created;
    });

    return device;
  }

  /**
   * Provision a device by storing its cryptographic fingerprints.
   * Moves device from PENDING to ACTIVE status.
   * Can only be called on PENDING devices.
   */
  async provisionDevice(
    deviceId: string,
    tenantId: string,
    input: ProvisionDeviceInput,
    actorId: string,
    actorEmail: string,
    correlationId: string,
  ): Promise<AttendanceDevice> {
    const device = await this.deviceRepo.findById(deviceId, tenantId);
    if (!device) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Device not found.',
      });
    }

    if (device.status !== DeviceStatus.PENDING) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_INVALID_STATUS,
        statusCode: HttpStatus.CONFLICT,
        message: `Cannot provision device with status "${device.status}". Only PENDING devices can be provisioned.`,
      });
    }

    const updated = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const result = await tx.attendanceDevice.update({
        where: { id: deviceId },
        data: {
          deviceFingerprint: input.deviceFingerprint,
          publicKeyFingerprint: input.publicKeyFingerprint,
          ipWhitelist: input.ipWhitelist ?? [],
          status: DeviceStatus.ACTIVE,
          updatedAt: new Date(),
        },
      });

      // Audit: Device Provisioned
      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType: AuditActorType.USER,
          actorEmail,
          module: 'ATTENDANCE',
          action: 'DeviceProvisioned',
          resourceType: 'attendance_device',
          resourceId: deviceId,
          before: {
            status: device.status,
          } as Prisma.InputJsonValue,
          after: {
            id: result.id,
            status: result.status,
            deviceFingerprint: '***' as string,
            publicKeyFingerprint: '***' as string,
          } as Prisma.InputJsonValue,
          correlationId,
          severity: AuditEventSeverity.INFO,
          occurredAt: new Date(),
        },
      });

      // Outbox: Device provisioned
      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'AttendanceDeviceProvisioned.v1',
          payload: {
            deviceId: result.id,
            serialNumber: result.serialNumber,
            status: result.status,
            correlationId,
          },
        },
      });

      return result;
    });

    return updated;
  }

  /**
   * Activate a device. Idempotent: calling on an already-active device succeeds.
   * Can only be called on PENDING or ACTIVE devices.
   */
  async activateDevice(
    deviceId: string,
    tenantId: string,
    actorId: string,
    actorEmail: string,
    correlationId: string,
  ): Promise<AttendanceDevice> {
    const device = await this.deviceRepo.findById(deviceId, tenantId);
    if (!device) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Device not found.',
      });
    }

    if (device.status === DeviceStatus.DECOMMISSIONED) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_INVALID_STATUS,
        statusCode: HttpStatus.CONFLICT,
        message: 'Cannot activate a decommissioned device.',
      });
    }

    // If already active, return as-is (idempotent)
    if (device.status === DeviceStatus.ACTIVE) {
      return device;
    }

    const updated = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const result = await tx.attendanceDevice.update({
        where: { id: deviceId },
        data: {
          status: DeviceStatus.ACTIVE,
          updatedAt: new Date(),
        },
      });

      // Audit: Device Activated
      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType: AuditActorType.USER,
          actorEmail,
          module: 'ATTENDANCE',
          action: 'DeviceActivated',
          resourceType: 'attendance_device',
          resourceId: deviceId,
          before: {
            status: device.status,
          } as Prisma.InputJsonValue,
          after: {
            id: result.id,
            status: result.status,
          } as Prisma.InputJsonValue,
          correlationId,
          severity: AuditEventSeverity.INFO,
          occurredAt: new Date(),
        },
      });

      // Outbox: Device activated
      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'AttendanceDeviceActivated.v1',
          payload: {
            deviceId: result.id,
            serialNumber: result.serialNumber,
            correlationId,
          },
        },
      });

      return result;
    });

    return updated;
  }

  /**
   * Suspend a device (stops accepting events).
   * Can only suspend ACTIVE devices.
   */
  async suspendDevice(
    deviceId: string,
    tenantId: string,
    reason: string,
    actorId: string,
    actorEmail: string,
    correlationId: string,
  ): Promise<AttendanceDevice> {
    const device = await this.deviceRepo.findById(deviceId, tenantId);
    if (!device) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Device not found.',
      });
    }

    if (device.status !== DeviceStatus.ACTIVE) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_INVALID_STATUS,
        statusCode: HttpStatus.CONFLICT,
        message: `Cannot suspend device with status "${device.status}". Only ACTIVE devices can be suspended.`,
      });
    }

    const updated = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const result = await tx.attendanceDevice.update({
        where: { id: deviceId },
        data: {
          status: DeviceStatus.SUSPENDED,
          updatedAt: new Date(),
        },
      });

      // Audit: Device Suspended
      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType: AuditActorType.USER,
          actorEmail,
          module: 'ATTENDANCE',
          action: 'DeviceSuspended',
          resourceType: 'attendance_device',
          resourceId: deviceId,
          before: {
            status: device.status,
          } as Prisma.InputJsonValue,
          after: {
            id: result.id,
            status: result.status,
          } as Prisma.InputJsonValue,
          metadata: {
            reason,
          } as Prisma.InputJsonValue,
          correlationId,
          severity: AuditEventSeverity.WARNING,
          occurredAt: new Date(),
        },
      });

      // Outbox: Device suspended
      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'AttendanceDeviceSuspended.v1',
          payload: {
            deviceId: result.id,
            serialNumber: result.serialNumber,
            reason,
            correlationId,
          },
        },
      });

      return result;
    });

    return updated;
  }

  /**
   * Decommission a device (permanently removes from service).
   * Can only decommission SUSPENDED or ACTIVE devices.
   */
  async decommissionDevice(
    deviceId: string,
    tenantId: string,
    reason: string,
    actorId: string,
    actorEmail: string,
    correlationId: string,
  ): Promise<AttendanceDevice> {
    const device = await this.deviceRepo.findById(deviceId, tenantId);
    if (!device) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Device not found.',
      });
    }

    if (device.status === DeviceStatus.DECOMMISSIONED || device.status === DeviceStatus.PENDING) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_INVALID_STATUS,
        statusCode: HttpStatus.CONFLICT,
        message: `Cannot decommission device with status "${device.status}".`,
      });
    }

    const updated = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const result = await tx.attendanceDevice.update({
        where: { id: deviceId },
        data: {
          status: DeviceStatus.DECOMMISSIONED,
          updatedAt: new Date(),
        },
      });

      // Audit: Device Decommissioned
      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType: AuditActorType.USER,
          actorEmail,
          module: 'ATTENDANCE',
          action: 'DeviceDecommissioned',
          resourceType: 'attendance_device',
          resourceId: deviceId,
          before: {
            status: device.status,
          } as Prisma.InputJsonValue,
          after: {
            id: result.id,
            status: result.status,
          } as Prisma.InputJsonValue,
          metadata: {
            reason,
          } as Prisma.InputJsonValue,
          correlationId,
          severity: AuditEventSeverity.WARNING,
          occurredAt: new Date(),
        },
      });

      // Outbox: Device decommissioned
      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'AttendanceDeviceDecommissioned.v1',
          payload: {
            deviceId: result.id,
            serialNumber: result.serialNumber,
            reason,
            correlationId,
          },
        },
      });

      return result;
    });

    return updated;
  }

  /**
   * Replace a device with a new one.
   * Decommissions the old device and creates a new one.
   * Transfers tokens to the new device.
   */
  async replaceDevice(
    oldDeviceId: string,
    tenantId: string,
    input: ReplaceDeviceInput,
    actorId: string,
    actorEmail: string,
    correlationId: string,
  ): Promise<{ oldDevice: AttendanceDevice; newDevice: AttendanceDevice }> {
    const oldDevice = await this.deviceRepo.findById(oldDeviceId, tenantId);
    if (!oldDevice) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Device not found.',
      });
    }

    // Validate new serial is unique
    const conflicting = await this.deviceRepo.findBySerialNumber(input.newSerialNumber, tenantId);
    if (conflicting && conflicting.id !== oldDeviceId) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_DEVICE_SERIAL_CONFLICT,
        statusCode: HttpStatus.CONFLICT,
        message: `Device with serial number "${input.newSerialNumber}" already exists.`,
      });
    }

    const result = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      // Decommission old device
      const decommissioned = await tx.attendanceDevice.update({
        where: { id: oldDeviceId },
        data: {
          status: DeviceStatus.DECOMMISSIONED,
          updatedAt: new Date(),
        },
      });

      // Create new device (inheriting properties from old)
      const newDevice = await tx.attendanceDevice.create({
        data: {
          tenantId,
          name: oldDevice.name,
          deviceType: oldDevice.deviceType,
          serialNumber: input.newSerialNumber,
          vendor: oldDevice.vendor,
          model: oldDevice.model,
          timezone: oldDevice.timezone,
          deviceFingerprint: input.newDeviceFingerprint ?? oldDevice.deviceFingerprint,
          publicKeyFingerprint: input.newPublicKeyFingerprint ?? oldDevice.publicKeyFingerprint,
          ipWhitelist: oldDevice.ipWhitelist,
          metadata: (oldDevice.metadata as Prisma.InputJsonValue) ?? undefined,
          status: DeviceStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Audit: Device Replaced
      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType: AuditActorType.USER,
          actorEmail,
          module: 'ATTENDANCE',
          action: 'DeviceReplaced',
          resourceType: 'attendance_device',
          resourceId: oldDeviceId,
          before: {
            id: oldDevice.id,
            serialNumber: oldDevice.serialNumber,
            status: oldDevice.status,
          } as Prisma.InputJsonValue,
          after: {
            id: newDevice.id,
            serialNumber: newDevice.serialNumber,
            status: newDevice.status,
          } as Prisma.InputJsonValue,
          metadata: {
            oldSerialNumber: oldDevice.serialNumber,
            newSerialNumber: newDevice.serialNumber,
          } as Prisma.InputJsonValue,
          correlationId,
          severity: AuditEventSeverity.WARNING,
          occurredAt: new Date(),
        },
      });

      // Outbox: Device replaced
      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'AttendanceDeviceReplaced.v1',
          payload: {
            oldDeviceId: decommissioned.id,
            oldSerialNumber: decommissioned.serialNumber,
            newDeviceId: newDevice.id,
            newSerialNumber: newDevice.serialNumber,
            correlationId,
          },
        },
      });

      return { oldDevice: decommissioned, newDevice };
    });

    return result;
  }

  /**
   * Update device last seen timestamp.
   * Called after successful heartbeat or event ingestion.
   * Fire-and-forget (non-critical).
   */
  async touchLastSeen(deviceId: string, tenantId: string): Promise<void> {
    try {
      await this.deviceRepo.update(deviceId, tenantId, {
        lastSeenAt: new Date(),
      });
    } catch {
      // Fire-and-forget: never fails the calling operation
      this.logger.debug(
        `Failed to update lastSeenAt for device ${deviceId} (non-critical)`,
      );
    }
  }
}
