import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, GeofenceShape, type AttendanceGeofence } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditActorType, AuditEventSeverity } from '../../../common/enums/platform.enum';
import { AttendanceGeofenceRepository } from '../repositories/attendance-geofence.repository';
import { toGeofenceResponse, type GeofenceResponseDto } from '../dto/attendance-capture.dto';

export interface CreateGeofenceInput {
  name: string;
  legalEntityId?: string;
  branchId?: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  activeFrom?: Date;
  activeTo?: Date;
}

export interface UpdateGeofenceInput {
  name?: string;
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  activeFrom?: Date;
  activeTo?: Date;
}

export interface GeofenceCheckResult {
  isWithin: boolean;
  distance?: number; // meters
  exceedBy?: number; // meters over radius
}

/**
 * Parses If-Match into a rowVersion bigint.
 * Accepts strong ETags (`"1"`) or bare version strings (`1`) to match project clients.
 */
function parseExpectedRowVersion(ifMatch: string | undefined): bigint {
  if (ifMatch === undefined || !ifMatch.trim()) {
    throw new AppException({
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'If-Match header with the current rowVersion is required.',
    });
  }
  const raw = ifMatch.trim();
  if (raw === '*') {
    throw new AppException({
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Wildcard If-Match (*) is not allowed for geofence mutations.',
    });
  }
  const unquoted =
    raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2
      ? raw.slice(1, -1)
      : raw;
  try {
    return BigInt(unquoted);
  } catch {
    throw new AppException({
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'If-Match must be a numeric rowVersion.',
    });
  }
}

function versionConflict(): never {
  throw new AppException({
    code: ERROR_CODES.VERSION_CONFLICT,
    message: 'Concurrent modification detected. Reload and try again.',
    statusCode: HttpStatus.PRECONDITION_FAILED,
  });
}

/**
 * GeofenceService
 *
 * Manages geofences for attendance capture.
 * Currently supports circular geofences.
 * Future: Add polygon support (ADR-011).
 */
@Injectable()
export class GeofenceService {
  private readonly logger = new Logger(GeofenceService.name);

  private readonly EARTH_RADIUS_METERS = 6371000;
  private readonly MAX_RADIUS_METERS = 100000;
  private readonly MIN_RADIUS_METERS = 10;

