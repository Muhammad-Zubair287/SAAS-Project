import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditActorType, AuditEventSeverity } from '../../../common/enums/platform.enum';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { ApiSuccessResponse } from '../../../common/interfaces/api-response.interface';
import { PositionRepository } from '../repositories/position.repository';
import { LegalEntityRepository } from '../repositories/legal-entity.repository';
import { DepartmentRepository } from '../repositories/department.repository';
import type { CreatePositionDto } from '../dto/create-position.dto';
import type { UpdatePositionDto } from '../dto/update-position.dto';
import type { ListPositionsDto } from '../dto/list-positions.dto';
import type { PositionResponseDto } from '../dto/position-response.dto';

type PositionRow = {
  id: string;
  tenantId: string;
  legalEntityId: string;
  departmentId: string | null;
  costCentreId: string | null;
  title: string;
  code: string;
  grade: string | null;
  description: string | null;
  isManager: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  rowVersion: bigint;
};

@Injectable()
export class PositionService {
  constructor(
    private readonly repo: PositionRepository,
    private readonly legalEntityRepo: LegalEntityRepository,
    private readonly departmentRepo: DepartmentRepository,
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

  private async assertDepartmentBelongsToLegalEntity(
    departmentId: string,
    legalEntityId: string,
    tenantId: string,
  ): Promise<void> {
    const dept = await this.departmentRepo.findById(departmentId, tenantId);
    if (!dept || dept.legalEntityId !== legalEntityId) {
      throw new AppException({
        code: ERROR_CODES.DEPARTMENT_NOT_FOUND,
        message: 'Department not found or does not belong to the specified legal entity.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }
  }

  async create(
    dto: CreatePositionDto,
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
  ): Promise<PositionResponseDto> {
    await this.assertLegalEntity(dto.legalEntityId, tenantId);

    if (dto.departmentId) {
      await this.assertDepartmentBelongsToLegalEntity(dto.departmentId, dto.legalEntityId, tenantId);
    }

    const codeConflict = await this.repo.findByCode(dto.code, tenantId);
    if (codeConflict) {
      throw new AppException({
        code: ERROR_CODES.POSITION_CODE_CONFLICT,
        message: `A position with code "${dto.code}" already exists.`,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const titleConflict = await this.repo.findByTitle(dto.title, tenantId, dto.legalEntityId);
    if (titleConflict) {
      throw new AppException({
        code: ERROR_CODES.POSITION_CODE_CONFLICT,
        message: `A position titled "${dto.title}" already exists in this legal entity.`,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const position = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const created = await tx.position.create({
        data: {
          tenantId,
          legalEntityId: dto.legalEntityId,
          departmentId: dto.departmentId ?? null,
          costCentreId: dto.costCentreId ?? null,
          title: dto.title,
          code: dto.code,
          grade: dto.grade ?? null,
          description: dto.description ?? null,
          isManager: dto.isManager ?? false,
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
          action: 'position.created',
          resourceType: 'position',
          resourceId: created.id,
          after: { id: created.id, title: created.title, code: created.code },
          correlationId,
          severity: AuditEventSeverity.INFO,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'PositionCreated.v1',
          payload: {
            positionId: created.id,
            tenantId,
            legalEntityId: created.legalEntityId,
            actorId: userId,
            correlationId,
          },
        },
      });

      return created;
    });

    return this.toDto(position);
  }

  async findMany(
    query: ListPositionsDto,
    tenantId: string,
  ): Promise<ApiSuccessResponse<PositionResponseDto[]>> {
    const { data, total } = await this.repo.findMany(query, tenantId);
    return createPaginatedResponse(
      data.map((p) => this.toDto(p)),
      total,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async findById(id: string, tenantId: string): Promise<PositionResponseDto> {
    const pos = await this.repo.findById(id, tenantId);
    if (!pos) {
      throw new AppException({
        code: ERROR_CODES.POSITION_NOT_FOUND,
        message: 'Position not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return this.toDto(pos);
  }

  async update(
    id: string,
    dto: UpdatePositionDto,
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
    ifMatch?: string,
  ): Promise<PositionResponseDto> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.POSITION_NOT_FOUND,
        message: 'Position not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const targetLegalEntityId = dto.legalEntityId ?? existing.legalEntityId;

    if (dto.legalEntityId && dto.legalEntityId !== existing.legalEntityId) {
      await this.assertLegalEntity(dto.legalEntityId, tenantId);
    }

    if (dto.departmentId && dto.departmentId !== existing.departmentId) {
      await this.assertDepartmentBelongsToLegalEntity(dto.departmentId, targetLegalEntityId, tenantId);
    }

    if (dto.code && dto.code !== existing.code) {
      const conflict = await this.repo.findByCode(dto.code, tenantId);
      if (conflict && conflict.id !== id) {
        throw new AppException({
          code: ERROR_CODES.POSITION_CODE_CONFLICT,
          message: `A position with code "${dto.code}" already exists.`,
          statusCode: HttpStatus.CONFLICT,
        });
      }
    }

    if (dto.title && dto.title !== existing.title) {
      const conflict = await this.repo.findByTitle(dto.title, tenantId, targetLegalEntityId);
      if (conflict && conflict.id !== id) {
        throw new AppException({
          code: ERROR_CODES.POSITION_CODE_CONFLICT,
          message: `A position titled "${dto.title}" already exists in this legal entity.`,
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
      const u = await tx.position.update({
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
          action: 'position.updated',
          resourceType: 'position',
          resourceId: id,
          before: { title: existing.title, code: existing.code },
          after: { title: u.title, code: u.code },
          correlationId,
          severity: AuditEventSeverity.INFO,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'PositionUpdated.v1',
          payload: { positionId: id, tenantId, actorId: userId, correlationId },
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
        code: ERROR_CODES.POSITION_NOT_FOUND,
        message: 'Position not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    if (existing.status === 'INACTIVE') return;

    await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      await tx.position.update({
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
          action: 'position.deactivated',
          resourceType: 'position',
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
          eventType: 'PositionDeactivated.v1',
          payload: { positionId: id, tenantId, actorId: userId, correlationId },
        },
      });
    });
  }

  private toDto(p: PositionRow): PositionResponseDto {
    return {
      id: p.id,
      tenantId: p.tenantId,
      legalEntityId: p.legalEntityId,
      departmentId: p.departmentId,
      costCentreId: p.costCentreId,
      title: p.title,
      code: p.code,
      grade: p.grade,
      description: p.description,
      isManager: p.isManager,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      rowVersion: p.rowVersion.toString(),
    };
  }
}
