import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { TenantStatus, SubscriptionStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditEventSeverity, PlatformRole, TenantStatus as PlatformTenantStatus } from '../../../common/enums/platform.enum';
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
  PrimaryAdminInvitationDto,
} from '../dto/tenant-response.dto';
import type { PlatformUsageSummaryDto } from '../dto/plan-response.dto';
import type { TenantWithRelations } from '../repositories/tenant.repository';
import { parseNumericEntitlement } from '../repositories/tenant.repository';
import type { PlatformActorContext } from '../../../common/interfaces/platform-actor.interface';
import { createPaginatedResponse } from '../../../common/utils/response.helper';
import type { ApiSuccessResponse } from '../../../common/interfaces/api-response.interface';
import { ensureM07PermissionsForTenant } from '../../../database/seed/m07-permissions.seed';
import { ensureTenantAdminPermissionsForTenant } from '../../../database/seed/tenant-admin-permissions.seed';
import { ensureHrConsolePermissionsForTenant } from '../../../database/seed/hr-console-permissions.seed';
import { ensureEssPermissionsForTenant } from '../../../database/seed/ess-permissions.seed';
import { InvitationService } from '../../authentication/services/invitation.service';
import { MfaService } from '../../authentication/services/mfa.service';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly tenantRepo: TenantRepository,
    private readonly planRepo: PlanRepository,
    private readonly prisma: PrismaService,
    private readonly audit: PlatformAuditService,
    private readonly invitationService: InvitationService,
    private readonly mfaService: MfaService,
  ) {}

  async validateSlug(slug: string): Promise<{ available: boolean; slug: string }> {
    const normalized = slugify(slug);
    if (!normalized || normalized.length < 2) {
      throw new AppException({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Slug must be at least 2 characters after normalization.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }
    const existing = await this.tenantRepo.findBySlug(normalized);
    return { available: !existing, slug: normalized };
  }

  async validateAdminEmail(email: string): Promise<{ available: boolean; email: string }> {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@')) {
      throw new AppException({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'A valid email address is required.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }
    const existingUser = await this.prisma.appUser.findFirst({
      where: { email: { equals: normalized, mode: 'insensitive' } },
      select: { id: true },
    });
    const pendingInvite = await this.prisma.userInvitation.findFirst({
      where: {
        email: { equals: normalized, mode: 'insensitive' },
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    return { available: !existingUser && !pendingInvite, email: normalized };
  }

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

    const storageEntitlement = await this.prisma.entitlement.findUnique({
      where: { code: 'storage_limit_gb' },
    });
    const planStorage = storageEntitlement
      ? await this.prisma.planEntitlement.findUnique({
          where: {
            planId_entitlementId: {
              planId: planRecord.id,
              entitlementId: storageEntitlement.id,
            },
          },
        })
      : null;
    const storageLimitGb =
      dto.storageLimitGb ?? parseNumericEntitlement(planStorage?.defaultValue);
    const storageSource = dto.storageLimitGb != null ? 'CONTRACT' : 'PLAN';

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

      if (storageEntitlement && storageLimitGb != null) {
        await tx.tenantEntitlement.create({
          data: {
            tenantId: created.id,
            entitlementKey: 'storage_limit_gb',
            value: String(storageLimitGb),
            entitlementId: storageEntitlement.id,
            valueJson: storageLimitGb,
            source: storageSource,
            createdBy: actor.actorId,
          },
        });
      }

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

      // M07: seed shift/roster permission catalogue + default HR/Admin roles.
      await ensureM07PermissionsForTenant(tx, created.id);
      // Tenant Admin Console permissions on Tenant Admin role.
      await ensureTenantAdminPermissionsForTenant(tx, created.id);
      // HR Console Scope A — full M03–M07 + lifecycle on HR Manager.
      await ensureHrConsolePermissionsForTenant(tx, created.id);
      await ensureEssPermissionsForTenant(tx, created.id);

      return created;
    });

    // Post-commit: primary admin invitation + email. Must not roll back tenant provisioning
    // if SMTP/email delivery fails (invitation service already fire-and-forgets email).
    const invitation =
      dto.sendInvitation === false
        ? null
        : await this.invitePrimaryAdmin(tenant.id, dto, actor, correlationId);

    const withRelations = await this.tenantRepo.findById(tenant.id);
    return this.toResponseDto(
      withRelations ?? tenant,
      invitation ?? undefined,
      undefined,
      storageLimitGb,
    );
  }

  private async invitePrimaryAdmin(
    tenantId: string,
    dto: CreateTenantDto,
    actor: PlatformActorContext,
    correlationId: string,
  ): Promise<PrimaryAdminInvitationDto | null> {
    const adminRole = await this.prisma.role.findFirst({
      where: { tenantId, name: 'Tenant Admin' },
      select: { id: true },
    });

    if (!adminRole) {
      this.logger.error(
        `Primary admin invitation skipped: Tenant Admin role missing for tenant=${tenantId} correlationId=${correlationId}`,
      );
      return null;
    }

    try {
      const created = await this.invitationService.createInvitation(
        {
          email: dto.primaryAdmin.email,
          tenantId,
          displayName: dto.primaryAdmin.name,
          roleIds: [adminRole.id],
        },
        actor.actorId,
        {
          correlationId,
          ipAddress: null,
          userAgent: null,
        },
      );
      return {
        email: created.email,
        status: 'PENDING',
        expiresAt: created.expiresAt.toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      // Tenant already committed — do not undo provisioning. Tokens are never returned.
      this.logger.error(
        `Primary admin invitation failed tenant=${tenantId} email=${dto.primaryAdmin.email} correlationId=${correlationId} error=${message}`,
      );
      return null;
    }
  }

  async findMany(
    query: ListTenantsDto,
  ): Promise<ApiSuccessResponse<TenantSummaryDto[]>> {
    const { data, total } = await this.tenantRepo.findMany(query);
    const summaries: TenantSummaryDto[] = data.map((t) => this.toSummaryDto(t));
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
    const administrators = await this.invitationService.listByTenant(id);
    const primary = administrators[0];
    const storageLimitGb = await this.tenantRepo.resolveStorageLimitGb(id, tenant.planId);
    return this.toResponseDto(tenant, primary, administrators, storageLimitGb);
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

    return this.findById(id);
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
    if (existing.status === TenantStatus.SUSPENDED) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        message: 'Suspended tenants must be restored, not activated.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    if (existing.status === TenantStatus.TRIAL || existing.status === TenantStatus.GRACE) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        message: 'Tenant is already operational. Activation applies to DRAFT tenants, or CLOSED tenants with elevated permission.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    if (existing.status === TenantStatus.CLOSED && actor.platformRole !== PlatformRole.SUPER_ADMIN) {
      throw new AppException({
        code: ERROR_CODES.PERMISSION_DENIED,
        message: 'Closed tenants cannot be reactivated without elevated Super Administrator permission.',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }
    if (!existing.planId) {
      throw new AppException({
        code: ERROR_CODES.TENANT_PLAN_REQUIRED,
        message: 'An activated tenant requires an active commercial plan.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }
    const plan = await this.prisma.plan.findUnique({ where: { id: existing.planId } });
    if (!plan || plan.status !== 'ACTIVE') {
      throw new AppException({
        code: ERROR_CODES.TENANT_PLAN_REQUIRED,
        message: 'An activated tenant requires an active commercial plan.',
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
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
      // Idempotent — ensures M07 roles/perms exist even for tenants created before wiring.
      await ensureM07PermissionsForTenant(tx, id);
      await ensureTenantAdminPermissionsForTenant(tx, id);
      await ensureHrConsolePermissionsForTenant(tx, id);
      await ensureEssPermissionsForTenant(tx, id);
      return t;
    });

    return this.findById(activated.id);
  }

  async suspend(
    id: string,
    dto: SuspendTenantDto,
    actor: PlatformActorContext,
    correlationId: string,
  ): Promise<TenantResponseDto> {
    await this.mfaService.assertPlatformStepUp(actor.actorId, dto.mfaCode);
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
    if (existing.status === TenantStatus.CLOSED) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        message: 'Closed tenants cannot be suspended.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const suspended = await this.prisma.withTransaction(async (tx) => {
      const t = await tx.tenant.update({
        where: { id },
        data: { status: TenantStatus.SUSPENDED, suspendedAt: new Date(), suspendedReason: dto.reason, suspendedBy: actor.actorId, updatedBy: actor.email, rowVersion: { increment: 1 } },
      });
      await this.audit.logWithTx(tx, actor, {
        module: 'platform',
        action: 'tenant.suspended',
        resourceType: 'tenant',
        resourceId: id,
        tenantId: id,
        before: { status: existing.status },
        after: { status: 'SUSPENDED', reason: dto.reason, userMessage: dto.userMessage ?? null },
        correlationId,
        severity: AuditEventSeverity.CRITICAL,
      });
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

    return this.findById(suspended.id);
  }

  async restore(
    id: string,
    dto: RestoreTenantDto,
    actor: PlatformActorContext,
    correlationId: string,
  ): Promise<TenantResponseDto> {
    await this.mfaService.assertPlatformStepUp(actor.actorId, dto.mfaCode);
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

    return this.findById(restored.id);
  }

  async close(
    id: string,
    reason: string,
    actor: PlatformActorContext,
    correlationId: string,
    mfaCode?: string,
  ): Promise<TenantResponseDto> {
    await this.mfaService.assertPlatformStepUp(actor.actorId, mfaCode);
    const existing = await this.tenantRepo.findById(id);
    if (!existing) {
      throw new AppException({
        code: ERROR_CODES.TENANT_NOT_FOUND,
        message: 'Tenant not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    if (
      existing.status !== TenantStatus.DRAFT &&
      existing.status !== TenantStatus.SUSPENDED &&
      existing.status !== TenantStatus.ACTIVE
    ) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        message: 'Only DRAFT, ACTIVE, or SUSPENDED tenants can be closed.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const closed = await this.prisma.withTransaction(async (tx) => {
      const t = await tx.tenant.update({
        where: { id },
        data: {
          status: TenantStatus.CLOSED,
          updatedBy: actor.email,
          rowVersion: { increment: 1 },
        },
      });
      await this.audit.logWithTx(tx, actor, {
        module: 'platform',
        action: 'tenant.closed',
        resourceType: 'tenant',
        resourceId: id,
        tenantId: id,
        before: { status: existing.status },
        after: { status: 'CLOSED', reason },
        correlationId,
        severity: AuditEventSeverity.CRITICAL,
      });
      return t;
    });

    return this.findById(closed.id);
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

    return this.findById(updated.id);
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
    const storageLimitGb = await this.tenantRepo.resolveStorageLimitGb(id, tenant.planId);

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
      storageLimitGb,
      apiCallsMonth: snapshot?.apiCallsMonth ?? 0,
      snapshotDate: snapshot?.snapshotDate.toISOString().split('T')[0],
    };
  }

  async getDashboardStats(): Promise<{
    total: number;
    active: number;
    trial: number;
    draft: number;
    suspended: number;
    closed: number;
    grace: number;
    trialsEndingSoon: number;
    activeSupportGrants: number;
  }> {
    const [counts, trialsEndingSoon, activeSupportGrants] = await Promise.all([
      this.tenantRepo.countByStatus(),
      this.tenantRepo.countTrialsEndingSoon(14),
      this.tenantRepo.countActiveSupportGrants(),
    ]);
    return {
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      active: counts['ACTIVE'] ?? 0,
      trial: counts['TRIAL'] ?? 0,
      draft: counts['DRAFT'] ?? 0,
      suspended: counts['SUSPENDED'] ?? 0,
      closed: (counts['CLOSED'] ?? 0) + (counts['ARCHIVED'] ?? 0),
      grace: counts['GRACE'] ?? 0,
      trialsEndingSoon,
      activeSupportGrants,
    };
  }

  async getPlatformUsageSummary(): Promise<PlatformUsageSummaryDto> {
    const summary = await this.tenantRepo.getPlatformUsageSummary();
    const utilPct =
      summary.totalSeatLimit > 0
        ? Math.round((summary.totalActiveEmployees / summary.totalSeatLimit) * 100)
        : 0;
    return {
      totalSeatLimit: summary.totalSeatLimit,
      totalActiveEmployees: summary.totalActiveEmployees,
      seatUtilisationPct: utilPct,
      tenantsWithUsageData: summary.tenantsWithUsageData,
    };
  }

  private toSummaryDto(t: TenantWithRelations): TenantSummaryDto {
    const subscription = t.subscriptions?.[0];
    const usage = t.usageSnapshots?.[0];
    return {
      id: t.id,
      displayName: t.displayName,
      slug: t.slug,
      countryCode: t.countryCode,
      planId: t.planId ?? null,
      planKey: t.planKey ?? t.plan?.code ?? null,
      planName: t.plan?.name ?? null,
      regionName: t.region?.name ?? null,
      status: t.status as unknown as PlatformTenantStatus,
      seatLimit: t.seatLimit,
      activeEmployees: usage?.activeEmployees ?? null,
      trialEndsAt: subscription?.trialEndsAt?.toISOString() ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
      subscriptionStatus: subscription?.status ?? null,
      createdAt: t.createdAt.toISOString(),
    };
  }

  private toResponseDto(
    tenant: TenantWithRelations,
    primaryAdminInvitation?: PrimaryAdminInvitationDto,
    administrators?: PrimaryAdminInvitationDto[],
    storageLimitGb?: number | null,
  ): TenantResponseDto {
    const subscription = tenant.subscriptions?.[0];
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
      deploymentRegionCode: tenant.region?.code,
      deploymentRegionName: tenant.region?.name,
      planId: tenant.planId ?? null,
      planKey: tenant.planKey ?? tenant.plan?.code ?? null,
      planName: tenant.plan?.name ?? null,
      seatLimit: tenant.seatLimit,
      storageLimitGb: storageLimitGb ?? null,
      status: tenant.status as unknown as PlatformTenantStatus,
      activatedAt: tenant.activatedAt?.toISOString(),
      suspendedAt: tenant.suspendedAt?.toISOString(),
      suspendedReason: tenant.suspendedReason ?? undefined,
      createdAt: tenant.createdAt.toISOString(),
      createdBy: tenant.createdBy ?? undefined,
      updatedAt: tenant.updatedAt.toISOString(),
      rowVersion: tenant.rowVersion.toString(),
      trialEndsAt: subscription?.trialEndsAt?.toISOString() ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
      subscriptionStatus: subscription?.status ?? null,
      billingCycle: subscription?.billingCycle ?? null,
      lastActivityAt: tenant.updatedAt.toISOString(),
      ...(primaryAdminInvitation ? { primaryAdminInvitation } : {}),
      ...(administrators ? { administrators } : {}),
    };
  }
}
