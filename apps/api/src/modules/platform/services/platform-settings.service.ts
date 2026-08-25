import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AuditEventSeverity } from '../../../common/enums/platform.enum';
import { PlatformAuditService } from './platform-audit.service';
import type { PlatformActorContext } from '../../../common/interfaces/platform-actor.interface';

export type SettingDomain =
  | 'general'
  | 'security'
  | 'retention'
  | 'notifications'
  | 'integrations'
  | 'audit';

const DEFAULTS: Record<SettingDomain, Record<string, unknown>> = {
  general: {
    platformName: 'Workforce Cloud OS',
    contactEmail: 'support@workforcecloudos.com',
    defaultTimezone: 'Asia/Karachi',
    defaultCurrency: 'PKR',
    defaultLanguage: 'en',
    supportUrl: 'https://support.workforcecloudos.com',
    helpCenterUrl: 'https://help.workforcecloudos.com',
    docsUrl: 'https://docs.workforcecloudos.com',
    statusPageUrl: 'https://status.workforcecloudos.com',
  },
  security: {
    passwordMinLength: 10,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecial: true,
    passwordExpiryDays: 90,
    passwordHistory: 5,
    failedAttemptsBeforeLockout: 5,
    lockoutDurationMinutes: 30,
    sessionTimeoutMinutes: 480,
    concurrentSessionsAllowed: true,
    maxConcurrentSessions: 5,
    requireSessionTermination: true,
    requireMfaPlatformAdmin: true,
    requireMfaTenantAdmins: false,
    requireMfaPayrollApproval: true,
    requireMfaDataExport: true,
    allowedMfaMethods: ['TOTP', 'WebAuthn'],
    mfaRecoveryPeriodDays: 7,
    allowedAuthMethods: ['Password', 'SSO'],
    defaultSsoProvider: 'None',
    trustedDomains: '',
    enableIpWhitelist: false,
    ipWhitelist: '',
    enableSupportAccessApproval: true,
    supportAccessDurationLimitDays: 7,
    requireSupportAccessReason: true,
    enableAdminSessionRecording: true,
    enableSensitiveDataMasking: true,
    defaultDataClassification: 'INTERNAL',
    requireMfaSensitiveExport: true,
    exportExpiryDays: 7,
    maximumExportSizeMb: 100,
    requireExportReason: true,
    enableExportAudit: true,
    allowedExportFormats: ['CSV', 'Excel', 'PDF', 'JSON'],
  },
  retention: {
    employeeCoreMonths: 84,
    payrollMonths: 84,
    attendanceMonths: 36,
    auditMonths: 24,
    identitySessionDays: 90,
    integrationPayloadDays: 30,
    exportFileDays: 7,
    outboxJobDays: 90,
    autoCleanup: true,
    cleanupScheduleCron: '0 3 * * *',
    enableLegalHold: true,
    legalHoldDurationDays: 0,
  },
  notifications: {
    emailProvider: 'SMTP',
    fromEmail: 'noreply@workforcecloudos.com',
    fromName: 'Workforce Cloud OS',
    enableTls: true,
    maxRetryAttempts: 3,
  },
  integrations: {
    defaultSyncCron: '*/15 * * * *',
    duplicateWindowSeconds: 30,
    enableSignatureVerification: true,
  },
  audit: {
    retentionMonths: 24,
    enableSecurityAlerts: true,
  },
};

const SECRET_KEYS = new Set([
  'smtpPassword',
  'authToken',
  'apiKey',
  'smsAuthToken',
  'pushApiKey',
]);

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: PlatformAuditService,
  ) {}

  async getDomain(domain: SettingDomain): Promise<{
    domain: string;
    value: Record<string, unknown>;
    rowVersion: string;
  }> {
    const row = await this.prisma.platformSetting.findUnique({ where: { domain } });
    if (!row) {
      return { domain, value: this.maskSecrets(DEFAULTS[domain]), rowVersion: '0' };
    }
    return {
      domain,
      value: this.maskSecrets(row.value as Record<string, unknown>),
      rowVersion: row.rowVersion.toString(),
    };
  }

  async putDomain(
    domain: SettingDomain,
    value: Record<string, unknown>,
    actor: PlatformActorContext,
    correlationId: string,
    expectedRowVersion?: string,
  ): Promise<{ domain: string; value: Record<string, unknown>; rowVersion: string }> {
    const existing = await this.prisma.platformSetting.findUnique({ where: { domain } });
    if (existing && expectedRowVersion && existing.rowVersion.toString() !== expectedRowVersion) {
      throw new AppException({
        code: ERROR_CODES.CONFLICT,
        message: 'Settings were updated by another user. Refresh and retry.',
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const merged = {
      ...(existing ? (existing.value as Record<string, unknown>) : DEFAULTS[domain]),
      ...value,
    };

    // Preserve secrets if client sent masked placeholders
    for (const key of SECRET_KEYS) {
      if (typeof merged[key] === 'string' && String(merged[key]).startsWith('••••')) {
        const prev = existing?.value as Record<string, unknown> | undefined;
        if (prev?.[key] != null) merged[key] = prev[key];
        else delete merged[key];
      }
    }

    const row = await this.prisma.withTransaction(async (tx) => {
      const saved = await tx.platformSetting.upsert({
        where: { domain },
        create: {
          domain,
          value: merged as Prisma.InputJsonValue,
          updatedBy: actor.actorId,
        },
        update: {
          value: merged as Prisma.InputJsonValue,
          updatedBy: actor.actorId,
          rowVersion: { increment: 1 },
        },
      });

      await this.audit.logWithTx(tx, actor, {
        module: 'platform',
        action: 'config.updated',
        resourceType: 'platform_setting',
        resourceId: domain,
        before: existing?.value ?? null,
        after: this.maskSecrets(merged),
        correlationId,
        severity: AuditEventSeverity.WARNING,
      });

      return saved;
    });

    return {
      domain,
      value: this.maskSecrets(row.value as Record<string, unknown>),
      rowVersion: row.rowVersion.toString(),
    };
  }

  async isSupportApprovalRequired(): Promise<boolean> {
    const security = await this.getDomain('security');
    return Boolean(security.value.enableSupportAccessApproval);
  }

  private maskSecrets(value: Record<string, unknown>): Record<string, unknown> {
    const out = { ...value };
    for (const key of SECRET_KEYS) {
      if (out[key] != null && String(out[key]).length > 0) {
        out[key] = '••••••••';
      }
    }
    return out;
  }
}
