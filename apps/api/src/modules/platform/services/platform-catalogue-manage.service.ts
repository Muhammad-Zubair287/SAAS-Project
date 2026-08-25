import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditEventSeverity } from '../../../common/enums/platform.enum';
import { PlatformAuditService } from './platform-audit.service';
import type { PlatformActorContext } from '../../../common/interfaces/platform-actor.interface';
import type { PlanResponseDto, EntitlementSummaryDto, DeploymentRegionResponseDto } from '../dto/plan-response.dto';

@Injectable()
export class PlatformCatalogueManageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: PlatformAuditService,
  ) {}

  async createPlan(
    dto: {
      code: string;
      name: string;
      description?: string;
      billingModel?: string;
      status?: string;
    },
    actor: PlatformActorContext,
    correlationId: string,
  ): Promise<PlanResponseDto> {
    const existing = await this.prisma.plan.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new AppException({
        code: ERROR_CODES.CONFLICT,
        message: `Plan code "${dto.code}" already exists.`,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const plan = await this.prisma.withTransaction(async (tx) => {
      const created = await tx.plan.create({
        data: {
          code: dto.code,
          name: dto.name,
          description: dto.description,
          billingModel: dto.billingModel ?? 'PER_SEAT',
          status: dto.status ?? 'DRAFT',
        },
      });
      await this.audit.logWithTx(tx, actor, {
        module: 'platform',
        action: 'plan.created',
        resourceType: 'plan',
        resourceId: created.id,
        after: created,
        correlationId,
        severity: AuditEventSeverity.WARNING,
      });
      return created;
    });

    return this.toPlanDto(plan);
  }

  async updatePlan(
    planId: string,
    dto: Partial<{
      name: string;
      description: string;
      billingModel: string;
      status: string;
    }>,
    actor: PlatformActorContext,
    correlationId: string,
  ): Promise<PlanResponseDto> {
    const existing = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.PLAN_NOT_FOUND,
        message: 'Plan not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const plan = await this.prisma.withTransaction(async (tx) => {
      const updated = await tx.plan.update({
        where: { id: planId },
        data: {
          name: dto.name,
          description: dto.description,
          billingModel: dto.billingModel,
          status: dto.status,
        },
      });
      await this.audit.logWithTx(tx, actor, {
        module: 'platform',
        action: 'plan.updated',
        resourceType: 'plan',
        resourceId: planId,
        before: existing,
        after: updated,
        correlationId,
        severity: AuditEventSeverity.WARNING,
      });
      return updated;
    });

    return this.toPlanDto(plan);
  }

  async setPlanEntitlements(
    planId: string,
    items: Array<{ entitlementId: string; defaultValue: unknown }>,
    actor: PlatformActorContext,
    correlationId: string,
  ): Promise<PlanResponseDto> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: { planEntitlements: { include: { entitlement: true } } },
    });
    if (!plan) {
      throw new AppException({
        code: ERROR_CODES.PLAN_NOT_FOUND,
        message: 'Plan not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    await this.prisma.withTransaction(async (tx) => {
      await tx.planEntitlement.deleteMany({ where: { planId } });
      if (items.length > 0) {
        await tx.planEntitlement.createMany({
          data: items.map((i) => ({
            planId,
            entitlementId: i.entitlementId,
            defaultValue: i.defaultValue as Prisma.InputJsonValue,
          })),
        });
      }
      await this.audit.logWithTx(tx, actor, {
        module: 'platform',
        action: 'plan.entitlements.updated',
        resourceType: 'plan',
        resourceId: planId,
        after: { count: items.length },
        correlationId,
        severity: AuditEventSeverity.WARNING,
      });
    });

    const refreshed = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: { planEntitlements: { include: { entitlement: true } } },
    });
    return this.toPlanDto(refreshed!, true);
  }

  async createEntitlement(
    dto: {
      code: string;
      label: string;
      description?: string;
      dataType: string;
      defaultValue: unknown;
      unit?: string;
      status?: string;
    },
    actor: PlatformActorContext,
    correlationId: string,
  ): Promise<EntitlementSummaryDto> {
    const existing = await this.prisma.entitlement.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new AppException({
        code: ERROR_CODES.CONFLICT,
        message: `Entitlement "${dto.code}" already exists.`,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const row = await this.prisma.withTransaction(async (tx) => {
      const created = await tx.entitlement.create({
        data: {
          code: dto.code,
          label: dto.label,
          description: dto.description,
          dataType: dto.dataType,
          defaultValue: dto.defaultValue as Prisma.InputJsonValue,
          unit: dto.unit,
          status: dto.status ?? 'ACTIVE',
        },
      });
      await this.audit.logWithTx(tx, actor, {
        module: 'platform',
        action: 'entitlement.created',
        resourceType: 'entitlement',
        resourceId: created.id,
        after: created,
        correlationId,
        severity: AuditEventSeverity.INFO,
      });
      return created;
    });

    return {
      code: row.code,
      label: row.label,
      dataType: row.dataType,
      defaultValue: row.defaultValue,
      unit: row.unit ?? undefined,
    };
  }

  async listEntitlements(): Promise<Array<EntitlementSummaryDto & { id: string; status: string }>> {
    const rows = await this.prisma.entitlement.findMany({ orderBy: { code: 'asc' } });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      label: r.label,
      dataType: r.dataType,
      defaultValue: r.defaultValue,
      unit: r.unit ?? undefined,
      status: r.status,
    }));
  }

  async createRegion(
    dto: {
      code: string;
      name: string;
      cloudProvider: string;
      cloudRegion: string;
      countryCode: string;
      status?: string;
    },
    actor: PlatformActorContext,
    correlationId: string,
  ): Promise<DeploymentRegionResponseDto> {
    const existing = await this.prisma.deploymentRegion.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new AppException({
        code: ERROR_CODES.CONFLICT,
        message: `Region "${dto.code}" already exists.`,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const row = await this.prisma.withTransaction(async (tx) => {
      const created = await tx.deploymentRegion.create({
        data: {
          code: dto.code,
          name: dto.name,
          cloudProvider: dto.cloudProvider,
          cloudRegion: dto.cloudRegion,
          countryCode: dto.countryCode,
          status: dto.status ?? 'ACTIVE',
        },
      });
      await this.audit.logWithTx(tx, actor, {
        module: 'platform',
        action: 'region.created',
        resourceType: 'deployment_region',
        resourceId: created.id,
        after: created,
        correlationId,
        severity: AuditEventSeverity.INFO,
      });
      return created;
    });

    return this.toRegionDto(row);
  }

  async updateRegion(
    regionId: string,
    dto: Partial<{
      name: string;
      cloudProvider: string;
      cloudRegion: string;
      countryCode: string;
      status: string;
    }>,
    actor: PlatformActorContext,
    correlationId: string,
  ): Promise<DeploymentRegionResponseDto> {
    const existing = await this.prisma.deploymentRegion.findUnique({ where: { id: regionId } });
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.HOSTING_REGION_NOT_ALLOWED,
        message: 'Region not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const row = await this.prisma.withTransaction(async (tx) => {
      const updated = await tx.deploymentRegion.update({
        where: { id: regionId },
        data: dto,
      });
      await this.audit.logWithTx(tx, actor, {
        module: 'platform',
        action: 'region.updated',
        resourceType: 'deployment_region',
        resourceId: regionId,
        before: existing,
        after: updated,
        correlationId,
        severity: AuditEventSeverity.INFO,
      });
      return updated;
    });

    return this.toRegionDto(row);
  }

  private toPlanDto(
    plan: {
      id: string;
      code: string;
      name: string;
      description: string | null;
      billingModel: string;
      status: string;
      planEntitlements?: Array<{
        defaultValue: unknown;
        entitlement: {
          code: string;
          label: string;
          dataType: string;
          unit: string | null;
        };
      }>;
    },
    withEntitlements = false,
  ): PlanResponseDto {
    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description ?? undefined,
      billingModel: plan.billingModel,
      status: plan.status,
      entitlements:
        withEntitlements && plan.planEntitlements
          ? plan.planEntitlements.map((pe) => ({
              code: pe.entitlement.code,
              label: pe.entitlement.label,
              dataType: pe.entitlement.dataType,
              defaultValue: pe.defaultValue,
              unit: pe.entitlement.unit ?? undefined,
            }))
          : undefined,
    };
  }

  private toRegionDto(row: {
    id: string;
    code: string;
    name: string;
    cloudProvider: string;
    cloudRegion: string;
    countryCode: string;
    status: string;
  }): DeploymentRegionResponseDto {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      cloudProvider: row.cloudProvider,
      cloudRegion: row.cloudRegion,
      countryCode: row.countryCode,
      status: row.status,
    };
  }
}
