import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditActorType, AuditEventSeverity } from '../../../common/enums/platform.enum';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { ApiSuccessResponse } from '../../../common/interfaces/api-response.interface';
import { CostCentreRepository } from '../repositories/cost-centre.repository';
import { LegalEntityRepository } from '../repositories/legal-entity.repository';
import type { CreateCostCentreDto } from '../dto/create-cost-centre.dto';
import type { UpdateCostCentreDto } from '../dto/update-cost-centre.dto';
import type { ListCostCentresDto } from '../dto/list-cost-centres.dto';
import type { CostCentreResponseDto } from '../dto/cost-centre-response.dto';

type CostCentreRow = {
  id: string;
  tenantId: string;
  legalEntityId: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  rowVersion: bigint;
};

@Injectable()
export class CostCentreService {
  constructor(
    private readonly repo: CostCentreRepository,
    private readonly legalEntityRepo: LegalEntityRepository,
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

  async create(
    dto: CreateCostCentreDto,
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
  ): Promise<CostCentreResponseDto> {
    await this.assertLegalEntity(dto.legalEntityId, tenantId);

    const codeConflict = await this.repo.findByCode(dto.code, tenantId);
    if (codeConflict) {
      throw new AppException({
        code: ERROR_CODES.COST_CENTRE_CODE_CONFLICT,
        message: `A cost centre with code "${dto.code}" already exists.`,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const nameConflict = await this.repo.findByName(dto.name, tenantId, dto.legalEntityId);
    if (nameConflict) {
      throw new AppException({
        code: ERROR_CODES.COST_CENTRE_CODE_CONFLICT,
        message: `A cost centre named "${dto.name}" already exists in this legal entity.`,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const costCentre = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const created = await tx.costCentre.create({
        data: {
          tenantId,
          legalEntityId: dto.legalEntityId,
          code: dto.code,
          name: dto.name,
          description: dto.description ?? null,
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
          action: 'cost_centre.created',
          resourceType: 'cost_centre',
          resourceId: created.id,
          after: { id: created.id, code: created.code, name: created.name },
          correlationId,
          severity: AuditEventSeverity.INFO,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'CostCentreCreated.v1',
          payload: {
            costCentreId: created.id,
            tenantId,
            legalEntityId: created.legalEntityId,
            actorId: userId,
            correlationId,
          },
        },
      });

      return created;
    });

    return this.toDto(costCentre);
  }

  async findMany(
    query: ListCostCentresDto,
    tenantId: string,
  ): Promise<ApiSuccessResponse<CostCentreResponseDto[]>> {
    const { data, total } = await this.repo.findMany(query, tenantId);
    return createPaginatedResponse(
      data.map((c) => this.toDto(c)),
      total,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async findById(id: string, tenantId: string): Promise<CostCentreResponseDto> {
    const cc = await this.repo.findById(id, tenantId);
    if (!cc) {
      throw new AppException({
        code: ERROR_CODES.COST_CENTRE_NOT_FOUND,
        message: 'Cost centre not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return this.toDto(cc);
  }

  async update(
    id: string,
    dto: UpdateCostCentreDto,
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
    ifMatch?: string,
  ): Promise<CostCentreResponseDto> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.COST_CENTRE_NOT_FOUND,
        message: 'Cost centre not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    if (dto.legalEntityId && dto.legalEntityId !== existing.legalEntityId) {
      await this.assertLegalEntity(dto.legalEntityId, tenantId);
    }

    if (dto.code && dto.code !== existing.code) {
      const conflict = await this.repo.findByCode(dto.code, tenantId);
      if (conflict && conflict.id !== id) {
        throw new AppException({
          code: ERROR_CODES.COST_CENTRE_CODE_CONFLICT,
          message: `A cost centre with code "${dto.code}" already exists.`,
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
      const u = await tx.costCentre.update({
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
          action: 'cost_centre.updated',
          resourceType: 'cost_centre',
          resourceId: id,
          before: { code: existing.code, name: existing.name },
          after: { code: u.code, name: u.name },
          correlationId,
          severity: AuditEventSeverity.INFO,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'CostCentreUpdated.v1',
          payload: { costCentreId: id, tenantId, actorId: userId, correlationId },
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
        code: ERROR_CODES.COST_CENTRE_NOT_FOUND,
        message: 'Cost centre not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    if (existing.status === 'INACTIVE') return;

    await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      await tx.costCentre.update({
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
          action: 'cost_centre.deactivated',
          resourceType: 'cost_centre',
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
          eventType: 'CostCentreDeactivated.v1',
          payload: { costCentreId: id, tenantId, actorId: userId, correlationId },
        },
      });
    });
  }

  private toDto(c: CostCentreRow): CostCentreResponseDto {
    return {
      id: c.id,
      tenantId: c.tenantId,
      legalEntityId: c.legalEntityId,
      code: c.code,
      name: c.name,
      description: c.description,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      rowVersion: c.rowVersion.toString(),
    };
  }
}
