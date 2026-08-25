import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditActorType, AuditEventSeverity } from '../../../common/enums/platform.enum';
import { TenantAdminRepository } from '../repositories/tenant-admin.repository';
import type {
  CreateUpgradeRequestDto,
  TenantBrandingResponseDto,
  TenantProfileResponseDto,
  TenantRegionalResponseDto,
  TenantSecurityPolicyResponseDto,
  UpdateTenantBrandingDto,
  UpdateTenantProfileDto,
  UpdateTenantRegionalDto,
  UpdateTenantSecurityPolicyDto,
} from '../dto/tenant-admin.dto';

const HEX_CONTRAST_WARNING =
  'Selected colours may not meet WCAG contrast guidance; review before publishing.';

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function parseBoolArray(value: unknown): boolean[] | null {
  if (!Array.isArray(value)) return null;
  return value.map((v) => Boolean(v));
}

function relativeLuminance(hex: string): number {
  const raw = hex.replace('#', '');
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const toLin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const R = toLin(r);
  const G = toLin(g);
  const B = toLin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(a: string, b: string): number {
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

@Injectable()
export class TenantAdminService {
  private readonly uploadDir: string;
  private readonly maxFileSize: number;
  private readonly allowedMimes: string[];

  constructor(
    private readonly repo: TenantAdminRepository,
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.uploadDir = config.get<string>('UPLOAD_STORAGE_PATH') ?? join(process.cwd(), 'storage', 'uploads');
    this.maxFileSize = config.get<number>('upload.maxFileSizeBytes') ?? 10_485_760;
    this.allowedMimes = (
      config.get<string[]>('upload.allowedMimeTypes') ?? ['image/jpeg', 'image/png', 'image/webp']
    ).filter((m) => m.startsWith('image/'));
  }

  async getProfile(tenantId: string): Promise<TenantProfileResponseDto> {
    const tenant = await this.repo.findTenant(tenantId);
    if (!tenant) {
      throw new AppException({
        code: ERROR_CODES.TENANT_NOT_FOUND,
        message: 'Tenant not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    const settings = tenant.settings;
    return {
      id: tenant.id,
      slug: tenant.slug,
      displayName: tenant.displayName,
      legalName: tenant.legalName,
      countryCode: tenant.countryCode,
      baseCurrency: tenant.baseCurrency,
      defaultTimezone: tenant.defaultTimezone,
      defaultLocale: tenant.defaultLocale,
      registrationNumber: settings?.registrationNumber ?? null,
      industry: settings?.industry ?? null,
      employeeSizeBand: settings?.employeeSizeBand ?? null,
      addressLine1: settings?.addressLine1 ?? null,
      addressLine2: settings?.addressLine2 ?? null,
      city: settings?.city ?? null,
      stateProvince: settings?.stateProvince ?? null,
      postalCode: settings?.postalCode ?? null,
      contactEmail: settings?.contactEmail ?? null,
      contactPhone: settings?.contactPhone ?? null,
      financialYearStart: settings?.financialYearStart ?? null,
      payrollMonthConfig: settings?.payrollMonthConfig ?? null,
      logoUrl: tenant.branding?.logoUrl ?? null,
    };
  }

  async updateProfile(
    tenantId: string,
    dto: UpdateTenantProfileDto,
    actor: { userId: string; email: string },
    correlationId: string,
  ): Promise<TenantProfileResponseDto> {
    await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
          ...(dto.legalName !== undefined ? { legalName: dto.legalName } : {}),
          ...(dto.countryCode !== undefined ? { countryCode: dto.countryCode } : {}),
          ...(dto.baseCurrency !== undefined ? { baseCurrency: dto.baseCurrency } : {}),
          ...(dto.defaultTimezone !== undefined ? { defaultTimezone: dto.defaultTimezone } : {}),
          updatedBy: actor.userId,
          rowVersion: { increment: 1 },
        },
      });

      await this.repo.upsertSettings(
        tenantId,
        {
          tenantId,
          registrationNumber: dto.registrationNumber,
          industry: dto.industry,
          employeeSizeBand: dto.employeeSizeBand,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
          city: dto.city,
          stateProvince: dto.stateProvince,
          postalCode: dto.postalCode,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          financialYearStart: dto.financialYearStart,
          payrollMonthConfig: dto.payrollMonthConfig,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        tx,
      );

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: actor.userId,
          actorType: AuditActorType.USER,
          actorEmail: actor.email,
          module: 'tenant',
          action: 'tenant.profile.updated',
          resourceType: 'tenant',
          resourceId: tenantId,
          after: { ...dto },
          correlationId,
          severity: AuditEventSeverity.INFO,
        },
      });
    });

    return this.getProfile(tenantId);
  }

  async getBranding(tenantId: string): Promise<TenantBrandingResponseDto> {
    const branding = await this.repo.findBranding(tenantId);
    return this.toBrandingDto(tenantId, branding);
  }

  async upsertBranding(
    tenantId: string,
    dto: UpdateTenantBrandingDto,
    actor: { userId: string; email: string },
    correlationId: string,
  ): Promise<TenantBrandingResponseDto> {
    const row = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const updated = await this.repo.upsertBranding(
        tenantId,
        {
          logoUrl: dto.logoUrl === undefined ? undefined : dto.logoUrl,
          loginLogoUrl: dto.loginLogoUrl === undefined ? undefined : dto.loginLogoUrl,
          faviconUrl: dto.faviconUrl === undefined ? undefined : dto.faviconUrl,
          primaryColor: dto.primaryColor === undefined ? undefined : dto.primaryColor,
          secondaryColor: dto.secondaryColor === undefined ? undefined : dto.secondaryColor,
          applicationName: dto.applicationName === undefined ? undefined : dto.applicationName,
          emailSenderName: dto.emailSenderName === undefined ? undefined : dto.emailSenderName,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        tx,
      );

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: actor.userId,
          actorType: AuditActorType.USER,
          actorEmail: actor.email,
          module: 'tenant',
          action: 'tenant.branding.updated',
          resourceType: 'tenant_branding',
          resourceId: updated.id,
          after: { ...dto },
          correlationId,
          severity: AuditEventSeverity.INFO,
        },
      });

      return updated;
    });

    return this.toBrandingDto(tenantId, row);
  }

  async uploadLogo(
    tenantId: string,
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    kind: 'logo' | 'loginLogo' | 'favicon',
    actor: { userId: string; email: string },
    correlationId: string,
  ): Promise<TenantBrandingResponseDto> {
    if (!file) {
      throw new AppException({
        code: ERROR_CODES.INVALID_UPLOAD,
        message: 'A logo file is required.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    if (!this.allowedMimes.includes(file.mimetype)) {
      throw new AppException({
        code: ERROR_CODES.INVALID_UPLOAD,
        message: 'Unsupported image type. Use JPEG, PNG, or WebP.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    if (file.size > this.maxFileSize) {
      throw new AppException({
        code: ERROR_CODES.INVALID_UPLOAD,
        message: 'Image exceeds the maximum allowed size.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const dir = join(this.uploadDir, 'tenant-branding', tenantId);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const ext = extname(file.originalname) || '.png';
    const filename = `${kind}-${randomUUID()}${ext}`;
    const absPath = join(dir, filename);
    await pipeline(Readable.from(file.buffer), createWriteStream(absPath));
    const publicUrl = `/uploads/tenant-branding/${tenantId}/${filename}`;

    const patch: UpdateTenantBrandingDto =
      kind === 'loginLogo'
        ? { loginLogoUrl: publicUrl }
        : kind === 'favicon'
          ? { faviconUrl: publicUrl }
          : { logoUrl: publicUrl };

    return this.upsertBranding(tenantId, patch, actor, correlationId);
  }

  async getRegional(tenantId: string): Promise<TenantRegionalResponseDto> {
    const tenant = await this.repo.findTenant(tenantId);
    if (!tenant) {
      throw new AppException({
        code: ERROR_CODES.TENANT_NOT_FOUND,
        message: 'Tenant not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    const settings = tenant.settings;
    return {
      defaultLocale: tenant.defaultLocale,
      enabledLocales: parseStringArray(settings?.enabledLocales) || [tenant.defaultLocale],
      dateFormat: settings?.dateFormat ?? null,
      numberFormat: settings?.numberFormat ?? null,
      currencyDisplay: settings?.currencyDisplay ?? null,
      defaultTimezone: tenant.defaultTimezone,
      weekStart: settings?.weekStart ?? null,
      workingWeekPattern: parseBoolArray(settings?.workingWeekPattern),
    };
  }

  async updateRegional(
    tenantId: string,
    dto: UpdateTenantRegionalDto,
    actor: { userId: string; email: string },
    correlationId: string,
  ): Promise<TenantRegionalResponseDto> {
    await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      if (dto.defaultLocale !== undefined || dto.defaultTimezone !== undefined) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: {
            ...(dto.defaultLocale !== undefined ? { defaultLocale: dto.defaultLocale } : {}),
            ...(dto.defaultTimezone !== undefined ? { defaultTimezone: dto.defaultTimezone } : {}),
            updatedBy: actor.userId,
            rowVersion: { increment: 1 },
          },
        });
      }

      await this.repo.upsertSettings(
        tenantId,
        {
          tenantId,
          dateFormat: dto.dateFormat,
          numberFormat: dto.numberFormat,
          currencyDisplay: dto.currencyDisplay,
          weekStart: dto.weekStart,
          workingWeekPattern: dto.workingWeekPattern ?? undefined,
          enabledLocales: dto.enabledLocales ?? undefined,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        tx,
      );

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: actor.userId,
          actorType: AuditActorType.USER,
          actorEmail: actor.email,
          module: 'tenant',
          action: 'tenant.regional.updated',
          resourceType: 'tenant_settings',
          resourceId: tenantId,
          after: { ...dto },
          correlationId,
          severity: AuditEventSeverity.INFO,
        },
      });
    });

    return this.getRegional(tenantId);
  }

  async getModules(tenantId: string) {
    const [entitlements, flags, plans] = await Promise.all([
      this.repo.findEntitlements(tenantId),
      this.repo.findFeatureFlags(tenantId),
      this.repo.listPlans(),
    ]);
    const tenant = await this.repo.findTenant(tenantId);
    const enabledKeys = new Set(
      entitlements
        .map((e) => e.entitlement?.code ?? e.entitlementKey)
        .filter((k): k is string => Boolean(k)),
    );
    for (const flag of flags) {
      if (flag.enabled || flag.isEnabled) enabledKeys.add(flag.flagKey || flag.flagKeyLegacy || '');
    }

    const catalogue = [
      { key: 'organisation', label: 'Organisation', description: 'Legal entities, branches, departments', available: true },
      { key: 'employees', label: 'People', description: 'Employee core HR', available: true },
      { key: 'documents', label: 'Documents & Onboarding', description: 'Templates and onboarding journeys', available: true },
      { key: 'attendance', label: 'Attendance', description: 'Time capture and policies', available: true },
      { key: 'shifts', label: 'Shifts & Rosters', description: 'Shift templates and roster publishing', available: true },
      { key: 'leave', label: 'Leave', description: 'Leave policies and requests', available: false },
      { key: 'payroll', label: 'Payroll', description: 'Payroll runs and payslips', available: false },
      { key: 'approvals', label: 'Approvals', description: 'Workflow engine', available: false },
      { key: 'reports', label: 'Reports', description: 'Dashboards and exports', available: false },
      { key: 'integrations', label: 'Integrations', description: 'Connectors and API credentials', available: false },
      { key: 'notifications', label: 'Notifications', description: 'Templates and channels', available: false },
    ];

    return {
      planCode: tenant?.plan?.code ?? tenant?.planKey ?? null,
      planName: tenant?.plan?.name ?? null,
      modules: catalogue.map((m) => {
        const entitled =
          m.available &&
          (enabledKeys.size === 0 ||
            enabledKeys.has(m.key) ||
            enabledKeys.has(`module_${m.key}`) ||
            enabledKeys.has(`feature_${m.key}`));
        const status = !m.available
          ? 'unavailable'
          : entitled
            ? 'active'
            : 'inactive';
        return {
          ...m,
          status,
          planRequirement: m.available ? 'included' : 'upgrade_required',
          dependencies: [] as string[],
          configurePath: m.available ? this.configurePathFor(m.key) : null,
        };
      }),
      availablePlans: plans,
    };
  }

  async getSetupStatus(tenantId: string) {
    const [tenant, counts, branding, settings] = await Promise.all([
      this.repo.findTenant(tenantId),
      this.repo.countSetupSignals(tenantId),
      this.repo.findBranding(tenantId),
      this.repo.findSettings(tenantId),
    ]);
    if (!tenant) {
      throw new AppException({
        code: ERROR_CODES.TENANT_NOT_FOUND,
        message: 'Tenant not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const profileComplete = Boolean(
      tenant.displayName &&
        tenant.legalName &&
        tenant.countryCode &&
        (settings?.contactEmail || settings?.registrationNumber),
    );
    const brandingComplete = Boolean(branding?.logoUrl || branding?.primaryColor);
    const orgComplete = counts.legalEntities > 0 && (counts.branches > 0 || counts.departments > 0);
    const locationsComplete = counts.branches > 0;
    const adminsComplete = counts.admins > 0;
    const attendanceComplete = counts.attendancePolicies > 0;
    const employeesComplete = counts.employees > 0;

    const steps = [
      {
        key: 'company_profile',
        required: true,
        status: profileComplete ? 'complete' : 'incomplete',
        href: '/settings/company',
        blockedReason: null as string | null,
      },
      {
        key: 'branding',
        required: false,
        status: brandingComplete ? 'complete' : 'incomplete',
        href: '/settings/branding',
        blockedReason: null,
      },
      {
        key: 'organisation',
        required: true,
        status: orgComplete ? 'complete' : 'incomplete',
        href: '/organisation',
        blockedReason: null,
      },
      {
        key: 'locations',
        required: true,
        status: locationsComplete ? 'complete' : 'incomplete',
        href: '/organisation/branches',
        blockedReason: null,
      },
      {
        key: 'roles_administrators',
        required: true,
        status: adminsComplete ? 'complete' : 'incomplete',
        href: '/settings/users',
        blockedReason: null,
      },
      {
        key: 'attendance_policy',
        required: true,
        status: attendanceComplete ? 'complete' : 'incomplete',
        href: '/attendance/policies',
        blockedReason: null,
      },
      {
        key: 'leave_policy',
        required: false,
        status: 'unavailable',
        href: null,
        blockedReason: 'Leave module is not yet available for this tenant.',
      },
      {
        key: 'payroll_settings',
        required: false,
        status: 'unavailable',
        href: null,
        blockedReason: 'Payroll module is not yet available for this tenant.',
      },
      {
        key: 'employee_import',
        required: false,
        status: employeesComplete ? 'complete' : 'incomplete',
        href: '/employees',
        blockedReason: null,
      },
      {
        key: 'notifications',
        required: false,
        status: 'unavailable',
        href: null,
        blockedReason: 'Notification templates are not yet available.',
      },
      {
        key: 'integration_setup',
        required: false,
        status: 'unavailable',
        href: null,
        blockedReason: 'Integrations are not yet available.',
      },
      {
        key: 'validation',
        required: true,
        status: profileComplete && orgComplete && adminsComplete ? 'complete' : 'incomplete',
        href: '/settings',
        blockedReason: null,
      },
      {
        key: 'go_live_readiness',
        required: true,
        status:
          profileComplete && orgComplete && adminsComplete && attendanceComplete
            ? 'complete'
            : 'incomplete',
        href: '/dashboard',
        blockedReason: null,
      },
    ] as const;

    const actionable = steps.filter((s) => s.status !== 'unavailable');
    const completed = actionable.filter((s) => s.status === 'complete').length;
    const percentComplete =
      actionable.length === 0 ? 0 : Math.round((completed / actionable.length) * 100);
    const requiredIncomplete = steps.filter((s) => s.required && s.status !== 'complete');
    const goLiveReady = requiredIncomplete.length === 0;

    return {
      percentComplete,
      goLiveReady,
      completed,
      total: actionable.length,
      steps,
      categories: [
        { key: 'company', href: '/settings/company', complete: profileComplete },
        { key: 'organisation', href: '/organisation', complete: orgComplete },
        { key: 'users_roles', href: '/settings/users', complete: adminsComplete },
        { key: 'attendance', href: '/attendance/policies', complete: attendanceComplete },
        { key: 'regional', href: '/settings/regional', complete: Boolean(settings?.dateFormat) },
        { key: 'branding', href: '/settings/branding', complete: brandingComplete },
        { key: 'modules', href: '/settings/modules', complete: true },
        { key: 'security', href: '/settings/security', complete: Boolean(await this.repo.findSecurityPolicy(tenantId)) },
        { key: 'subscription', href: '/settings/subscription', complete: Boolean(tenant.planId || tenant.planKey) },
        { key: 'leave', href: null, complete: false, comingSoon: true },
        { key: 'payroll', href: null, complete: false, comingSoon: true },
        { key: 'workflows', href: null, complete: false, comingSoon: true },
        { key: 'notifications', href: null, complete: false, comingSoon: true },
        { key: 'integrations', href: null, complete: false, comingSoon: true },
      ],
    };
  }

  async getSubscription(tenantId: string) {
    const tenant = await this.repo.findTenant(tenantId);
    if (!tenant) {
      throw new AppException({
        code: ERROR_CODES.TENANT_NOT_FOUND,
        message: 'Tenant not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    const sub = await this.repo.findActiveSubscription(tenantId);
    const modules = await this.getModules(tenantId);
    return {
      planId: tenant.planId ?? sub?.planId ?? null,
      planCode: tenant.plan?.code ?? tenant.planKey ?? sub?.planKey ?? null,
      planName: tenant.plan?.name ?? sub?.plan?.name ?? null,
      billingCycle: sub?.billingCycle ?? null,
      seatLimit: tenant.seatLimit ?? sub?.seatLimit ?? null,
      status: tenant.status,
      subscriptionStatus: sub?.status ?? null,
      startsOn: sub?.startsOn?.toISOString().slice(0, 10) ?? null,
      endsOn: sub?.endsOn?.toISOString().slice(0, 10) ?? null,
      trialEndsAt: sub?.trialEndsAt?.toISOString() ?? null,
      enabledModules: modules.modules.filter((m) => m.status === 'active').map((m) => m.key),
      supportTier: null as string | null,
    };
  }

  async getUsage(tenantId: string) {
    const tenant = await this.repo.findTenant(tenantId);
    if (!tenant) {
      throw new AppException({
        code: ERROR_CODES.TENANT_NOT_FOUND,
        message: 'Tenant not found.',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    const snapshot = await this.repo.findLatestUsage(tenantId);
    const liveEmployees = await this.prisma.employee.count({ where: { tenantId } });
    const invitedUsers = await this.prisma.userInvitation.count({
      where: { tenantId, acceptedAt: null },
    });
    const seatLimit = tenant.seatLimit ?? null;
    const activeEmployees = snapshot?.activeEmployees ?? liveEmployees;
    const approaching =
      seatLimit != null && seatLimit > 0 ? activeEmployees / seatLimit >= 0.8 : false;
    const reached = seatLimit != null ? activeEmployees >= seatLimit : false;

    return {
      snapshotDate: snapshot?.snapshotDate?.toISOString().slice(0, 10) ?? null,
      activeEmployees,
      totalEmployees: snapshot?.totalEmployees ?? liveEmployees,
      invitedUsers,
      seatLimit,
      storageUsedBytes: snapshot ? Number(snapshot.storageUsedBytes) : 0,
      apiCallsMonth: snapshot?.apiCallsMonth ?? 0,
      warnings: {
        approachingSeatLimit: approaching && !reached,
        seatLimitReached: reached,
      },
    };
  }

  async createUpgradeRequest(
    tenantId: string,
    dto: CreateUpgradeRequestDto,
    actor: { userId: string; email: string },
    correlationId: string,
  ) {
    if (!dto.requestedPlanId && !dto.requestedPlanKey) {
      throw new AppException({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Provide requestedPlanId or requestedPlanKey.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const created = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const row = await this.repo.createUpgradeRequest(
        {
          tenantId,
          requestedPlanId: dto.requestedPlanId,
          requestedPlanKey: dto.requestedPlanKey,
          note: dto.note,
          billingContactEmail: dto.billingContactEmail,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        tx,
      );

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: actor.userId,
          actorType: AuditActorType.USER,
          actorEmail: actor.email,
          module: 'tenant',
          action: 'tenant.upgrade_request.created',
          resourceType: 'tenant_upgrade_request',
          resourceId: row.id,
          after: {
            requestedPlanId: row.requestedPlanId,
            requestedPlanKey: row.requestedPlanKey,
          },
          correlationId,
          severity: AuditEventSeverity.INFO,
        },
      });

      return row;
    });

    return {
      id: created.id,
      status: created.status,
      requestedPlanId: created.requestedPlanId,
      requestedPlanKey: created.requestedPlanKey,
      note: created.note,
      billingContactEmail: created.billingContactEmail,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async listUpgradeRequests(tenantId: string) {
    const rows = await this.repo.listUpgradeRequests(tenantId);
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      requestedPlanId: r.requestedPlanId,
      requestedPlanKey: r.requestedPlanKey,
      planName: r.plan?.name ?? null,
      note: r.note,
      billingContactEmail: r.billingContactEmail,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getSecurityPolicy(tenantId: string): Promise<TenantSecurityPolicyResponseDto> {
    let policy = await this.repo.findSecurityPolicy(tenantId);
    if (!policy) {
      policy = await this.repo.upsertSecurityPolicy(tenantId, {});
    }
    return this.toSecurityDto(policy);
  }

  async updateSecurityPolicy(
    tenantId: string,
    dto: UpdateTenantSecurityPolicyDto,
    actor: { userId: string; email: string },
    correlationId: string,
  ): Promise<TenantSecurityPolicyResponseDto> {
    const updated = await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      const row = await this.repo.upsertSecurityPolicy(
        tenantId,
        {
          ...(dto.passwordMinLength !== undefined
            ? { passwordMinLength: dto.passwordMinLength }
            : {}),
          ...(dto.passwordRequireUpper !== undefined
            ? { passwordRequireUpper: dto.passwordRequireUpper }
            : {}),
          ...(dto.passwordRequireLower !== undefined
            ? { passwordRequireLower: dto.passwordRequireLower }
            : {}),
          ...(dto.passwordRequireDigit !== undefined
            ? { passwordRequireDigit: dto.passwordRequireDigit }
            : {}),
          ...(dto.passwordRequireSymbol !== undefined
            ? { passwordRequireSymbol: dto.passwordRequireSymbol }
            : {}),
          ...(dto.mfaRequiredForAdmins !== undefined
            ? { mfaRequiredForAdmins: dto.mfaRequiredForAdmins }
            : {}),
          ...(dto.sessionTtlHours !== undefined ? { sessionTtlHours: dto.sessionTtlHours } : {}),
          ...(dto.maxLoginAttempts !== undefined ? { maxLoginAttempts: dto.maxLoginAttempts } : {}),
          ...(dto.trustedEmailDomains !== undefined
            ? { trustedEmailDomains: dto.trustedEmailDomains }
            : {}),
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        tx,
      );

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId: actor.userId,
          actorType: AuditActorType.USER,
          actorEmail: actor.email,
          module: 'tenant',
          action: 'tenant.security_policy.updated',
          resourceType: 'tenant_security_policy',
          resourceId: row.id,
          after: { ...dto },
          correlationId,
          severity: AuditEventSeverity.WARNING,
        },
      });

      return row;
    });

    return this.toSecurityDto(updated);
  }

  private toBrandingDto(
    tenantId: string,
    branding: {
      logoUrl: string | null;
      loginLogoUrl?: string | null;
      faviconUrl: string | null;
      primaryColor: string | null;
      secondaryColor?: string | null;
      applicationName?: string | null;
      emailSenderName?: string | null;
    } | null,
  ): TenantBrandingResponseDto {
    const warnings: string[] = [];
    const primary = branding?.primaryColor;
    if (primary && contrastRatio(primary, '#FFFFFF') < 4.5) {
      warnings.push(HEX_CONTRAST_WARNING);
    }
    return {
      tenantId,
      logoUrl: branding?.logoUrl ?? null,
      loginLogoUrl: branding?.loginLogoUrl ?? null,
      faviconUrl: branding?.faviconUrl ?? null,
      primaryColor: branding?.primaryColor ?? null,
      secondaryColor: branding?.secondaryColor ?? null,
      applicationName: branding?.applicationName ?? null,
      emailSenderName: branding?.emailSenderName ?? null,
      contrastWarnings: warnings,
    };
  }

  private toSecurityDto(policy: {
    passwordMinLength: number;
    passwordRequireUpper: boolean;
    passwordRequireLower: boolean;
    passwordRequireDigit: boolean;
    passwordRequireSymbol: boolean;
    mfaRequiredForAdmins: boolean;
    sessionTtlHours: number;
    maxLoginAttempts: number;
    trustedEmailDomains: unknown;
  }): TenantSecurityPolicyResponseDto {
    return {
      passwordMinLength: policy.passwordMinLength,
      passwordRequireUpper: policy.passwordRequireUpper,
      passwordRequireLower: policy.passwordRequireLower,
      passwordRequireDigit: policy.passwordRequireDigit,
      passwordRequireSymbol: policy.passwordRequireSymbol,
      mfaRequiredForAdmins: policy.mfaRequiredForAdmins,
      sessionTtlHours: policy.sessionTtlHours,
      maxLoginAttempts: policy.maxLoginAttempts,
      trustedEmailDomains: parseStringArray(policy.trustedEmailDomains),
    };
  }

  private configurePathFor(key: string): string | null {
    switch (key) {
      case 'organisation':
        return '/organisation';
      case 'employees':
        return '/employees';
      case 'documents':
        return '/documents';
      case 'attendance':
        return '/attendance';
      case 'shifts':
        return '/shifts';
      default:
        return null;
    }
  }
}
