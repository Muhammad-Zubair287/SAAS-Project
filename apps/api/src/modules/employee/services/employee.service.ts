import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { type Employee } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditActorType, AuditEventSeverity } from '../../../common/enums/platform.enum';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { ApiSuccessResponse } from '../../../common/interfaces/api-response.interface';
import { EmployeeRepository } from '../repositories/employee.repository';
import { EmployeeNumberGenerator } from './employee-number-generator.service';
import type { CreateEmployeeDto } from '../dto/create-employee.dto';
import type { UpdateEmployeeDto } from '../dto/update-employee.dto';
import type { ListEmployeesDto } from '../dto/list-employees.dto';
import type { EmployeeResponseDto } from '../dto/employee-response.dto';

type EmployeeRow = {
  id: string;
  tenantId: string;
  legalEntityId: string;
  branchId: string | null;
  departmentId: string | null;
  positionId: string | null;
  managerId: string | null;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  displayName: string;
  gender: string | null;
  dateOfBirth: Date | null;
  nationalId: string | null;
  emailWork: string;
  emailPersonal: string | null;
  phoneWork: string | null;
  phoneMobile: string | null;
  hireDate: Date;
  terminationDate: Date | null;
  status: string;
  employmentType: string;
  createdAt: Date;
  updatedAt: Date;
  rowVersion: bigint;
};

@Injectable()
export class EmployeeService {
  constructor(
    private readonly repo: EmployeeRepository,
    private readonly prisma: PrismaService,
    private readonly numberGenerator: EmployeeNumberGenerator,
  ) {}

