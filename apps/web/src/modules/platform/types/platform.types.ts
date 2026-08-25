// TODO(compat): ARCHIVED retained for existing data; remove after DB migration rewrites rows to CLOSED.
export type TenantStatus =
  | 'DRAFT'
  | 'TRIAL'
  | 'ACTIVE'
  | 'GRACE'
  | 'SUSPENDED'
  | 'CLOSED'
  | 'ARCHIVED';

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

export interface PrimaryAdminInvitation {
  email: string;
  status: string;
  expiresAt: string;
}

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
  deploymentRegionCode?: string;
  deploymentRegionName?: string;
  planId: string | null;
  planKey?: string | null;
  planName?: string | null;
  seatLimit: number | null;
  storageLimitGb?: number | null;
  status: TenantStatus;
  activatedAt?: string;
  suspendedAt?: string;
  suspendedReason?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  rowVersion: string;
  primaryAdminInvitation?: PrimaryAdminInvitation;
  administrators?: PrimaryAdminInvitation[];
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  subscriptionStatus?: string | null;
  billingCycle?: string | null;
  lastActivityAt?: string | null;
}

export interface TenantSummary {
  id: string;
  displayName: string;
  slug: string;
  countryCode: string;
  planId: string | null;
  planKey?: string | null;
  planName?: string | null;
  regionName?: string | null;
  status: TenantStatus;
  seatLimit: number | null;
  activeEmployees?: number | null;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  subscriptionStatus?: string | null;
  createdAt: string;
}

export interface TenantUsage {
  tenantId: string;
  activeEmployees: number;
  totalEmployees: number;
  seatLimit: number;
  seatUtilisationPct: number;
  storageUsedBytes: string;
  storageLimitGb?: number | null;
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
  trial: number;
  draft: number;
  suspended: number;
  closed: number;
  grace: number;
  trialsEndingSoon: number;
  activeSupportGrants: number;
}

export interface PlatformUsageSummary {
  totalSeatLimit: number;
  totalActiveEmployees: number;
  seatUtilisationPct: number;
  tenantsWithUsageData: number;
}

export interface PlanEntitlement {
  code: string;
  label: string;
  dataType: string;
  defaultValue: unknown;
  unit?: string;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  description?: string;
  billingModel: string;
  status: string;
  entitlements?: PlanEntitlement[];
}

export interface DeploymentRegion {
  id: string;
  code: string;
  name: string;
  cloudProvider: string;
  cloudRegion: string;
  countryCode: string;
  status: string;
}

export interface AuditEvent {
  id: string;
  tenantId?: string;
  tenantDisplayName?: string;
  actorId: string;
  actorType: string;
  actorEmail?: string;
  module: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  correlationId: string;
  severity: string;
  occurredAt: string;
}

export interface CreateTenantPayload {
  displayName: string;
  legalName: string;
  countryCode: string;
  baseCurrency: string;
  defaultTimezone: string;
  defaultLocale: string;
  deploymentRegionId: string;
  planId: string;
  seatLimit: number;
  storageLimitGb?: number;
  billingCycle: 'monthly' | 'annual';
  trialEndsAt?: string;
  primaryAdmin: {
    name: string;
    email: string;
  };
  sendInvitation?: boolean;
}

export interface SuspendTenantPayload {
  reason: string;
  userMessage?: string;
  mfaCode?: string;
}

export interface RestoreTenantPayload {
  reason: string;
  mfaCode?: string;
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
  supportUserId?: string;
  reason: string;
  scope: string[];
  startsAt: string;
  endsAt: string;
  mfaCode?: string;
}

export interface RevokeSupportGrantPayload {
  reason: string;
  mfaCode?: string;
}

export interface ListAuditEventsParams {
  page?: number;
  pageSize?: number;
  tenantId?: string;
  actorId?: string;
  module?: string;
  action?: string;
  resourceType?: string;
  fromDate?: string;
  toDate?: string;
  severity?: string;
}

