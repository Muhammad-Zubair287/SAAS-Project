import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { ApiSuccessResponse } from '../../../common/interfaces/api-response.interface';
import { AttendanceExceptionRepository } from '../repositories/attendance-exception.repository';
import type { ListAttendanceDto } from '../dto/list-attendance.dto';
import type { ResolveExceptionDto } from '../dto/resolve-exception.dto';
import type { AttendanceExceptionResponseDto } from '../dto/attendance-exception-response.dto';

type ExceptionRow = {
  id: string;
  tenantId: string;
  attendanceRecordId: string;
  employeeId: string;
  exceptionType: string;
  exceptionDate: Date;
  description: string | null;
  severity: string;
  isResolved: boolean;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AttendanceExceptionService {
  constructor(
    private readonly exceptionRepo: AttendanceExceptionRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findMany(
    query: ListAttendanceDto,
    tenantId: string,
  ): Promise<ApiSuccessResponse<AttendanceExceptionResponseDto[]>> {
    const { data, total } = await this.exceptionRepo.findMany(query, tenantId);
    return createPaginatedResponse(
      data.map((ex) => this.toExceptionDto(ex)),
      total,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async findById(id: string, tenantId: string): Promise<AttendanceExceptionResponseDto> {
    const exception = await this.exceptionRepo.findById(id, tenantId);
    if (!exception) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_EXCEPTION_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Attendance exception not found',
      });
    }
    return this.toExceptionDto(exception);
  }

  async resolve(
    id: string,
    dto: ResolveExceptionDto,
    actorId: string,
    actorEmail: string,
    tenantId: string,
    correlationId: string,
  ): Promise<AttendanceExceptionResponseDto> {
    const exception = await this.exceptionRepo.findById(id, tenantId);
    if (!exception) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_EXCEPTION_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Attendance exception not found',
      });
    }

    if (exception.isResolved) {
      throw new AppException({
        code: ERROR_CODES.ATTENDANCE_EXCEPTION_ALREADY_RESOLVED,
        statusCode: HttpStatus.CONFLICT,
        message: 'Attendance exception has already been resolved',
      });
    }

    await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      await tx.attendanceException.updateMany({
        where: { id, tenantId },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy: actorId,
          resolutionNote: dto.resolutionNote ?? null,
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          actorType: 'user',
          actorEmail,
          module: 'attendance',
          action: 'attendance.exception.resolved',
          resourceType: 'attendance_exception',
          resourceId: id,
          before: { isResolved: false },
          after: { isResolved: true, resolutionNote: dto.resolutionNote },
          correlationId,
          severity: 'INFO',
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'AttendanceExceptionResolved.v1',
          payload: {
            exceptionId: id,
            employeeId: exception.employeeId,
            tenantId,
            actorId,
            correlationId,
          },
          status: 'PENDING',
        },
      });
    });

    const updated = await this.exceptionRepo.findById(id, tenantId);
    return this.toExceptionDto(updated!);
  }

  private toExceptionDto(ex: ExceptionRow): AttendanceExceptionResponseDto {
    return {
      id: ex.id,
      tenantId: ex.tenantId,
      attendanceRecordId: ex.attendanceRecordId,
      employeeId: ex.employeeId,
      exceptionType: ex.exceptionType,
      exceptionDate: ex.exceptionDate instanceof Date
        ? (ex.exceptionDate.toISOString().split('T')[0] ?? '')
        : String(ex.exceptionDate),
      description: ex.description,
      severity: ex.severity,
      isResolved: ex.isResolved,
      resolvedAt: ex.resolvedAt instanceof Date ? ex.resolvedAt.toISOString() : null,
      resolvedBy: ex.resolvedBy,
      resolutionNote: ex.resolutionNote,
      createdAt: ex.createdAt instanceof Date ? ex.createdAt.toISOString() : String(ex.createdAt),
      updatedAt: ex.updatedAt instanceof Date ? ex.updatedAt.toISOString() : String(ex.updatedAt),
    };
  }
}
