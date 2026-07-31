import { HttpStatus, Injectable } from '@nestjs/common';
import { TenantStatus, SubscriptionStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditEventSeverity, TenantStatus as PlatformTenantStatus } from '../../../common/enums/platform.enum';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { TenantRepository } from '../repositories/tenant.repository';
import { PlanRepository } from '../repositories/plan.repository';
import { PlatformAuditService } from './platform-audit.service';
import type { CreateTenantDto } from '../dto/create-tenant.dto';
import type { UpdateTenantDto } from '../dto/update-tenant.dto';
import type { ListTenantsDto } from '../dto/list-tenants.dto';
import type { SuspendTenantDto, RestoreTenantDto } from '../dto/suspend-tenant.dto';
import type { ChangePlanDto } from '../dto/change-plan.dto';
import type { UpdateEntitlementsDto } from '../dto/update-entitlements.dto';
import type {
  TenantResponseDto,
  TenantSummaryDto,
  TenantUsageDto,
} from '../dto/tenant-response.dto';
import type { PlatformActorContext } from '../../../common/interfaces/platform-actor.interface';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { ApiSuccessResponse } from '../../../common/interfaces/api-response.interface';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class TenantService {
  constructor(
    private readonly tenantRepo: TenantRepository,
    private readonly planRepo: PlanRepository,
    private readonly prisma: PrismaService,
    private readonly audit: PlatformAuditService,
  ) {}

  async create(
    dto: CreateTenantDto,
    actor: PlatformActorContext,
    correlationId: string,
  ): Promise<TenantResponseDto> {
    const existingName = await this.tenantRepo.findByDisplayName(dto.displayName);
    if (existingName) {
      throw new AppException({
        code: ERROR_CODES.TENANT_NAME_CONFLICT,
        message: `A tenant with the name "${dto.displayName}" already exists.`,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    // Batch 2: resolve plan and region by UUID, then validate plan-region compatibility.
    const planRecord = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!planRecord) {
      throw new AppException({
        code: ERROR_CODES.PLAN_NOT_FOUND,
        message: `Plan "${dto.planId}" does not exist.`,
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }
    const regionRecord = await this.prisma.deploymentRegion.findUnique({ where: { id: dto.deploymentRegionId } });
    if (!regionRecord) {
      throw new AppException({
        code: ERROR_CODES.HOSTING_REGION_NOT_ALLOWED,
        message: `Deployment region "${dto.deploymentRegionId}" does not exist or is not available.`,
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }
    const planValid = await this.planRepo.regionAllowsPlan(planRecord.code, regionRecord.code);
    if (!planValid) {
      throw new AppException({
        code: ERROR_CODES.PLAN_NOT_AVAILABLE_IN_REGION,
        message: `Plan "${planRecord.code}" is not available in region "${regionRecord.code}".`,
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }

    let slug = slugify(dto.displayName);
    const existing = await this.tenantRepo.findBySlug(slug);
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const now = new Date();
    const trialEndsAt = dto.trialEndsAt ? new Date(dto.trialEndsAt) : null;
    const periodEnd = trialEndsAt ?? new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    const tenant = await this.prisma.withTransaction(async (tx) => {
      const created = await tx.tenant.create({
        data: {
          displayName: dto.displayName,
          legalName: dto.legalName,
          slug,
          countryCode: dto.countryCode,
          baseCurrency: dto.baseCurrency,
          defaultTimezone: dto.defaultTimezone,
          defaultLocale: dto.defaultLocale,
          deploymentRegionId: dto.deploymentRegionId,
          planId: dto.planId,
          planKey: planRecord.code,
          seatLimit: dto.seatLimit ?? null,
          status: TenantStatus.DRAFT,
          createdBy: actor.email,
          updatedBy: actor.email,
        },
      });

      await tx.tenantSubscription.create({
        data: {
          tenantId: created.id,
          // Spec FK — write planId alongside compat planKey (expand-contract: Batch 3).
          planId: planRecord.id,
          planKey: planRecord.code,           // compat: retained until service fully migrated
          // Spec: TRIAL (not TRIALING). TRIALING retained in enum for compat with existing data.
          status: trialEndsAt ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE,
          billingCycle: dto.billingCycle ?? 'monthly',
          seatLimit: dto.seatLimit ?? 0,
          trialEndsAt,                        // compat: not in spec; retained until service updated
          currentPeriodStart: now,            // compat: not in spec; retained until service updated
          currentPeriodEnd: periodEnd,        // compat: not in spec; retained until service updated
          createdBy: actor.actorId,
        },
      });

      await this.audit.logWithTx(tx, actor, {
        module: 'platform',
        action: 'tenant.created',
        resourceType: 'tenant',
        resourceId: created.id,
        after: { id: created.id, displayName: created.displayName, planId: created.planId, planKey: created.planKey },
        correlationId,
        severity: AuditEventSeverity.INFO,
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: created.id,
          eventId: randomUUID(),
          eventType: 'TenantCreated.v1',
          payload: {
            tenantId: created.id,
            displayName: created.displayName,
            planId: created.planId,
            planKey: created.planKey,
            deploymentRegionId: created.deploymentRegionId,
            actorId: actor.actorId,
            correlationId,
          },
        },
      });

      return created;
    });

    return this.toResponseDto(tenant);
  }

  async findMany(
    query: ListTenantsDto,
  ): Promise<ApiSuccessResponse<TenantSummaryDto[]>> {
    const { data, total } = await this.tenantRepo.findMany(query);
    const summaries: TenantSummaryDto[] = data.map((t) => ({
      id: t.id,
      displayName: t.displayName,
      countryCode: t.countryCode,
      planId: t.planId ?? null,
      status: t.status as unknown as PlatformTenantStatus,
      seatLimit: t.seatLimit,
      createdAt: t.createdAt.toISOString(),
    }));
    return createPaginatedResponse(summaries, total, query.page ?? 1, query.pageSize ?? 20);
  }

  async findById(id: string): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepo.findById(id);
    if (!tenant) {
      throw new AppException({
        code: ERROR_CODES.TENANT_NOT_FOUND,
        message: 'Tenant not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return this.toResponseDto(tenant);
  }

  async update(
    id: string,
    dto: UpdateTenantDto,
    actor: PlatformActorContext,
    correlationId: string,
    ifMatch?: string,
  ): Promise<TenantResponseDto> {
    const existing = await this.tenantRepo.findById(id);
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.TENANT_NOT_FOUND,
        message: 'Tenant not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    if (existing.status === TenantStatus.ARCHIVED) {
      throw new AppException({
        code: ERROR_CODES.TENANT_ARCHIVED,
        message: 'Cannot update an archived tenant.',
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const expectedVersion = ifMatch ? BigInt(ifMatch) : undefined;
    if (expectedVersion !== undefined && existing.rowVersion !== expectedVersion) {
      throw new AppException({
        code: ERROR_CODES.VERSION_CONFLICT,
        message: 'Tenant was modified by another request. Reload and try again.',
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const updated = await this.prisma.withTransaction(async (tx) => {
      const t = await tx.tenant.update({
        where: {
          id,
          ...(expectedVersion !== undefined ? { rowVersion: expectedVersion } : {}),
        },
        data: { ...dto, updatedBy: actor.email, rowVersion: { increment: 1 } },
      });
      await this.audit.logWithTx(tx, actor, {
        module: 'platform',
        action: 'tenant.updated',
        resourceType: 'tenant',
        resourceId: id,
        tenantId: id,
        before: { displayName: existing.displayName, seatLimit: existing.seatLimit },
        after: { displayName: t.displayName, seatLimit: t.seatLimit },
        correlationId,
      });
      await tx.outboxEvent.create({
        data: {
          tenantId: id,
          eventId: randomUUID(),
          eventType: 'TenantUpdated.v1',
          payload: { tenantId: id, actorId: actor.actorId, correlationId },
        },
      });
      return t;
    });

    return this.toResponseDto(updated);
  }

  async activate(
    id: string,
    actor: PlatformActorContext,
    correlationId: string,
  ): Promise<TenantResponseDto> {
    const existing = await this.tenantRepo.findById(id);
    if (!existing) {
      throw new AppException({ code: ERROR_CODES.TENANT_NOT_FOUND, message: 'Tenant not found.', statusCode: HttpStatus.NOT_FOUND });
    }
    if (existing.status === TenantStatus.ACTIVE) {
      throw new AppException({ code: ERROR_CODES.TENANT_ALREADY_ACTIVE, message: 'Tenant is already active.', statusCode: HttpStatus.CONFLICT });
    }
    if (existing.status === TenantStatus.ARCHIVED) {
      throw new AppException({ code: ERROR_CODES.TENANT_ARCHIVED, message: 'Cannot activate an archived tenant.', statusCode: HttpStatus.CONFLICT });
    }

    const activated = await this.prisma.withTransaction(async (tx) => {
      const t = await tx.tenant.update({
        where: { id },
        data: { status: TenantStatus.ACTIVE, activatedAt: new Date(), updatedBy: actor.email, rowVersion: { increment: 1 } },
      });
      await this.audit.logWithTx(tx, actor, { module: 'platform', action: 'tenant.activated', resourceType: 'tenant', resourceId: id, tenantId: id, before: { status: existing.status }, after: { status: 'ACTIVE' }, correlationId, severity: AuditEventSeverity.WARNING });
      await tx.outboxEvent.create({
        data: {
          tenantId: id,
          eventId: randomUUID(),
          eventType: 'TenantActivated.v1',
          payload: { tenantId: id, actorId: actor.actorId, correlationId },
        },
      });
      return t;
    });

    return this.toResponseDto(activated);
  }

  async suspend(
    id: string,
    dto: SuspendTenantDto,
    actor: PlatformActorContext,
    correlationId: string,
  ): Promise<TenantResponseDto> {
    const existing = await this.tenantRepo.findById(id);
    if (!existing) {
      throw new AppException({ code: ERROR_CODES.TENANT_NOT_FOUND, message: 'Tenant not found.', statusCode: HttpStatus.NOT_FOUND });
    }
    if (existing.status === TenantStatus.SUSPENDED) {
      throw new AppException({ code: ERROR_CODES.TENANT_ALREADY_SUSPENDED, message: 'Tenant is already suspended.', statusCode: HttpStatus.CONFLICT });
    }
    if (existing.status === TenantStatus.ARCHIVED) {
      throw new AppException({ code: ERROR_CODES.TENANT_ARCHIVED, message: 'Cannot suspend an archived tenant.', statusCode: HttpStatus.CONFLICT });
    }

    const suspended = await this.prisma.withTransaction(async (tx) => {
      const t = await tx.tenant.update({
        where: { id },
        data: { status: TenantStatus.SUSPENDED, suspendedAt: new Date(), suspendedReason: dto.reason, suspendedBy: actor.actorId, updatedBy: actor.email, rowVersion: { increment: 1 } },
      });
      await this.audit.logWithTx(tx, actor, { module: 'platform', action: 'tenant.suspended', resourceType: 'tenant', resourceId: id, tenantId: id, before: { status: existing.status }, after: { status: 'SUSPENDED', reason: dto.reason }, correlationId, severity: AuditEventSeverity.CRITICAL });
      await tx.outboxEvent.create({
        data: {
          tenantId: id,
          eventId: randomUUID(),
          eventType: 'TenantSuspended.v1',
          payload: { tenantId: id, reason: dto.reason, actorId: actor.actorId, correlationId },
        },
      });
      return t;
    });

    return this.toResponseDto(suspended);
  }

  async restore(
    id: string,
    dto: RestoreTenantDto,
    actor: PlatformActorContext,
    correlationId: string,
  ): Promise<TenantResponseDto> {
    const existing = await this.tenantRepo.findById(id);
    if (!existing) {
      throw new AppException({ code: ERROR_CODES.TENANT_NOT_FOUND, message: 'Tenant not found.', statusCode: HttpStatus.NOT_FOUND });
    }
    if (existing.status !== TenantStatus.SUSPENDED) {
      throw new AppException({ code: ERROR_CODES.BAD_REQUEST, message: 'Only suspended tenants can be restored.', statusCode: HttpStatus.BAD_REQUEST });
    }

    const restored = await this.prisma.withTransaction(async (tx) => {
      const t = await tx.tenant.update({
        where: { id },
        data: { status: TenantStatus.ACTIVE, suspendedAt: null, suspendedReason: null, suspendedBy: null, updatedBy: actor.email, rowVersion: { increment: 1 } },
      });
      await this.audit.logWithTx(tx, actor, { module: 'platform', action: 'tenant.restored', resourceType: 'tenant', resourceId: id, tenantId: id, before: { status: existing.status }, after: { status: 'ACTIVE' }, correlationId, severity: AuditEventSeverity.CRITICAL });
      await tx.outboxEvent.create({
        data: {
          tenantId: id,
          eventId: randomUUID(),
          eventType: 'TenantRestored.v1',
          payload: { tenantId: id, reason: dto.reason, actorId: actor.actorId, correlationId },
        },
      });
      return t;
    });

    return this.toResponseDto(restored);
  }

  async changePlan(
    id: string,
    dto: ChangePlanDto,
    actor: PlatformActorContext,
    correlationId: string,
  ): Promise<TenantResponseDto> {
    const existing = await this.tenantRepo.findById(id);
    if (!existing) {
      throw new AppException({ code: ERROR_CODES.TENANT_NOT_FOUND, message: 'Tenant not found.', statusCode: HttpStatus.NOT_FOUND });
    }

    const plan = await this.planRepo.findByKey(dto.planKey);
    // Batch 1: Plan.isActive replaced by Plan.status varchar.
    if (!plan || plan.status !== 'ACTIVE') {
      throw new AppException({ code: ERROR_CODES.PLAN_NOT_FOUND, message: `Plan "${dto.planKey}" not found or inactive.`, statusCode: HttpStatus.UNPROCESSABLE_ENTITY });
    }

    const updated = await this.prisma.withTransaction(async (tx) => {
      const t = await tx.tenant.update({
        where: { id },
        data: {
          // Spec FK — write planId alongside compat planKey (expand-contract: Batch 2).
          planId: plan.id,
          planKey: dto.planKey,               // compat: retained until ChangePlanDto migrated to planId
          seatLimit: dto.seatLimit ?? existing.seatLimit,
          updatedBy: actor.email,
          rowVersion: { increment: 1 },
        },
      });
      await this.audit.logWithTx(tx, actor, { module: 'platform', action: 'tenant.plan_changed', resourceType: 'tenant', resourceId: id, tenantId: id, before: { planKey: existing.planKey }, after: { planKey: dto.planKey }, correlationId, severity: AuditEventSeverity.WARNING });
      await tx.outboxEvent.create({
        data: {
          tenantId: id,
          eventId: randomUUID(),
          eventType: 'TenantPlanChanged.v1',
          payload: { tenantId: id, oldPlanKey: existing.planKey, newPlanKey: dto.planKey, actorId: actor.actorId, correlationId },
        },
      });
      return t;
    });

    return this.toResponseDto(updated);
  }

  async updateEntitlements(
    id: string,
    dto: UpdateEntitlementsDto,
    actor: PlatformActorContext,
    correlationId: string,
    ifMatch?: string,
  ): Promise<TenantResponseDto> {
    const existing = await this.tenantRepo.findById(id);
    if (!existing) {
      throw new AppException({ code: ERROR_CODES.TENANT_NOT_FOUND, message: 'Tenant not found.', statusCode: HttpStatus.NOT_FOUND });
    }

    const expectedVersion = ifMatch ? BigInt(ifMatch) : undefined;
    if (expectedVersion !== undefined && existing.rowVersion !== expectedVersion) {
      throw new AppException({ code: ERROR_CODES.VERSION_CONFLICT, message: 'Concurrent modification detected.', statusCode: HttpStatus.CONFLICT });
    }

    await this.prisma.withTransaction(async (tx) => {
      for (const e of dto.entitlements) {
        // Spec FK: resolve entitlement.id from code for the spec entitlementId column.
        // entitlement may be null if key is not in catalogue; spec FK is nullable during compat.
        const entitlementRecord = await tx.entitlement.findUnique({ where: { code: e.key } });

        await tx.tenantEntitlement.upsert({
          where: { tenantId_entitlementKey: { tenantId: id, entitlementKey: e.key } },
          create: {
            tenantId: id,
            entitlementKey: e.key,              // compat: upsert where key used by current service
            value: e.value,                     // compat: string-encoded value
            overriddenBy: actor.actorId,        // compat: not in spec (spec uses updatedBy)
            // Spec fields (expand-contract: Batch 4)
            entitlementId: entitlementRecord?.id,
            valueJson: e.value,                 // stored as JSON string in JSONB column
            source: 'SUPPORT_OVERRIDE',
          },
          update: {
            value: e.value,                     // compat
            overriddenBy: actor.actorId,        // compat
            // Spec fields
            entitlementId: entitlementRecord?.id,
            valueJson: e.value,
            source: 'SUPPORT_OVERRIDE',
          },
        });
      }
      await this.audit.logWithTx(tx, actor, { module: 'platform', action: 'tenant.entitlements_changed', resourceType: 'tenant', resourceId: id, tenantId: id, after: { entitlements: dto.entitlements }, correlationId, severity: AuditEventSeverity.WARNING });
      await tx.outboxEvent.create({
        data: {
          tenantId: id,
          eventId: randomUUID(),
          eventType: 'TenantEntitlementsChanged.v1',
          payload: { tenantId: id, entitlements: dto.entitlements as unknown as string[], actorId: actor.actorId, correlationId },
        },
      });
    });

    return this.findById(id);
  }

  async getUsage(id: string): Promise<TenantUsageDto> {
    const tenant = await this.tenantRepo.findById(id);
    if (!tenant) {
      throw new AppException({ code: ERROR_CODES.TENANT_NOT_FOUND, message: 'Tenant not found.', statusCode: HttpStatus.NOT_FOUND });
    }

    const snapshot = await this.prisma.tenantUsageSnapshot.findFirst({
      where: { tenantId: id },
      orderBy: { snapshotDate: 'desc' },
    });

    const active = snapshot?.activeEmployees ?? 0;
    const total = snapshot?.totalEmployees ?? 0;
    const seatLimitVal = tenant.seatLimit;
    const utilPct = seatLimitVal != null && seatLimitVal > 0
      ? Math.round((active / seatLimitVal) * 100)
      : 0;

    return {
      tenantId: id,
      activeEmployees: active,
      totalEmployees: total,
      seatLimit: seatLimitVal,
      seatUtilisationPct: utilPct,
      storageUsedBytes: snapshot?.storageUsedBytes.toString() ?? '0',
      apiCallsMonth: snapshot?.apiCallsMonth ?? 0,
      snapshotDate: snapshot?.snapshotDate.toISOString().split('T')[0],
    };
  }

  async getDashboardStats(): Promise<{
    total: number;
    active: number;
    draft: number;
    suspended: number;
    closed: number;
  }> {
    const counts = await this.tenantRepo.countByStatus();
    return {
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      active: counts['ACTIVE'] ?? 0,
      draft: counts['DRAFT'] ?? 0,
      suspended: counts['SUSPENDED'] ?? 0,
      // Aggregate CLOSED (spec) + ARCHIVED (compat) so the stat is correct during migration.
      closed: (counts['CLOSED'] ?? 0) + (counts['ARCHIVED'] ?? 0),
    };
  }

  private toResponseDto(tenant: NonNullable<Awaited<ReturnType<TenantRepository['findById']>>>): TenantResponseDto {
    return {
      id: tenant.id,
      displayName: tenant.displayName,
      legalName: tenant.legalName,
      slug: tenant.slug,
      countryCode: tenant.countryCode,
      baseCurrency: tenant.baseCurrency,
      defaultTimezone: tenant.defaultTimezone,
      defaultLocale: tenant.defaultLocale,
      deploymentRegionId: tenant.deploymentRegionId,
      planId: tenant.planId ?? null,
      seatLimit: tenant.seatLimit,
      status: tenant.status as unknown as PlatformTenantStatus,
      activatedAt: tenant.activatedAt?.toISOString(),
      suspendedAt: tenant.suspendedAt?.toISOString(),
      suspendedReason: tenant.suspendedReason ?? undefined,
      createdAt: tenant.createdAt.toISOString(),
      createdBy: tenant.createdBy ?? undefined,
      updatedAt: tenant.updatedAt.toISOString(),
      rowVersion: tenant.rowVersion.toString(),
    };
  }
}
