import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditActorType, AuditEventSeverity } from '../../../common/enums/platform.enum';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { ApiSuccessResponse } from '../../../common/interfaces/api-response.interface';
import { DepartmentRepository } from '../repositories/department.repository';
import { LegalEntityRepository } from '../repositories/legal-entity.repository';
import { BranchRepository } from '../repositories/branch.repository';
import type { CreateDepartmentDto } from '../dto/create-department.dto';
import type { UpdateDepartmentDto } from '../dto/update-department.dto';
import type { ListDepartmentsDto } from '../dto/list-departments.dto';
import type { DepartmentResponseDto } from '../dto/department-response.dto';

type DepartmentRow = {
  id: string;
  tenantId: string;
  legalEntityId: string;
  branchId: string | null;
  parentId: string | null;
  costCentreId: string | null;
  name: string;
  code: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  rowVersion: bigint;
};

@Injectable()
export class DepartmentService {
  constructor(
    private readonly repo: DepartmentRepository,
    private readonly legalEntityRepo: LegalEntityRepository,
    private readonly branchRepo: BranchRepository,
    private readonly prisma: PrismaService,
  ) {}

  private async assertLegalEntity(legalEntityId: string, tenantId: string): Promise<void> {
    const le = await this.legalEntityRepo.findById(legalEntityId, tenantId);
    if (!le) {
      throw new AppException({
        code: ERROR_CODES.LEGAL_ENTITY_NOT_FOUND,
        message: 'Legal entity not found.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }
  }

  private async assertBranchBelongsToLegalEntity(
    branchId: string,
    legalEntityId: string,
    tenantId: string,
  ): Promise<void> {
    const branch = await this.branchRepo.findById(branchId, tenantId);
    if (!branch || branch.legalEntityId !== legalEntityId) {
      throw new AppException({
        code: ERROR_CODES.BRANCH_NOT_FOUND,
        message: 'Branch not found or does not belong to the specified legal entity.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }
  }

  private async assertParentBelongsToLegalEntity(
    parentId: string,
    legalEntityId: string,
    tenantId: string,
  ): Promise<void> {
    const parent = await this.repo.findById(parentId, tenantId);
    if (!parent || parent.legalEntityId !== legalEntityId) {
      throw new AppException({
        code: ERROR_CODES.DEPARTMENT_NOT_FOUND,
        message: 'Parent department not found or does not belong to the specified legal entity.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }
  }

  async create(
    dto: CreateDepartmentDto,
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
  ): Promise<DepartmentResponseDto> {
    await this.assertLegalEntity(dto.legalEntityId, tenantId);

    if (dto.branchId) {
      await this.assertBranchBelongsToLegalEntity(dto.branchId, dto.legalEntityId, tenantId);
    }

    if (dto.parentId) {
      await this.assertParentBelongsToLegalEntity(dto.parentId, dto.legalEntityId, tenantId);
    }

    const nameConflict = await this.repo.findByName(dto.name, tenantId, dto.legalEntityId);
    if (nameConflict) {
      throw new AppException({
        code: ERROR_CODES.DEPARTMENT_NAME_CONFLICT,
        message: `A department named "${dto.name}" already exists in this legal entity.`,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const codeConflict = await this.repo.findByCode(dto.code, tenantId);
    if (codeConflict) {
      throw new AppException({
        code: ERROR_CODES.DEPARTMENT_NAME_CONFLICT,
        message: `A department with code "${dto.code}" already exists.`,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const department = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const created = await tx.department.create({
        data: {
          tenantId,
          legalEntityId: dto.legalEntityId,
          branchId: dto.branchId ?? null,
          parentId: dto.parentId ?? null,
          costCentreId: dto.costCentreId ?? null,
          name: dto.name,
          code: dto.code,
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
          module: 'organisation',
          action: 'department.created',
          resourceType: 'department',
          resourceId: created.id,
          after: { id: created.id, name: created.name, code: created.code },
          correlationId,
          severity: AuditEventSeverity.INFO,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'DepartmentCreated.v1',
          payload: {
            departmentId: created.id,
            tenantId,
            legalEntityId: created.legalEntityId,
            actorId: userId,
            correlationId,
          },
        },
      });

      return created;
    });

    return this.toDto(department);
  }

  async findMany(
    query: ListDepartmentsDto,
    tenantId: string,
  ): Promise<ApiSuccessResponse<DepartmentResponseDto[]>> {
    const { data, total } = await this.repo.findMany(query, tenantId);
    return createPaginatedResponse(
      data.map((d) => this.toDto(d)),
      total,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async findById(id: string, tenantId: string): Promise<DepartmentResponseDto> {
    const dept = await this.repo.findById(id, tenantId);
    if (!dept) {
      throw new AppException({
        code: ERROR_CODES.DEPARTMENT_NOT_FOUND,
        message: 'Department not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return this.toDto(dept);
  }

  async update(
    id: string,
    dto: UpdateDepartmentDto,
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
    ifMatch?: string,
  ): Promise<DepartmentResponseDto> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.DEPARTMENT_NOT_FOUND,
        message: 'Department not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const targetLegalEntityId = dto.legalEntityId ?? existing.legalEntityId;

    if (dto.legalEntityId && dto.legalEntityId !== existing.legalEntityId) {
      await this.assertLegalEntity(dto.legalEntityId, tenantId);
    }

    if (dto.branchId && dto.branchId !== existing.branchId) {
      await this.assertBranchBelongsToLegalEntity(dto.branchId, targetLegalEntityId, tenantId);
    }

    if (dto.parentId !== undefined && dto.parentId !== existing.parentId) {
      if (dto.parentId === id) {
        throw new AppException({
          code: ERROR_CODES.DEPARTMENT_CIRCULAR_HIERARCHY,
          message: 'A department cannot be its own parent.',
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        });
      }
      if (dto.parentId !== null) {
        await this.assertParentBelongsToLegalEntity(dto.parentId, targetLegalEntityId, tenantId);
        // Cycle detection: check that the proposed parent is not a descendant of this department
        const ancestors = await this.repo.findAncestorIds(dto.parentId, tenantId);
        if (ancestors.includes(id)) {
          throw new AppException({
            code: ERROR_CODES.DEPARTMENT_CIRCULAR_HIERARCHY,
            message: 'Setting this parent would create a circular hierarchy.',
            statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          });
        }
      }
    }

    if (dto.name && dto.name !== existing.name) {
      const conflict = await this.repo.findByName(dto.name, tenantId, targetLegalEntityId);
      if (conflict && conflict.id !== id) {
        throw new AppException({
          code: ERROR_CODES.DEPARTMENT_NAME_CONFLICT,
          message: `A department named "${dto.name}" already exists in this legal entity.`,
          statusCode: HttpStatus.CONFLICT,
        });
      }
    }

    if (dto.code && dto.code !== existing.code) {
      const conflict = await this.repo.findByCode(dto.code, tenantId);
      if (conflict && conflict.id !== id) {
        throw new AppException({
          code: ERROR_CODES.DEPARTMENT_NAME_CONFLICT,
          message: `A department with code "${dto.code}" already exists.`,
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

    const updated = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const u = await tx.department.update({
        where: {
          id,
          tenantId,
          ...(expectedVersion !== undefined ? { rowVersion: expectedVersion } : {}),
        },
        data: { ...dto, updatedBy: userId, rowVersion: { increment: 1 } },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          actorType: AuditActorType.USER,
          actorEmail: userEmail,
          module: 'organisation',
          action: 'department.updated',
          resourceType: 'department',
          resourceId: id,
          before: { name: existing.name, code: existing.code, parentId: existing.parentId },
          after: { name: u.name, code: u.code, parentId: u.parentId },
          correlationId,
          severity: AuditEventSeverity.INFO,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'DepartmentUpdated.v1',
          payload: { departmentId: id, tenantId, actorId: userId, correlationId },
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
        code: ERROR_CODES.DEPARTMENT_NOT_FOUND,
        message: 'Department not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    if (existing.status === 'INACTIVE') return;

    await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      await tx.department.update({
        where: { id, tenantId },
        data: { status: 'INACTIVE', updatedBy: userId, rowVersion: { increment: 1 } },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          actorType: AuditActorType.USER,
          actorEmail: userEmail,
          module: 'organisation',
          action: 'department.deactivated',
          resourceType: 'department',
          resourceId: id,
          before: { status: 'ACTIVE' },
          after: { status: 'INACTIVE' },
          correlationId,
          severity: AuditEventSeverity.WARNING,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'DepartmentDeactivated.v1',
          payload: { departmentId: id, tenantId, actorId: userId, correlationId },
        },
      });
    });
  }

  private toDto(d: DepartmentRow): DepartmentResponseDto {
    return {
      id: d.id,
      tenantId: d.tenantId,
      legalEntityId: d.legalEntityId,
      branchId: d.branchId,
      parentId: d.parentId,
      costCentreId: d.costCentreId,
      name: d.name,
      code: d.code,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      rowVersion: d.rowVersion.toString(),
    };
  }
}
