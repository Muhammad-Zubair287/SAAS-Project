export enum TenantStatus {
  DRAFT = 'DRAFT',
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  GRACE = 'GRACE',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
  // TODO(compatibility): ARCHIVED exists only for backward compatibility with existing data
  // and must be removed once ALL of the following are complete:
  //   - all services migrated away from ARCHIVED references
  //   - frontend updated to use CLOSED instead
  //   - database migration run to rewrite ARCHIVED rows to CLOSED
  //   - all dependent modules (M02–M17) verified not to produce ARCHIVED
  //   - dedicated cleanup batch executed and tests passing
  // Do NOT use ARCHIVED for any new functionality.
  ARCHIVED = 'ARCHIVED',
}

export enum SubscriptionStatus {
  // Spec-aligned values (ERD Data Dictionary July 2026)
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  GRACE = 'GRACE',
  SUSPENDED = 'SUSPENDED',
  ENDED = 'ENDED',
  // TODO(compatibility): TRIALING is not in spec (spec uses TRIAL).
  // Retained until tenant.service.ts and all consumers migrated to TRIAL.
  // Cleanup: update all writes to TRIAL, migrate existing rows, remove value.
  TRIALING = 'TRIALING',
  // TODO(compatibility): PAST_DUE → GRACE; CANCELLED/EXPIRED → ENDED per spec.
  // Retained for backward compatibility with existing data.
  // Cleanup: migrate rows to spec values, remove after all consumers updated.
  PAST_DUE = 'PAST_DUE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum SupportGrantStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  REJECTED = 'REJECTED',
}

export enum PlatformRole {
  SUPER_ADMIN = 'PLATFORM_SUPER_ADMIN',
  SUPPORT_ENGINEER = 'PLATFORM_SUPPORT_ENGINEER',
  AUDITOR = 'PLATFORM_AUDITOR',
  OPERATIONS = 'PLATFORM_OPERATIONS',
}

export enum AuditEventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum AuditActorType {
  USER = 'user',
  SYSTEM = 'system',
  SUPPORT = 'support',
}
