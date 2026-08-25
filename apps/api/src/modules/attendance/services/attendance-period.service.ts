import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditActorType, AuditEventSeverity } from '../../../common/enums/platform.enum';

@Injectable()
export class AttendancePeriodService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    const rows = await this.prisma.attendancePeriod.findMany({
      where: { tenantId },
      orderBy: { periodStart: 'desc' },
      take: 50,
    });
    return rows.map((r) => this.toDto(r));
  }

  async lock(
    dto: { periodStart: string; periodEnd: string },
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
  ) {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    if (periodEnd < periodStart) {
      throw new AppException({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'periodEnd must be on or after periodStart.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    return this.prisma.withTenantTransaction(tenantId, async (tx) => {
      let period = await tx.attendancePeriod.findFirst({
        where: { tenantId, periodStart, periodEnd },
      });
      if (period?.status === 'LOCKED') {
        throw new AppException({
          code: ERROR_CODES.ATTENDANCE_PERIOD_LOCKED,
          message: 'Period is already locked.',
          statusCode: HttpStatus.CONFLICT,
        });
      }
      if (!period) {
        period = await tx.attendancePeriod.create({
          data: {
            tenantId,
            periodStart,
            periodEnd,
            status: 'LOCKED',
            lockedAt: new Date(),
            lockedBy: userId,
          },
        });
      } else {
        period = await tx.attendancePeriod.update({
          where: { id: period.id },
          data: {
            status: 'LOCKED',
            lockedAt: new Date(),
            lockedBy: userId,
            unlockReason: null,
          },
        });
      }

      await tx.attendanceRecord.updateMany({
        where: {
          tenantId,
          attendanceDate: { gte: periodStart, lte: periodEnd },
        },
        data: { periodLocked: true },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          actorType: AuditActorType.USER,
          actorEmail: userEmail,
          module: 'attendance',
          action: 'attendance.period_locked',
          resourceType: 'attendance_period',
          resourceId: period.id,
          after: { periodStart: dto.periodStart, periodEnd: dto.periodEnd },
          correlationId,
          severity: AuditEventSeverity.WARNING,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'AttendancePeriodLocked.v1',
          payload: {
            periodId: period.id,
            tenantId,
            periodStart: dto.periodStart,
            periodEnd: dto.periodEnd,
            actorId: userId,
            correlationId,
          },
        },
      });

      return this.toDto(period);
    });
  }

  async unlock(
    dto: { periodStart: string; periodEnd: string; reason: string },
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
  ) {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    return this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const period = await tx.attendancePeriod.findFirst({
        where: { tenantId, periodStart, periodEnd },
      });
      if (!period) {
        throw new AppException({
          code: ERROR_CODES.ATTENDANCE_PERIOD_NOT_FOUND,
          message: 'Attendance period not found.',
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      const updated = await tx.attendancePeriod.update({
        where: { id: period.id },
        data: {
          status: 'OPEN',
          unlockReason: dto.reason,
          lockedAt: null,
          lockedBy: null,
        },
      });

      await tx.attendanceRecord.updateMany({
        where: {
          tenantId,
          attendanceDate: { gte: periodStart, lte: periodEnd },
        },
        data: { periodLocked: false },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          actorType: AuditActorType.USER,
          actorEmail: userEmail,
          module: 'attendance',
          action: 'attendance.period_unlocked',
          resourceType: 'attendance_period',
          resourceId: period.id,
          after: { reason: dto.reason },
          correlationId,
          severity: AuditEventSeverity.WARNING,
        },
      });

      return this.toDto(updated);
    });
  }

  private toDto(r: {
    id: string;
    periodStart: Date;
    periodEnd: Date;
    status: string;
    lockedAt: Date | null;
    lockedBy: string | null;
    unlockReason: string | null;
  }) {
    return {
      id: r.id,
      periodStart: r.periodStart.toISOString().split('T')[0],
      periodEnd: r.periodEnd.toISOString().split('T')[0],
      status: r.status,
      lockedAt: r.lockedAt?.toISOString() ?? null,
      lockedBy: r.lockedBy,
      unlockReason: r.unlockReason,
    };
  }
}