  async create(
    dto: CreateEmployeeDto,
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
  ): Promise<EmployeeResponseDto> {
    const existingEmail = await this.repo.findByEmailWork(dto.emailWork, tenantId);
    if (existingEmail) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_EMAIL_CONFLICT,
        message: `An employee with work email "${dto.emailWork}" already exists.`,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const employeeNumber = await this.numberGenerator.next(tenantId, dto.legalEntityId);

    const displayName = `${dto.firstName} ${dto.lastName}`;

    const employee = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const created = await tx.employee.create({
        data: {
          tenantId,
          legalEntityId: dto.legalEntityId,
          branchId: dto.branchId ?? null,
          departmentId: dto.departmentId ?? null,
          positionId: dto.positionId ?? null,
          managerId: dto.managerId ?? null,
          employeeNumber,
          firstName: dto.firstName,
          lastName: dto.lastName,
          displayName,
          gender: dto.gender ?? null,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          nationalId: dto.nationalId ?? null,
          emailWork: dto.emailWork,
          emailPersonal: dto.emailPersonal ?? null,
          phoneWork: dto.phoneWork ?? null,
          phoneMobile: dto.phoneMobile ?? null,
          hireDate: new Date(dto.hireDate),
          employmentType: dto.employmentType,
          status: 'ACTIVE',
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          actorType: AuditActorType.USER,
          actorEmail: userEmail,
          module: 'employee',
          action: 'employee.created',
          resourceType: 'employee',
          resourceId: created.id,
          after: {
            id: created.id,
            employeeNumber: created.employeeNumber,
            displayName: created.displayName,
          },
          correlationId,
          severity: AuditEventSeverity.INFO,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'EmployeeCreated.v1',
          payload: {
            employeeId: created.id,
            employeeNumber: created.employeeNumber,
            tenantId,
            legalEntityId: created.legalEntityId,
            actorId: userId,
            correlationId,
          },
        },
      });

      return created;
    });

    return this.toDto(employee);
  }

  async findMany(
    query: ListEmployeesDto,
    tenantId: string,
  ): Promise<ApiSuccessResponse<EmployeeResponseDto[]>> {
    const { data, total } = await this.repo.findMany(query, tenantId);
    return createPaginatedResponse(
      data.map((e) => this.toDto(e)),
      total,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async findById(id: string, tenantId: string): Promise<EmployeeResponseDto> {
    const employee = await this.repo.findById(id, tenantId);
    if (!employee) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_NOT_FOUND,
        message: 'Employee not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return this.toDto(employee);
  }

  async update(
    id: string,
    dto: UpdateEmployeeDto,
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
    ifMatch?: string,
  ): Promise<EmployeeResponseDto> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_NOT_FOUND,
        message: 'Employee not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    if (existing.status === 'TERMINATED') {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_ALREADY_TERMINATED,
        message: 'Cannot update a terminated employee.',
        statusCode: HttpStatus.CONFLICT,
      });
    }

    if (dto.emailWork && dto.emailWork !== existing.emailWork) {
      const conflict = await this.repo.findByEmailWork(dto.emailWork, tenantId);
      if (conflict && conflict.id !== id) {
        throw new AppException({
          code: ERROR_CODES.EMPLOYEE_EMAIL_CONFLICT,
          message: `An employee with work email "${dto.emailWork}" already exists.`,
          statusCode: HttpStatus.CONFLICT,
        });
      }
    }

    const expectedVersion = ifMatch ? BigInt(ifMatch) : undefined;
    if (expectedVersion !== undefined && existing.rowVersion !== expectedVersion) {
      throw new AppException({
        code: ERROR_CODES.VERSION_CONFLICT,
        message: 'Concurrent modification detected. Reload and try again.',
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const displayName =
      dto.firstName || dto.lastName
        ? `${dto.firstName ?? existing.firstName} ${dto.lastName ?? existing.lastName}`
        : undefined;

    const updated = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const u = await tx.employee.update({
        where: {
          id,
          tenantId,
          ...(expectedVersion !== undefined ? { rowVersion: expectedVersion } : {}),
        },
        data: {
          ...dto,
          ...(displayName ? { displayName } : {}),
          updatedBy: userId,
          rowVersion: { increment: 1 },
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          actorType: AuditActorType.USER,
          actorEmail: userEmail,
          module: 'employee',
          action: 'employee.updated',
          resourceType: 'employee',
          resourceId: id,
          before: { status: existing.status, displayName: existing.displayName },
          after: { status: u.status, displayName: u.displayName },
          correlationId,
          severity: AuditEventSeverity.INFO,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'EmployeeUpdated.v1',
          payload: { employeeId: id, tenantId, actorId: userId, correlationId },
        },
      });

      return u;
    });

    return this.toDto(updated);
  }

  async deactivate(
    id: string,
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
  ): Promise<void> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.EMPLOYEE_NOT_FOUND,
        message: 'Employee not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    if (existing.status === 'INACTIVE') return;

    await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      await tx.employee.update({
        where: { id, tenantId },
        data: { status: 'INACTIVE', updatedBy: userId, rowVersion: { increment: 1 } },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          actorType: AuditActorType.USER,
          actorEmail: userEmail,
          module: 'employee',
          action: 'employee.deactivated',
          resourceType: 'employee',
          resourceId: id,
          before: { status: existing.status },
          after: { status: 'INACTIVE' },
          correlationId,
          severity: AuditEventSeverity.WARNING,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'EmployeeDeactivated.v1',
          payload: { employeeId: id, tenantId, actorId: userId, correlationId },
        },
      });
    });
  }

  private toDto(e: Employee | EmployeeRow): EmployeeResponseDto {
    return {
      id: e.id,
      tenantId: e.tenantId,
      legalEntityId: e.legalEntityId,
      branchId: e.branchId,
      departmentId: e.departmentId,
      positionId: e.positionId,
      managerId: e.managerId,
      employeeNumber: e.employeeNumber,
      firstName: e.firstName,
      lastName: e.lastName,
      displayName: e.displayName,
      gender: e.gender,
      dateOfBirth: e.dateOfBirth ? (e.dateOfBirth.toISOString().split('T')[0] ?? null) : null,
      nationalId: e.nationalId,
      emailWork: e.emailWork,
      emailPersonal: e.emailPersonal,
      phoneWork: e.phoneWork,
      phoneMobile: e.phoneMobile,
      hireDate: e.hireDate.toISOString().split('T')[0] ?? '',
      terminationDate: e.terminationDate ? (e.terminationDate.toISOString().split('T')[0] ?? null) : null,
      status: e.status,
      employmentType: e.employmentType,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      rowVersion: e.rowVersion.toString(),
    };
  }
}