export interface PlatformNotification {
  id: string;
  title: string;
  body?: string;
  category?: string;
  linkPath?: string;
  severity?: string;
  readAt?: string;
  createdAt: string;
  /** Derived client-side convenience */
  isRead?: boolean;
}

export interface IntegrationHealthCard {
  id: string;
  code?: string;
  name: string;
  category?: string;
  type?: string;
  provider?: string;
  status: string;
  enabled?: boolean;
  lastSyncAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  errorCount24h?: number;
  itemsProcessed?: number;
  successRatePct?: number;
}

export interface IntegrationIncident {
  id: string;
  name: string;
  category?: string;
  status: string;
  lastFailureAt?: string;
  errorCount24h?: number;
  integrationId?: string;
  integrationName?: string;
  severity?: string;
  title?: string;
  startedAt?: string;
}

export interface PlatformConfigDomain {
  domain: string;
  value: Record<string, unknown>;
  rowVersion?: string;
  values?: Record<string, unknown>;
  updatedAt?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  targetAudience: string;
  publishedAt?: string;
  createdAt: string;
  createdBy?: string;
}

export interface CreateAnnouncementPayload {
  title: string;
  body?: string;
  linkPath?: string;
  targetAudience?: string;
}

export interface SearchResponse {
  tenants?: Array<{ id: string; displayName: string; slug: string; status: string; countryCode?: string }>;
  users?: Array<{ id: string; displayName?: string; name?: string; email: string; platformRole?: string }>;
  auditEvents?: Array<{
    id: string;
    action: string;
    module: string;
    severity: string;
    occurredAt: string;
    tenantId?: string;
  }>;
}

export interface CloseTenantPayload {
  reason: string;
  mfaCode?: string;
}

export interface ApproveSupportGrantPayload {
  note?: string;
}

export interface RejectSupportGrantPayload {
  reason: string;
}

export interface UserPreferences {
  locale?: string;
  notificationEmail?: boolean;
  notificationInApp?: boolean;
  notificationSecurity?: boolean;
}

export interface AuditEventDetail extends AuditEvent {
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  ipAddress?: string;
  userAgent?: string;
  relatedEvents?: Array<{ id: string; action: string; module: string; occurredAt: string; severity: string }>;
}

export interface AuditSummary {
  totalEvents: number;
  bySeverity: Array<{ severity: string; count: number }>;
  byModule: Array<{ module: string; count: number }>;
  recent: Array<{
    id: string;
    action: string;
    module: string;
    severity: string;
    actorEmail?: string;
    occurredAt: string;
    tenantId?: string;
  }>;
}

export interface AuditExportJob {
  id: string;
  status: string;
  rowCount?: number;
  downloadPath?: string;
  createdAt: string;
  completedAt?: string;
}

export interface UsageDashboard {
  kpis: {
    totalSeats: number;
    totalActiveEmployees: number;
    seatUtilisationPct: number;
    storageUsedGb: number;
    apiCallsMonth: number;
    estimatedMrr: number;
    tenantsWithData: number;
    moduleAdoption: Record<string, number>;
  };
  series: Array<{ date: string; seats: number; api: number; mrr: number; tenants: number }>;
  topTenants: Array<{
    tenantId: string;
    displayName: string;
    status: string;
    seatsUsed: number;
    seatLimit: number | null;
    storageUsedBytes: number;
    apiCallsMonth: number;
    estimatedMrr: number;
  }>;
}

export interface CreatePlanPayload {
  code: string;
  name: string;
  description?: string;
  billingModel?: string;
  status?: string;
}

export interface UpdatePlanPayload {
  name?: string;
  description?: string;
  billingModel?: string;
  status?: string;
}

export interface EntitlementCatalogueItem {
  id: string;
  code: string;
  label: string;
  dataType: string;
  defaultValue: unknown;
  unit?: string;
  status: string;
}

export interface CreateRegionPayload {
  code: string;
  name: string;
  cloudProvider: string;
  cloudRegion: string;
  countryCode: string;
  status?: string;
}
