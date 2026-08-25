import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import { CreateLeaveRequestDto } from '../dto/ess-leave.dto';
import { EssContextService } from './ess-context.service';

type DbClient = PrismaService | Prisma.TransactionClient;

const ACTIVE_LEAVE_STATUSES = ['SUBMITTED', 'APPROVED', 'COMPLETED'];

@Injectable()
export class EssLeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: EssContextService,
  ) {}

  async getBalances(tenantId: string, userId: string) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    return this.getBalancesForEmployee(tenantId, employee.id);
  }

  async getBalancesForEmployee(tenantId: string, employeeId: string) {
    const [types, ledger, pending] = await Promise.all([
      this.prisma.leaveType.findMany({ where: { tenantId, status: 'ACTIVE' }, orderBy: { name: 'asc' } }),
      this.prisma.leaveLedgerEntry.groupBy({
        by: ['leaveTypeId'],
        where: { tenantId, employeeId },
        _sum: { quantity: true },
      }),
      this.prisma.leaveRequest.groupBy({
        by: ['leaveTypeId'],
        where: { tenantId, employeeId, status: 'SUBMITTED' },
        _sum: { requestedQuantity: true },
      }),
    ]);
    const availableByType = new Map(ledger.map((row) => [row.leaveTypeId, Number(row._sum.quantity ?? 0)]));
    const pendingByType = new Map(pending.map((row) => [row.leaveTypeId, Number(row._sum.requestedQuantity ?? 0)]));
    return types.map((type) => ({
      leaveTypeId: type.id,
      code: type.code,
      name: type.name,
      unit: type.unit,
      available: availableByType.get(type.id) ?? 0,
      pendingReserved: pendingByType.get(type.id) ?? 0,
    }));
  }

  async listTypes(tenantId: string) {
    const types = await this.prisma.leaveType.findMany({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });
    return types.map((type) => ({
      id: type.id,
      code: type.code,
      name: type.name,
      paidStatus: type.paidStatus,
      unit: type.unit,
      halfDayAllowed: type.halfDayAllowed,
      status: type.status,
    }));
  }

  async listRequests(
    tenantId: string,
    userId: string,
    query: { page?: number; pageSize?: number; status?: string },
  ) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.LeaveRequestWhereInput = {
      tenantId,
      employeeId: employee.id,
      ...(query.status ? { status: query.status as never } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        include: { leaveType: true, days: { orderBy: { leaveDate: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);
    return createPaginatedResponse(data.map((request) => this.toRequestDto(request)), total, page, pageSize);
  }

  async getRequest(tenantId: string, userId: string, id: string) {
    const request = await this.requireOwnRequest(tenantId, userId, id);
    return this.toRequestDto(request);
  }

  async createRequest(tenantId: string, userId: string, dto: CreateLeaveRequestDto) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    const status = dto.status ?? 'DRAFT';
    const prepared = await this.prepareRequest(tenantId, employee.id, dto);
    const created = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const request = await tx.leaveRequest.create({
        data: {
          tenantId,
          employeeId: employee.id,
          leaveTypeId: dto.leaveTypeId,
          startsOn: prepared.startsOn,
          endsOn: prepared.endsOn,
          requestedQuantity: prepared.quantity,
          reason: dto.reason ?? null,
          evidenceFileKey: dto.evidenceFileKey ?? null,
          emergency: dto.emergency ?? false,
          status: status as never,
          submittedAt: status === 'SUBMITTED' ? new Date() : null,
          balanceSnapshot: status === 'SUBMITTED' ? prepared.balanceSnapshot : undefined,
          createdBy: userId,
          updatedBy: userId,
          days: { create: prepared.days },
        },
        include: { leaveType: true, days: { orderBy: { leaveDate: 'asc' } } },
      });
      if (status === 'SUBMITTED') {
        await this.reserveLeave(tx, tenantId, employee.id, request.id, dto.leaveTypeId, prepared.quantity, userId);
      }
      return request;
    });
    return this.toRequestDto(created);
  }

  async submitRequest(tenantId: string, userId: string, id: string) {
    const existing = await this.requireOwnRequest(tenantId, userId, id);
    if (!['DRAFT', 'RETURNED'].includes(existing.status)) {
      this.fail('Only draft or returned leave requests can be submitted.');
    }
    const prepared = await this.prepareRequest(tenantId, existing.employeeId, {
      leaveTypeId: existing.leaveTypeId,
      startsOn: this.toDateOnly(existing.startsOn),
      endsOn: this.toDateOnly(existing.endsOn),
      dayPart: existing.days[0]?.dayPart ?? 'FULL',
      halfDay: existing.days[0]?.quantity ? Number(existing.days[0].quantity) === 0.5 : false,
    });
    const updated = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      await this.reserveLeave(tx, tenantId, existing.employeeId, existing.id, existing.leaveTypeId, prepared.quantity, userId);
      return tx.leaveRequest.update({
        where: { id: existing.id, tenantId },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          balanceSnapshot: prepared.balanceSnapshot,
          updatedBy: userId,
          rowVersion: { increment: 1 },
        },
        include: { leaveType: true, days: { orderBy: { leaveDate: 'asc' } } },
      });
    });
    return this.toRequestDto(updated);
  }

  async cancelRequest(tenantId: string, userId: string, id: string) {
    const existing = await this.requireOwnRequest(tenantId, userId, id);
    if (!['DRAFT', 'SUBMITTED'].includes(existing.status)) {
      this.fail('Only draft or submitted leave requests can be cancelled.');
    }
    const updated = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      if (existing.status === 'SUBMITTED') {
        await tx.leaveLedgerEntry.create({
          data: {
            tenantId,
            employeeId: existing.employeeId,
            leaveTypeId: existing.leaveTypeId,
            entryType: 'RELEASE',
            quantity: existing.requestedQuantity,
            effectiveDate: this.today(),
            sourceType: 'LEAVE_REQUEST',
            sourceId: existing.id,
            description: 'Leave request cancelled by employee',
          },
        });
      }
      const request = await tx.leaveRequest.update({
        where: { id: existing.id, tenantId },
        data: { status: 'CANCELLED', updatedBy: userId, rowVersion: { increment: 1 } },
        include: { leaveType: true, days: { orderBy: { leaveDate: 'asc' } } },
      });
      await tx.userNotification.create({
        data: {
          tenantId,
          userId,
          title: 'Leave request cancelled',
          body: `${request.leaveType.name} leave from ${this.toDateOnly(request.startsOn)} to ${this.toDateOnly(request.endsOn)} was cancelled.`,
          category: 'LEAVE',
          linkPath: `/my/leave/${request.id}`,
        },
      });
      return request;
    });
    return this.toRequestDto(updated);
  }

  async decideRequest(
    tenantId: string,
    approverUserId: string,
    id: string,
    decision: 'APPROVED' | 'REJECTED',
  ) {
    const existing = await this.prisma.leaveRequest.findFirst({
      where: { id, tenantId },
      include: { employee: { select: { userId: true } }, leaveType: true, days: { orderBy: { leaveDate: 'asc' } } },
    });
    if (!existing) this.notFound();
    if (existing.employee.userId === approverUserId) {
      throw new AppException({
        code: ERROR_CODES.SEGREGATION_OF_DUTIES,
        message: 'Approvers cannot decide their own leave requests.',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }
    if (existing.status !== 'SUBMITTED') this.fail('Only submitted leave requests can be decided.');
    const updated = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      if (decision === 'APPROVED') {
        await tx.leaveLedgerEntry.createMany({
          data: [
            {
              tenantId,
              employeeId: existing.employeeId,
              leaveTypeId: existing.leaveTypeId,
              entryType: 'RELEASE',
              quantity: existing.requestedQuantity,
              effectiveDate: this.today(),
              sourceType: 'LEAVE_REQUEST',
              sourceId: existing.id,
              description: 'Leave reservation released on approval',
            },
            {
              tenantId,
              employeeId: existing.employeeId,
              leaveTypeId: existing.leaveTypeId,
              entryType: 'CONSUMPTION',
              quantity: new Prisma.Decimal(existing.requestedQuantity).mul(-1),
              effectiveDate: this.today(),
              sourceType: 'LEAVE_REQUEST',
              sourceId: existing.id,
              description: 'Leave consumed on approval',
            },
          ],
        });
      } else {
        await tx.leaveLedgerEntry.create({
          data: {
            tenantId,
            employeeId: existing.employeeId,
            leaveTypeId: existing.leaveTypeId,
            entryType: 'RELEASE',
            quantity: existing.requestedQuantity,
            effectiveDate: this.today(),
            sourceType: 'LEAVE_REQUEST',
            sourceId: existing.id,
            description: 'Leave reservation released on rejection',
          },
        });
      }
      return tx.leaveRequest.update({
        where: { id: existing.id, tenantId },
        data: {
          status: decision,
          decidedAt: new Date(),
          decidedBy: approverUserId,
          updatedBy: approverUserId,
          rowVersion: { increment: 1 },
        },
        include: { leaveType: true, days: { orderBy: { leaveDate: 'asc' } } },
      });
    });
    return {
      ...this.toRequestDto(updated),
      message: decision === 'APPROVED' ? 'Leave request approved.' : 'Leave request rejected.',
    };
  }

  private async prepareRequest(tenantId: string, employeeId: string, dto: CreateLeaveRequestDto) {
    const startsOn = this.parseDate(dto.startsOn);
    const endsOn = this.parseDate(dto.endsOn);
    if (endsOn < startsOn) this.fail('Leave end date must be on or after start date.');
    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id: dto.leaveTypeId, tenantId, status: 'ACTIVE' },
    });
    if (!leaveType) this.fail('Leave type is not available.');
    const halfDay = dto.halfDay === true || (dto.dayPart && dto.dayPart !== 'FULL');
    if (halfDay && !leaveType.halfDayAllowed) this.fail('This leave type does not allow half days.');
    if (halfDay && startsOn.getTime() !== endsOn.getTime()) this.fail('Half-day leave must be for a single day.');
    const dayPart = halfDay ? (dto.dayPart === 'SECOND_HALF' ? 'SECOND_HALF' : 'FIRST_HALF') : 'FULL';
    const days = this.expandDays(startsOn, endsOn, dayPart);
    const quantity = days.reduce((sum, day) => sum + day.quantity, 0);
    await this.assertNoOverlap(tenantId, employeeId, startsOn, endsOn);
    const balances = await this.getBalancesForEmployee(tenantId, employeeId);
    const balance = balances.find((row) => row.leaveTypeId === dto.leaveTypeId);
    const available = balance?.available ?? 0;
    // Unpaid leave is not balance-gated (M08 unpaid path).
    if (leaveType.paidStatus !== 'UNPAID' && available < quantity) {
      this.fail('Insufficient leave balance for this request.');
    }
    return {
      startsOn,
      endsOn,
      quantity,
      days: days.map((day) => ({
        tenant: { connect: { id: tenantId } },
        leaveDate: day.leaveDate,
        quantity: day.quantity,
        dayPart: day.dayPart as never,
        payrollImpact: (leaveType.paidStatus === 'UNPAID' ? 'UNPAID' : 'PAID') as never,
      })),
      balanceSnapshot: { availableBeforeRequest: available, requestedQuantity: quantity },
    };
  }

  async grantBalance(
    tenantId: string,
    actorUserId: string,
    input: {
      employeeId: string;
      leaveTypeId: string;
      quantity: number;
      effectiveDate: string;
      reason: string;
    },
  ) {
    if (!(input.quantity > 0)) this.fail('Grant quantity must be greater than zero.');
    const employee = await this.prisma.employee.findFirst({
      where: { id: input.employeeId, tenantId },
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
      where: { id: input.leaveTypeId, tenantId, status: 'ACTIVE' },
    });
    if (!leaveType) this.fail('Leave type is not available.');

    const entry = await this.prisma.leaveLedgerEntry.create({
      data: {
        tenantId,
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        entryType: 'GRANT',
        quantity: input.quantity,
        effectiveDate: this.parseDate(input.effectiveDate),
        sourceType: 'MANUAL_ADJUSTMENT',
        description: input.reason,
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
      grantedBy: actorUserId,
    };
  }

  private async assertNoOverlap(tenantId: string, employeeId: string, startsOn: Date, endsOn: Date) {
    const overlap = await this.prisma.leaveRequest.findFirst({
      where: {
        tenantId,
        employeeId,
        status: { in: ACTIVE_LEAVE_STATUSES as never },
        startsOn: { lte: endsOn },
        endsOn: { gte: startsOn },
      },
      select: { id: true },
    });
    if (overlap) this.fail('A leave request already overlaps these dates.');
  }

  private async reserveLeave(
    tx: DbClient,
    tenantId: string,
    employeeId: string,
    requestId: string,
    leaveTypeId: string,
    quantity: number,
    userId: string,
  ) {
    await tx.leaveLedgerEntry.create({
      data: {
        tenantId,
        employeeId,
        leaveTypeId,
        entryType: 'RESERVATION',
        quantity: new Prisma.Decimal(quantity).mul(-1),
        effectiveDate: this.today(),
        sourceType: 'LEAVE_REQUEST',
        sourceId: requestId,
        description: 'Leave request submitted by employee',
      },
    });
    await tx.userNotification.create({
      data: {
        tenantId,
        userId,
        title: 'Leave request submitted',
        body: 'Your leave request has been submitted for review.',
        category: 'LEAVE',
        linkPath: `/my/leave/${requestId}`,
      },
    });
  }

  private async requireOwnRequest(tenantId: string, userId: string, id: string) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id, tenantId, employeeId: employee.id },
      include: { leaveType: true, days: { orderBy: { leaveDate: 'asc' } } },
    });
    if (!request) this.notFound();
    return request;
  }

  private expandDays(startsOn: Date, endsOn: Date, dayPart: string) {
    const days = [];
    for (const cursor = new Date(startsOn); cursor <= endsOn; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      days.push({
        leaveDate: new Date(cursor),
        quantity: dayPart === 'FULL' ? 1 : 0.5,
        dayPart,
      });
    }
    return days;
  }

  private parseDate(value: string): Date {
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }

  private today(): Date {
    return this.parseDate(new Date().toISOString());
  }

  private toDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private toRequestDto(request: Prisma.LeaveRequestGetPayload<{ include: { leaveType: true; days: true } }>) {
    return {
      id: request.id,
      leaveType: {
        id: request.leaveType.id,
        code: request.leaveType.code,
        name: request.leaveType.name,
        unit: request.leaveType.unit,
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

  private notFound(): never {
    throw new AppException({
      code: ERROR_CODES.NOT_FOUND,
      message: 'Leave request not found.',
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
