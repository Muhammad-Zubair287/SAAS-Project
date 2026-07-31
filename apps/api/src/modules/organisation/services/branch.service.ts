import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditActorType, AuditEventSeverity } from '../../../common/enums/platform.enum';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { ApiSuccessResponse } from '../../../common/interfaces/api-response.interface';
import { BranchRepository } from '../repositories/branch.repository';
import { LegalEntityRepository } from '../repositories/legal-entity.repository';
import type { CreateBranchDto } from '../dto/create-branch.dto';
import type { UpdateBranchDto } from '../dto/update-branch.dto';
import type { ListBranchesDto } from '../dto/list-branches.dto';
import type { BranchResponseDto } from '../dto/branch-response.dto';

type BranchRow = {
  id: string;
  tenantId: string;
  legalEntityId: string;
  name: string;
  code: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string;
  timezone: string;
  isHeadOffice: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  rowVersion: bigint;
};

@Injectable()
export class BranchService {
  constructor(
    private readonly repo: BranchRepository,
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
    dto: CreateBranchDto,
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
  ): Promise<BranchResponseDto> {
    await this.assertLegalEntity(dto.legalEntityId, tenantId);

    const nameConflict = await this.repo.findByName(dto.name, tenantId, dto.legalEntityId);
    if (nameConflict) {
      throw new AppException({
        code: ERROR_CODES.BRANCH_NAME_CONFLICT,
        message: `A branch named "${dto.name}" already exists in this legal entity.`,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const codeConflict = await this.repo.findByCode(dto.code, tenantId);
    if (codeConflict) {
      throw new AppException({
        code: ERROR_CODES.BRANCH_NAME_CONFLICT,
        message: `A branch with code "${dto.code}" already exists.`,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const branch = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const created = await tx.branch.create({
        data: {
          tenantId,
          legalEntityId: dto.legalEntityId,
          name: dto.name,
          code: dto.code,
          addressLine1: dto.addressLine1 ?? null,
          addressLine2: dto.addressLine2 ?? null,
          city: dto.city ?? null,
          stateProvince: dto.stateProvince ?? null,
          postalCode: dto.postalCode ?? null,
          countryCode: dto.countryCode,
          timezone: dto.timezone,
          isHeadOffice: dto.isHeadOffice ?? false,
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
          action: 'branch.created',
          resourceType: 'branch',
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
          eventType: 'BranchCreated.v1',
          payload: {
            branchId: created.id,
            tenantId,
            legalEntityId: created.legalEntityId,
            actorId: userId,
            correlationId,
          },
        },
      });

      return created;
    });

    return this.toDto(branch);
  }

  async findMany(
    query: ListBranchesDto,
    tenantId: string,
  ): Promise<ApiSuccessResponse<BranchResponseDto[]>> {
    const { data, total } = await this.repo.findMany(query, tenantId);
    return createPaginatedResponse(
      data.map((b) => this.toDto(b)),
      total,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async findById(id: string, tenantId: string): Promise<BranchResponseDto> {
    const branch = await this.repo.findById(id, tenantId);
    if (!branch) {
      throw new AppException({
        code: ERROR_CODES.BRANCH_NOT_FOUND,
        message: 'Branch not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return this.toDto(branch);
  }

  async update(
    id: string,
    dto: UpdateBranchDto,
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
    ifMatch?: string,
  ): Promise<BranchResponseDto> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.BRANCH_NOT_FOUND,
        message: 'Branch not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    if (dto.legalEntityId && dto.legalEntityId !== existing.legalEntityId) {
      await this.assertLegalEntity(dto.legalEntityId, tenantId);
    }

    const targetLegalEntityId = dto.legalEntityId ?? existing.legalEntityId;

    if (dto.name && dto.name !== existing.name) {
      const conflict = await this.repo.findByName(dto.name, tenantId, targetLegalEntityId);
      if (conflict && conflict.id !== id) {
        throw new AppException({
          code: ERROR_CODES.BRANCH_NAME_CONFLICT,
          message: `A branch named "${dto.name}" already exists in this legal entity.`,
          statusCode: HttpStatus.CONFLICT,
        });
      }
    }

    if (dto.code && dto.code !== existing.code) {
      const conflict = await this.repo.findByCode(dto.code, tenantId);
      if (conflict && conflict.id !== id) {
        throw new AppException({
          code: ERROR_CODES.BRANCH_NAME_CONFLICT,
          message: `A branch with code "${dto.code}" already exists.`,
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
      const u = await tx.branch.update({
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
          action: 'branch.updated',
          resourceType: 'branch',
          resourceId: id,
          before: { name: existing.name, code: existing.code },
          after: { name: u.name, code: u.code },
          correlationId,
          severity: AuditEventSeverity.INFO,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'BranchUpdated.v1',
          payload: { branchId: id, tenantId, actorId: userId, correlationId },
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
        code: ERROR_CODES.BRANCH_NOT_FOUND,
        message: 'Branch not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    if (existing.status === 'INACTIVE') return;

    await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      await tx.branch.update({
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
          action: 'branch.deactivated',
          resourceType: 'branch',
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
          eventType: 'BranchDeactivated.v1',
          payload: { branchId: id, tenantId, actorId: userId, correlationId },
        },
      });
    });
  }

  private toDto(b: BranchRow): BranchResponseDto {
    return {
      id: b.id,
      tenantId: b.tenantId,
      legalEntityId: b.legalEntityId,
      name: b.name,
      code: b.code,
      addressLine1: b.addressLine1,
      addressLine2: b.addressLine2,
      city: b.city,
      stateProvince: b.stateProvince,
      postalCode: b.postalCode,
      countryCode: b.countryCode,
      timezone: b.timezone,
      isHeadOffice: b.isHeadOffice,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
      rowVersion: b.rowVersion.toString(),
    };
  }
}
