import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { AdjustLeaveBalanceDto } from '../dto/adjust-leave-balance.dto';
import type { CreateLeaveTypeDto } from '../dto/create-leave-type.dto';
import type { ListLeaveAdminRequestsDto } from '../dto/list-leave-admin.dto';
import type { UpdateLeaveTypeDto } from '../dto/update-leave-type.dto';

const requestInclude = {
  leaveType: true,
  days: { orderBy: { leaveDate: 'asc' as const } },
  employee: { select: { id: true, displayName: true, employeeNumber: true } },
} satisfies Prisma.LeaveRequestInclude;

type AdminLeaveRequest = Prisma.LeaveRequestGetPayload<{ include: typeof requestInclude }>;

@Injectable()
export class LeaveAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listRequests(tenantId: string, query: ListLeaveAdminRequestsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.LeaveRequestWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.leaveTypeId ? { leaveTypeId: query.leaveTypeId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        include: requestInclude,
        orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);
    return createPaginatedResponse(
      data.map((request) => this.toAdminRequestDto(request)),
      total,
      page,
      pageSize,
    );
  }

  async getRequest(tenantId: string, id: string) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id, tenantId },
      include: requestInclude,
    });
    if (!request) this.notFound('Leave request not found.');
    return this.toAdminRequestDto(request);
  }

  async summary(tenantId: string) {
    const [pendingCount, typesCount] = await Promise.all([
      this.prisma.leaveRequest.count({ where: { tenantId, status: 'SUBMITTED' } }),
      this.prisma.leaveType.count({ where: { tenantId, status: 'ACTIVE' } }),
    ]);
    return { pendingCount, typesCount };
  }

  async listTypes(tenantId: string, includeInactive = false) {
    const types = await this.prisma.leaveType.findMany({
      where: {
        tenantId,
        ...(includeInactive ? {} : { status: 'ACTIVE' }),
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
    return types.map((type) => this.toTypeDto(type));
  }

  async createType(tenantId: string, dto: CreateLeaveTypeDto) {
    const code = dto.code.trim();
    await this.assertUniqueCode(tenantId, code);
    const created = await this.prisma.leaveType.create({
      data: {
        tenantId,
        code,
        name: dto.name.trim(),
        paidStatus: dto.paidStatus,
        unit: dto.unit,
        halfDayAllowed: dto.halfDayAllowed ?? false,
        status: dto.status ?? 'ACTIVE',
      },
    });
    return this.toTypeDto(created);
  }

  async updateType(tenantId: string, id: string, dto: UpdateLeaveTypeDto) {
    const existing = await this.prisma.leaveType.findFirst({ where: { id, tenantId } });
    if (!existing) this.notFound('Leave type not found.');

    const code = dto.code !== undefined ? dto.code.trim() : undefined;
    if (code !== undefined && code !== existing.code) {
      await this.assertUniqueCode(tenantId, code, id);
    }

    const updated = await this.prisma.leaveType.update({
      where: { id: existing.id },
      data: {
        ...(code !== undefined ? { code } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.paidStatus !== undefined ? { paidStatus: dto.paidStatus } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
        ...(dto.halfDayAllowed !== undefined ? { halfDayAllowed: dto.halfDayAllowed } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        rowVersion: { increment: 1 },
      },
    });
    return this.toTypeDto(updated);
  }

  /**
   * Signed balance adjustment: positive → GRANT, negative → ADJUSTMENT (stored signed).
   */
  async adjustBalance(tenantId: string, actorUserId: string, dto: AdjustLeaveBalanceDto) {
    if (dto.quantity === 0) {
      this.fail('Adjustment quantity must be a non-zero signed number.');
    }

    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId },
      select: { id: true },
    });
    if (!employee) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_NOT_FOUND,
        message: 'Employee not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id: dto.leaveTypeId, tenantId, status: 'ACTIVE' },
    });
    if (!leaveType) this.fail('Leave type is not available.');

    const entryType = dto.quantity > 0 ? 'GRANT' : 'ADJUSTMENT';
    const effectiveDate = this.parseDate(
      dto.effectiveDate ?? new Date().toISOString().slice(0, 10),
    );

    const entry = await this.prisma.leaveLedgerEntry.create({
      data: {
        tenantId,
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        entryType,
        quantity: new Prisma.Decimal(dto.quantity),
        effectiveDate,
        sourceType: 'MANUAL_ADJUSTMENT',
        description: dto.reason,
      },
    });

    return {
      id: entry.id,
      employeeId: entry.employeeId,
      leaveTypeId: entry.leaveTypeId,
      entryType: entry.entryType,
      quantity: Number(entry.quantity),
      effectiveDate: this.toDateOnly(entry.effectiveDate),
      reason: entry.description,
      adjustedBy: actorUserId,
    };
  }

  private async assertUniqueCode(tenantId: string, code: string, excludeId?: string) {
    const conflict = await this.prisma.leaveType.findFirst({
      where: {
        tenantId,
        code,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (conflict) {
      throw new AppException({
        code: ERROR_CODES.CONFLICT,
        message: 'A leave type with this code already exists for the tenant.',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }

  private toTypeDto(type: Prisma.LeaveTypeGetPayload<object>) {
    return {
      id: type.id,
      code: type.code,
      name: type.name,
      paidStatus: type.paidStatus,
      unit: type.unit,
      halfDayAllowed: type.halfDayAllowed,
      status: type.status,
      createdAt: type.createdAt.toISOString(),
      updatedAt: type.updatedAt.toISOString(),
      rowVersion: type.rowVersion.toString(),
    };
  }

  private toAdminRequestDto(request: AdminLeaveRequest) {
    return {
      id: request.id,
      employeeId: request.employeeId,
      employee: {
        id: request.employee.id,
        displayName: request.employee.displayName,
        employeeNumber: request.employee.employeeNumber,
      },
      leaveType: {
        id: request.leaveType.id,
        code: request.leaveType.code,
        name: request.leaveType.name,
        unit: request.leaveType.unit,
        paidStatus: request.leaveType.paidStatus,
      },
      startsOn: this.toDateOnly(request.startsOn),
      endsOn: this.toDateOnly(request.endsOn),
      requestedQuantity: Number(request.requestedQuantity),
      reason: request.reason,
      evidenceFileKey: request.evidenceFileKey,
      emergency: request.emergency,
      status: request.status,
      submittedAt: request.submittedAt?.toISOString() ?? null,
      decidedAt: request.decidedAt?.toISOString() ?? null,
      decidedBy: request.decidedBy,
      days: request.days.map((day) => ({
        id: day.id,
        leaveDate: this.toDateOnly(day.leaveDate),
        quantity: Number(day.quantity),
        dayPart: day.dayPart,
        holiday: day.holiday,
        restDay: day.restDay,
        payrollImpact: day.payrollImpact,
      })),
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      rowVersion: request.rowVersion.toString(),
    };
  }

  private parseDate(value: string): Date {
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }

  private toDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private notFound(message: string): never {
    throw new AppException({
      code: ERROR_CODES.NOT_FOUND,
      message,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }

  private fail(message: string): never {
    throw new AppException({
      code: ERROR_CODES.BAD_REQUEST,
      message,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