  constructor(
    private readonly geofenceRepo: AttendanceGeofenceRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createGeofence(
    tenantId: string,
    input: CreateGeofenceInput,
    actorId: string,
    actorEmail: string,
    correlationId: string,
  ): Promise<GeofenceResponseDto> {
    this.validateCoordinates(input.centerLat, input.centerLng);

    if (
      input.radiusMeters < this.MIN_RADIUS_METERS ||
      input.radiusMeters > this.MAX_RADIUS_METERS
    ) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Radius must be between ${this.MIN_RADIUS_METERS} and ${this.MAX_RADIUS_METERS} meters.`,
      });
    }

    if (input.activeFrom && input.activeTo && input.activeTo <= input.activeFrom) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'activeTo must be after activeFrom.',
      });
    }

    const geofence = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const created = await tx.attendanceGeofence.create({
        data: {
          tenantId,
          name: input.name,
          legalEntityId: input.legalEntityId ?? null,
          branchId: input.branchId ?? null,
          shape: GeofenceShape.CIRCLE,
          centerLat: input.centerLat,
          centerLng: input.centerLng,
          radiusMeters: input.radiusMeters,
          activeFrom: input.activeFrom ?? null,
          activeTo: input.activeTo ?? null,
          metadata: undefined,
          rowVersion: 1n,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType: AuditActorType.USER,
          actorEmail,
          module: 'ATTENDANCE',
          action: 'GeofenceCreated',
          resourceType: 'attendance_geofence',
          resourceId: created.id,
          after: {
            id: created.id,
            name: created.name,
            centerLat: created.centerLat,
            centerLng: created.centerLng,
            radiusMeters: created.radiusMeters,
            rowVersion: created.rowVersion.toString(),
          } as Prisma.InputJsonValue,
          correlationId,
          severity: AuditEventSeverity.INFO,
          occurredAt: new Date(),
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'AttendanceGeofenceCreated.v1',
          payload: {
            geofenceId: created.id,
            name: created.name,
            centerLat: created.centerLat,
            centerLng: created.centerLng,
            radiusMeters: created.radiusMeters,
            correlationId,
          },
        },
      });

      return created;
    });

    return toGeofenceResponse(geofence);
  }

  async updateGeofence(
    geofenceId: string,
    tenantId: string,
    input: UpdateGeofenceInput,
    actorId: string,
    actorEmail: string,
    correlationId: string,
    ifMatch?: string,
  ): Promise<GeofenceResponseDto> {
    const expectedVersion = parseExpectedRowVersion(ifMatch);
    const geofence = await this.geofenceRepo.findById(geofenceId, tenantId);
    if (!geofence) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_GEOFENCE_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Geofence not found.',
      });
    }

    if (geofence.rowVersion !== expectedVersion) {
      versionConflict();
    }

    if (input.centerLat !== undefined && input.centerLng !== undefined) {
      this.validateCoordinates(input.centerLat, input.centerLng);
    }

    if (input.radiusMeters !== undefined) {
      if (
        input.radiusMeters < this.MIN_RADIUS_METERS ||
        input.radiusMeters > this.MAX_RADIUS_METERS
      ) {
        throw new AppException({
          code: ERROR_CODES.BAD_REQUEST,
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Radius must be between ${this.MIN_RADIUS_METERS} and ${this.MAX_RADIUS_METERS} meters.`,
        });
      }
    }

    try {
      const updated = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
        const result = await tx.attendanceGeofence.update({
          where: {
            id: geofenceId,
            tenantId,
            rowVersion: expectedVersion,
          },
          data: {
            name: input.name ?? geofence.name,
            centerLat: input.centerLat ?? geofence.centerLat,
            centerLng: input.centerLng ?? geofence.centerLng,
            radiusMeters: input.radiusMeters ?? geofence.radiusMeters,
            activeFrom: input.activeFrom ?? geofence.activeFrom,
            activeTo: input.activeTo ?? geofence.activeTo,
            rowVersion: { increment: 1 },
            updatedAt: new Date(),
          },
        });

        await tx.auditEvent.create({
          data: {
            tenantId,
            actorId,
            actorType: AuditActorType.USER,
            actorEmail,
            module: 'ATTENDANCE',
            action: 'GeofenceUpdated',
            resourceType: 'attendance_geofence',
            resourceId: geofenceId,
            before: {
              name: geofence.name,
              centerLat: geofence.centerLat,
              centerLng: geofence.centerLng,
              radiusMeters: geofence.radiusMeters,
              rowVersion: geofence.rowVersion.toString(),
            } as Prisma.InputJsonValue,
            after: {
              name: result.name,
              centerLat: result.centerLat,
              centerLng: result.centerLng,
              radiusMeters: result.radiusMeters,
              rowVersion: result.rowVersion.toString(),
            } as Prisma.InputJsonValue,
            correlationId,
            severity: AuditEventSeverity.INFO,
            occurredAt: new Date(),
          },
        });

        return result;
      });

      return toGeofenceResponse(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        versionConflict();
      }
      throw error;
    }
  }

  async deleteGeofence(
    geofenceId: string,
    tenantId: string,
    actorId: string,
    actorEmail: string,
    correlationId: string,
    ifMatch?: string,
  ): Promise<void> {
    const expectedVersion = parseExpectedRowVersion(ifMatch);
    const geofence = await this.geofenceRepo.findById(geofenceId, tenantId);
    if (!geofence) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_GEOFENCE_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Geofence not found.',
      });
    }

    if (geofence.rowVersion !== expectedVersion) {
      versionConflict();
    }

    try {
      await this.prisma.withTenantTransaction(tenantId, async (tx) => {
        await tx.attendanceGeofence.delete({
          where: {
            id: geofenceId,
            tenantId,
            rowVersion: expectedVersion,
          },
        });

        await tx.auditEvent.create({
          data: {
            tenantId,
            actorId,
            actorType: AuditActorType.USER,
            actorEmail,
            module: 'ATTENDANCE',
            action: 'GeofenceDeleted',
            resourceType: 'attendance_geofence',
            resourceId: geofenceId,
            before: {
              name: geofence.name,
              centerLat: geofence.centerLat,
              centerLng: geofence.centerLng,
              radiusMeters: geofence.radiusMeters,
              rowVersion: geofence.rowVersion.toString(),
            } as Prisma.InputJsonValue,
            correlationId,
            severity: AuditEventSeverity.INFO,
            occurredAt: new Date(),
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        versionConflict();
      }
      throw error;
    }
  }

  async getGeofence(geofenceId: string, tenantId: string): Promise<GeofenceResponseDto> {
    const geofence = await this.geofenceRepo.findById(geofenceId, tenantId);
    if (!geofence) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_GEOFENCE_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Geofence not found.',
      });
    }
    return toGeofenceResponse(geofence);
  }

  async checkPointWithin(
    geofenceId: string,
    tenantId: string,
    latitude: number,
    longitude: number,
    atDate: Date = new Date(),
  ): Promise<GeofenceCheckResult> {
    const geofence = await this.geofenceRepo.findById(geofenceId, tenantId);
    if (!geofence) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_GEOFENCE_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Geofence not found.',
      });
    }

    if (geofence.activeFrom && atDate < geofence.activeFrom) {
      return { isWithin: false, distance: undefined };
    }
    if (geofence.activeTo && atDate > geofence.activeTo) {
      return { isWithin: false, distance: undefined };
    }

    if (geofence.shape === GeofenceShape.CIRCLE) {
      const distance = this.haversineDistance(
        geofence.centerLat!,
        geofence.centerLng!,
        latitude,
        longitude,
      );

      const isWithin = distance <= geofence.radiusMeters!;
      return {
        isWithin,
        distance: Math.round(distance),
        exceedBy: !isWithin ? Math.round(distance - geofence.radiusMeters!) : undefined,
      };
    }

    throw new AppException({
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Polygon geofences not yet supported.',
    });
  }

  async listGeofences(
    tenantId: string,
    legalEntityId?: string,
    branchId?: string,
  ): Promise<GeofenceResponseDto[]> {
    let rows: AttendanceGeofence[];
    if (branchId) {
      rows = await this.geofenceRepo.findByBranchId(branchId, tenantId);
    } else if (legalEntityId) {
      rows = await this.geofenceRepo.findByLegalEntityId(legalEntityId, tenantId);
    } else {
      const { data } = await this.geofenceRepo.findMany(tenantId, {});
      rows = data;
    }
    return rows.map(toGeofenceResponse);
  }

  private validateCoordinates(lat: number, lng: number): void {
    if (lat < -90 || lat > 90) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Latitude must be between -90 and 90 degrees.',
      });
    }

    if (lng < -180 || lng > 180) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Longitude must be between -180 and 180 degrees.',
      });
    }
  }

  private haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const toRad = (degrees: number): number => (degrees * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return this.EARTH_RADIUS_METERS * c;
  }
}
