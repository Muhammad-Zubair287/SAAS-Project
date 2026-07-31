import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditActorType, AuditEventSeverity } from '../../../common/enums/platform.enum';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { ApiSuccessResponse } from '../../../common/interfaces/api-response.interface';
import { LegalEntityRepository } from '../repositories/legal-entity.repository';
import type { CreateLegalEntityDto } from '../dto/create-legal-entity.dto';
import type { UpdateLegalEntityDto } from '../dto/update-legal-entity.dto';
import type { ListLegalEntitiesDto } from '../dto/list-legal-entities.dto';
import type { LegalEntityResponseDto } from '../dto/legal-entity-response.dto';

type LegalEntityRow = {
  id: string;
  tenantId: string;
  name: string;
  registrationNumber: string | null;
  countryCode: string;
  currencyCode: string;
  timezone: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  isPrimary: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  rowVersion: bigint;
};

@Injectable()
export class LegalEntityService {
  constructor(
    private readonly repo: LegalEntityRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateLegalEntityDto,
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
  ): Promise<LegalEntityResponseDto> {
    const existing = await this.repo.findByName(dto.name, tenantId);
    if (existing) {
      throw new AppException({
        code: ERROR_CODES.LEGAL_ENTITY_NAME_CONFLICT,
        message: `A legal entity named "${dto.name}" already exists.`,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const entity = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const created = await tx.legalEntity.create({
        data: {
          tenantId,
          name: dto.name,
          registrationNumber: dto.registrationNumber ?? null,
          countryCode: dto.countryCode,
          currencyCode: dto.currencyCode,
          timezone: dto.timezone,
          addressLine1: dto.addressLine1 ?? null,
          addressLine2: dto.addressLine2 ?? null,
          city: dto.city ?? null,
          stateProvince: dto.stateProvince ?? null,
          postalCode: dto.postalCode ?? null,
          isPrimary: dto.isPrimary ?? false,
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
          action: 'legal_entity.created',
          resourceType: 'legal_entity',
          resourceId: created.id,
          after: { id: created.id, name: created.name },
          correlationId,
          severity: AuditEventSeverity.INFO,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'LegalEntityCreated.v1',
          payload: {
            legalEntityId: created.id,
            tenantId,
            name: created.name,
            actorId: userId,
            correlationId,
          },
        },
      });

      return created;
    });

    return this.toDto(entity);
  }

  async findMany(
    query: ListLegalEntitiesDto,
    tenantId: string,
  ): Promise<ApiSuccessResponse<LegalEntityResponseDto[]>> {
    const { data, total } = await this.repo.findMany(query, tenantId);
    return createPaginatedResponse(
      data.map((e) => this.toDto(e)),
      total,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async findById(id: string, tenantId: string): Promise<LegalEntityResponseDto> {
    const entity = await this.repo.findById(id, tenantId);
    if (!entity) {
      throw new AppException({
        code: ERROR_CODES.LEGAL_ENTITY_NOT_FOUND,
        message: 'Legal entity not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return this.toDto(entity);
  }

  async update(
    id: string,
    dto: UpdateLegalEntityDto,
    userId: string,
    userEmail: string,
    tenantId: string,
    correlationId: string,
    ifMatch?: string,
  ): Promise<LegalEntityResponseDto> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.LEGAL_ENTITY_NOT_FOUND,
        message: 'Legal entity not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    if (dto.name && dto.name !== existing.name) {
      const conflict = await this.repo.findByName(dto.name, tenantId);
      if (conflict && conflict.id !== id) {
        throw new AppException({
          code: ERROR_CODES.LEGAL_ENTITY_NAME_CONFLICT,
          message: `A legal entity named "${dto.name}" already exists.`,
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
      const u = await tx.legalEntity.update({
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
          action: 'legal_entity.updated',
          resourceType: 'legal_entity',
          resourceId: id,
          before: { name: existing.name },
          after: { name: u.name },
          correlationId,
          severity: AuditEventSeverity.INFO,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          eventId: randomUUID(),
          eventType: 'LegalEntityUpdated.v1',
          payload: { legalEntityId: id, tenantId, actorId: userId, correlationId },
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
        code: ERROR_CODES.LEGAL_ENTITY_NOT_FOUND,
        message: 'Legal entity not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    if (existing.status === 'INACTIVE') return; // idempotent

    await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      await tx.legalEntity.update({
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
          action: 'legal_entity.deactivated',
          resourceType: 'legal_entity',
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
          eventType: 'LegalEntityDeactivated.v1',
          payload: { legalEntityId: id, tenantId, actorId: userId, correlationId },
        },
      });
    });
  }

  private toDto(e: LegalEntityRow): LegalEntityResponseDto {
    return {
      id: e.id,
      tenantId: e.tenantId,
      name: e.name,
      registrationNumber: e.registrationNumber,
      countryCode: e.countryCode,
      currencyCode: e.currencyCode,
      timezone: e.timezone,
      addressLine1: e.addressLine1,
      addressLine2: e.addressLine2,
      city: e.city,
      stateProvince: e.stateProvince,
      postalCode: e.postalCode,
      isPrimary: e.isPrimary,
      status: e.status,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      rowVersion: e.rowVersion.toString(),
    };
  }
}
