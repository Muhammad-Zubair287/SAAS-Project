import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import { CreateChangeRequestDto } from '../dto/create-change-request.dto';
import { EssContextService } from './ess-context.service';

@Injectable()
export class EssRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: EssContextService,
  ) {}

  async listRequests(
    tenantId: string,
    userId: string,
    query: { page?: number; pageSize?: number; type?: string; status?: string },
  ) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const changeWhere: Prisma.EmployeeChangeRequestWhereInput = {
      tenantId,
      employeeId: employee.id,
      ...(query.type ? { requestType: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const documentWhere: Prisma.DocumentRequestWhereInput = {
      tenantId,
      employeeId: employee.id,
      ...(query.status ? { status: query.status } : {}),
    };

    const [changeRequests, documentRequests] = await Promise.all([
      this.prisma.employeeChangeRequest.findMany({ where: changeWhere, orderBy: { createdAt: 'desc' } }),
      query.type && query.type !== 'DOCUMENT'
        ? Promise.resolve([])
        : this.prisma.documentRequest.findMany({ where: documentWhere, orderBy: { createdAt: 'desc' } }),
    ]);

    const items = [
      ...changeRequests.map((request) => ({
        id: request.id,
        category: request.requestType,
        title: this.titleForChangeRequest(request),
        status: request.status,
        submittedAt: request.submittedAt?.toISOString() ?? request.createdAt.toISOString(),
        type: 'EMPLOYEE_CHANGE_REQUEST',
      })),
      ...documentRequests.map((request) => ({
        id: request.id,
        category: 'DOCUMENT',
        title: request.title,
        status: request.status,
        submittedAt: request.createdAt.toISOString(),
        type: 'DOCUMENT_REQUEST',
      })),
    ].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

    const total = items.length;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return createPaginatedResponse(paged, total, page, pageSize);
  }

  async getRequest(tenantId: string, userId: string, id: string) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    const request = await this.prisma.employeeChangeRequest.findFirst({
      where: { id, tenantId, employeeId: employee.id },
    });
    if (!request) {
      throw new AppException({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Employee change request not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return this.toChangeRequestDto(request);
  }

  async createChangeRequest(tenantId: string, userId: string, dto: CreateChangeRequestDto) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    const status = dto.status ?? 'DRAFT';
    const created = await this.prisma.employeeChangeRequest.create({
      data: {
        tenantId,
        employeeId: employee.id,
        requestType: dto.requestType,
        section: dto.section ?? null,
        fieldPath: dto.fieldPath ?? null,
        currentValue: dto.currentValue ?? null,
        requestedValue: dto.requestedValue ?? null,
        reason: dto.reason ?? null,
        evidenceFileKey: dto.evidenceFileKey ?? null,
        status,
        submittedAt: status === 'SUBMITTED' ? new Date() : null,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    return this.toChangeRequestDto(created);
  }

  async submitChangeRequest(tenantId: string, userId: string, id: string) {
    const existing = await this.requireOwnChangeRequest(tenantId, userId, id);
    if (!['DRAFT', 'RETURNED'].includes(existing.status)) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        message: 'Only draft or returned change requests can be submitted.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    const updated = await this.prisma.employeeChangeRequest.update({
      where: { id: existing.id, tenantId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        updatedBy: userId,
        rowVersion: { increment: 1 },
      },
    });
    return this.toChangeRequestDto(updated);
  }

  async cancelChangeRequest(tenantId: string, userId: string, id: string) {
    const existing = await this.requireOwnChangeRequest(tenantId, userId, id);
    if (!['SUBMITTED', 'PENDING', 'DRAFT'].includes(existing.status)) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        message: 'Only draft, submitted, or pending change requests can be cancelled.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    const updated = await this.prisma.employeeChangeRequest.update({
      where: { id: existing.id, tenantId },
      data: {
        status: 'CANCELLED',
        updatedBy: userId,
        rowVersion: { increment: 1 },
      },
    });
    return this.toChangeRequestDto(updated);
  }

  async listForApprovers(
    tenantId: string,
    query: { page?: number; pageSize?: number; type?: string; status?: string },
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.EmployeeChangeRequestWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { requestType: query.type } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.employeeChangeRequest.findMany({
        where,
        include: {
          employee: {
            select: { id: true, employeeNumber: true, displayName: true, userId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.employeeChangeRequest.count({ where }),
    ]);
    return createPaginatedResponse(data.map((request) => ({
      ...this.toChangeRequestDto(request),
      employee: request.employee,
    })), total, page, pageSize);
  }

  async decideChangeRequest(
    tenantId: string,
    approverUserId: string,
    id: string,
    decision: 'APPROVED' | 'REJECTED',
    decisionNote?: string,
  ) {
    const request = await this.prisma.employeeChangeRequest.findFirst({
      where: { id, tenantId },
      include: { employee: { select: { id: true, userId: true } } },
    });
    if (!request) {
      throw new AppException({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Employee change request not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    if (request.employee.userId === approverUserId) {
      throw new AppException({
        code: ERROR_CODES.SEGREGATION_OF_DUTIES,
        message: 'Approvers cannot decide their own employee change requests.',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }
    if (!['SUBMITTED', 'PENDING'].includes(request.status)) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        message: 'Only submitted or pending change requests can be decided.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    const updated = await this.prisma.employeeChangeRequest.update({
      where: { id: request.id, tenantId },
      data: {
        status: decision,
        decidedAt: new Date(),
        decidedBy: approverUserId,
        decisionNote: decisionNote ?? null,
        updatedBy: approverUserId,
        rowVersion: { increment: 1 },
      },
    });
    return this.toChangeRequestDto(updated);
  }

  private async requireOwnChangeRequest(tenantId: string, userId: string, id: string) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    const request = await this.prisma.employeeChangeRequest.findFirst({
      where: { id, tenantId, employeeId: employee.id },
    });
    if (!request) {
      throw new AppException({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Employee change request not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return request;
  }

  private titleForChangeRequest(request: { requestType: string; section: string | null; fieldPath: string | null }) {
    return [request.section, request.fieldPath].filter(Boolean).join(' / ') || request.requestType;
  }

  private toChangeRequestDto(request: {
    id: string;
    tenantId: string;
    employeeId: string;
    requestType: string;
    section: string | null;
    fieldPath: string | null;
    currentValue: string | null;
    requestedValue: string | null;
    reason: string | null;
    evidenceFileKey: string | null;
    status: string;
    submittedAt: Date | null;
    decidedAt: Date | null;
    decidedBy: string | null;
    decisionNote: string | null;
    createdAt: Date;
    updatedAt: Date;
    rowVersion: bigint;
  }) {
    return {
      id: request.id,
      tenantId: request.tenantId,
      employeeId: request.employeeId,
      requestType: request.requestType,
      section: request.section,
      fieldPath: request.fieldPath,
      currentValue: request.currentValue,
      requestedValue: request.requestedValue,
      reason: request.reason,
      evidenceFileKey: request.evidenceFileKey,
      status: request.status,
      timeline: {
        createdAt: request.createdAt.toISOString(),
        submittedAt: request.submittedAt?.toISOString() ?? null,
        decidedAt: request.decidedAt?.toISOString() ?? null,
        decidedBy: request.decidedBy,
      },
      decisionNote: request.decisionNote,
      updatedAt: request.updatedAt.toISOString(),
      rowVersion: request.rowVersion.toString(),
    };
  }
}
