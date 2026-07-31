// TODO(compat): ARCHIVED retained for existing data; remove after DB migration rewrites rows to CLOSED.
export type TenantStatus =
  | 'DRAFT'
  | 'TRIAL'
  | 'ACTIVE'
  | 'GRACE'
  | 'SUSPENDED'
  | 'CLOSED'
  | 'ARCHIVED';

// TODO(compat): TRIALING/PAST_DUE/CANCELLED/EXPIRED retained for existing data;
// remove after all rows migrated to TRIAL/GRACE/ENDED per spec.
export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'GRACE'
  | 'SUSPENDED'
  | 'ENDED'
  | 'TRIALING'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED';

export type SupportGrantStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'REJECTED';

export interface Tenant {
  id: string;
  displayName: string;
  legalName: string;
  slug: string;
  countryCode: string;
  baseCurrency: string;
  defaultTimezone: string;
  defaultLocale: string;
  deploymentRegionId: string;
  planId: string | null;
  seatLimit: number | null;
  status: TenantStatus;
  activatedAt?: string;
  suspendedAt?: string;
  suspendedReason?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  rowVersion: string;
}

export interface TenantSummary {
  id: string;
  displayName: string;
  countryCode: string;
  planId: string | null;
  status: TenantStatus;
  seatLimit: number | null;
  createdAt: string;
}

export interface TenantUsage {
  tenantId: string;
  activeEmployees: number;
  totalEmployees: number;
  seatLimit: number;
  seatUtilisationPct: number;
  storageUsedBytes: string;
  apiCallsMonth: number;
  snapshotDate?: string;
}

export interface SupportGrant {
  id: string;
  tenantId: string;
  supportUserId: string;
  requestedByUserId: string;
  approvedByUserId?: string;
  scope: string[];
  reason: string;
  startsAt: string;
  endsAt: string;
  revokedAt?: string;
  status: SupportGrantStatus;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
  rowVersion: string;
}

export interface PlatformStats {
  total: number;
  active: number;
  draft: number;
  suspended: number;
  closed: number;
}

export interface Plan {
  code: string;
  name: string;
  description?: string;
  status: string;
  sortOrder: number;
}

export interface CreateTenantPayload {
  displayName: string;
  legalName: string;
  countryCode: string;
  baseCurrency: string;
  defaultTimezone: string;
  defaultLocale: string;
  // TODO: must be a real UUID from the deployment regions API (not a region key string).
  // Populate this dropdown from a regions listing endpoint once available.
  deploymentRegionId: string;
  // TODO: must be a real UUID from the plans API (not a plan code string).
  // Populate this dropdown from a plans listing endpoint once available (M16).
  planId: string;
  seatLimit: number;
  billingCycle: 'monthly' | 'annual';
  trialEndsAt?: string;
  primaryAdmin: {
    name: string;
    email: string;
  };
}

export interface SuspendTenantPayload {
  reason: string;
  userMessage?: string;
}

export interface RestoreTenantPayload {
  reason: string;
}

export interface ChangePlanPayload {
  planKey: string;
  seatLimit?: number;
  billingCycle?: 'monthly' | 'annual';
  reason: string;
}

export interface UpdateEntitlementsPayload {
  entitlements: Array<{ key: string; value: string }>;
}

export interface CreateSupportGrantPayload {
  supportUserId: string;
  reason: string;
  scope: string[];
  startsAt: string;
  endsAt: string;
}

export interface RevokeSupportGrantPayload {
  reason: string;
}
