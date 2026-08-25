import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';

const BASE = '/tenant';

export interface TenantProfile {
  id: string;
  slug: string;
  displayName: string;
  legalName: string;
  countryCode: string;
  baseCurrency: string;
  defaultTimezone: string;
  defaultLocale: string;
  registrationNumber?: string | null;
  industry?: string | null;
  employeeSizeBand?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  financialYearStart?: string | null;
  payrollMonthConfig?: string | null;
  logoUrl?: string | null;
}

export interface TenantBranding {
  tenantId: string;
  logoUrl?: string | null;
  loginLogoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  applicationName?: string | null;
  emailSenderName?: string | null;
  contrastWarnings?: string[];
}

export interface TenantRegional {
  defaultLocale: string;
  enabledLocales: string[];
  dateFormat?: string | null;
  numberFormat?: string | null;
  currencyDisplay?: string | null;
  defaultTimezone: string;
  weekStart?: number | null;
  workingWeekPattern?: boolean[] | null;
}

export interface SetupStatus {
  percentComplete: number;
  goLiveReady: boolean;
  completed: number;
  total: number;
  steps: Array<{
    key: string;
    required: boolean;
    status: string;
    href: string | null;
    blockedReason: string | null;
  }>;
  categories: Array<{
    key: string;
    href: string | null;
    complete: boolean;
    comingSoon?: boolean;
  }>;
}

export interface TenantModuleCatalogue {
  planCode: string | null;
  planName: string | null;
  modules: Array<{
    key: string;
    label: string;
    description: string;
    available: boolean;
    status: string;
    planRequirement: string;
    dependencies: string[];
    configurePath: string | null;
  }>;
  availablePlans: Array<{ id: string; code: string; name: string; description: string | null }>;
}

export interface TenantSubscription {
  planId: string | null;
  planCode: string | null;
  planName: string | null;
  billingCycle: string | null;
  seatLimit: number | null;
  status: string;
  subscriptionStatus: string | null;
  startsOn: string | null;
  endsOn: string | null;
  trialEndsAt: string | null;
  enabledModules: string[];
  supportTier: string | null;
}

export interface TenantUsage {
  snapshotDate: string | null;
  activeEmployees: number;
  totalEmployees: number;
  invitedUsers: number;
  seatLimit: number | null;
  storageUsedBytes: number;
  apiCallsMonth: number;
  warnings: { approachingSeatLimit: boolean; seatLimitReached: boolean };
}

export interface UpgradeRequest {
  id: string;
  status: string;
  requestedPlanId?: string | null;
  requestedPlanKey?: string | null;
  requestedPlanName?: string | null;
  planCode?: string | null;
  planName?: string | null;
  note?: string | null;
  billingContactEmail?: string | null;
  createdAt: string;
  decidedAt?: string | null;
  decisionNote?: string | null;
}

export interface SecurityPolicy {
  passwordMinLength: number;
  passwordRequireUpper: boolean;
  passwordRequireLower: boolean;
  passwordRequireDigit: boolean;
  passwordRequireSymbol: boolean;
  mfaRequiredForAdmins: boolean;
  sessionTtlHours: number;
  maxLoginAttempts: number;
  trustedEmailDomains: string[];
}

export interface TenantUser {
  id: string;
  email: string;
  displayName: string;
  status: string;
  lastLoginAt: string | null;
  mfaStatus: string;
  requirePasswordReset: boolean;
  requireMfa: boolean;
  roles: Array<{ id: string; name: string }>;
}

export interface TenantRole {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  assignmentCount: number;
  permissions: string[];
}

export interface PermissionItem {
  id: string;
  code: string;
  action: string;
  resource: string;
  scope: string;
  description: string | null;
}

export interface TenantSession {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  userAgent: string | null;
  ipAddress: string | null;
  signedInAt: string;
  lastActivityHint: string;
  expiresAt: string;
}

export interface AuditEventRow {
  id: string;
  actorId: string;
  actorEmail: string | null;
  module: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  severity: string;
  occurredAt: string;
  correlationId: string;
}

export interface InvitationRow {
  id: string;
  email: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  roleIds: string[];
}

export const tenantAdminApi = {
  getProfile: () =>
    apiClient.get<ApiSuccessResponse<TenantProfile>>(`${BASE}/profile`).then((r) => r.data),
  updateProfile: (payload: Partial<TenantProfile>) =>
    apiClient.patch<ApiSuccessResponse<TenantProfile>>(`${BASE}/profile`, payload).then((r) => r.data),
  getBranding: () =>
    apiClient.get<ApiSuccessResponse<TenantBranding>>(`${BASE}/branding`).then((r) => r.data),
  upsertBranding: (payload: Partial<TenantBranding>) =>
    apiClient.put<ApiSuccessResponse<TenantBranding>>(`${BASE}/branding`, payload).then((r) => r.data),
  uploadLogo: (file: File, kind: 'logo' | 'loginLogo' | 'favicon') => {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient
      .post<ApiSuccessResponse<TenantBranding>>(`${BASE}/branding/logo`, formData, {
        params: { kind },
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
  getRegional: () =>
    apiClient.get<ApiSuccessResponse<TenantRegional>>(`${BASE}/regional`).then((r) => r.data),
  updateRegional: (payload: Partial<TenantRegional>) =>
    apiClient.put<ApiSuccessResponse<TenantRegional>>(`${BASE}/regional`, payload).then((r) => r.data),
  getModules: () =>
    apiClient.get<ApiSuccessResponse<TenantModuleCatalogue>>(`${BASE}/modules`).then((r) => r.data),
  getSetupStatus: () =>
    apiClient.get<ApiSuccessResponse<SetupStatus>>(`${BASE}/setup-status`).then((r) => r.data),
  getSubscription: () =>
    apiClient.get<ApiSuccessResponse<TenantSubscription>>(`${BASE}/subscription`).then((r) => r.data),
  getUsage: () =>
    apiClient.get<ApiSuccessResponse<TenantUsage>>(`${BASE}/usage`).then((r) => r.data),
  createUpgradeRequest: (payload: {
    requestedPlanId?: string;
    requestedPlanKey?: string;
    note?: string;
    billingContactEmail?: string;
  }) =>
    apiClient
      .post<ApiSuccessResponse<{ id: string }>>(`${BASE}/upgrade-requests`, payload)
      .then((r) => r.data),
  listUpgradeRequests: () =>
    apiClient.get<ApiSuccessResponse<UpgradeRequest[]>>(`${BASE}/upgrade-requests`).then((r) => r.data),
  getSecurityPolicy: () =>
    apiClient
      .get<ApiSuccessResponse<SecurityPolicy>>(`${BASE}/security-policy`)
      .then((r) => r.data),
  updateSecurityPolicy: (payload: Partial<SecurityPolicy>) =>
    apiClient
      .put<ApiSuccessResponse<SecurityPolicy>>(`${BASE}/security-policy`, payload)
      .then((r) => r.data),
  listUsers: (params?: { page?: number; pageSize?: number; search?: string; status?: string }) =>
    apiClient
      .get<ApiSuccessResponse<TenantUser[]> & { meta?: { total: number; page: number; pageSize: number } }>(
        '/users',
        { params },
      )
      .then((r) => r.data),
  getUser: (userId: string) =>
    apiClient.get<ApiSuccessResponse<TenantUser>>(`/users/${userId}`).then((r) => r.data),
  deactivateUser: (userId: string) =>
    apiClient.post(`/users/${userId}/deactivate`).then((r) => r.data),
  requirePasswordReset: (userId: string) =>
    apiClient.post(`/users/${userId}/require-password-reset`).then((r) => r.data),
  requireMfa: (userId: string) =>
    apiClient.post(`/users/${userId}/require-mfa`).then((r) => r.data),
  listInvitations: () =>
    apiClient.get<ApiSuccessResponse<InvitationRow[]>>('/auth/invitations').then((r) => r.data),
  createInvitation: (payload: { email: string; displayName?: string; roleIds?: string[] }) =>
    apiClient.post('/auth/invitations', payload).then((r) => r.data),
  resendInvitation: (id: string) =>
    apiClient.post(`/auth/invitations/${id}/resend`).then((r) => r.data),
  revokeInvitation: (id: string) =>
    apiClient.delete(`/auth/invitations/${id}`).then((r) => r.data),
  listRoles: () =>
    apiClient.get<ApiSuccessResponse<TenantRole[]>>('/roles').then((r) => r.data),
  createRole: (payload: { name: string; description?: string; permissionCodes?: string[] }) =>
    apiClient.post('/roles', payload).then((r) => r.data),
  updateRole: (
    roleId: string,
    payload: { name?: string; description?: string; permissionCodes?: string[] },
  ) => apiClient.patch(`/roles/${roleId}`, payload).then((r) => r.data),
  deleteRole: (roleId: string) => apiClient.delete(`/roles/${roleId}`).then((r) => r.data),
  listPermissions: () =>
    apiClient.get<ApiSuccessResponse<PermissionItem[]>>('/permissions').then((r) => r.data),
  listSessions: () =>
    apiClient.get<ApiSuccessResponse<TenantSession[]>>('/sessions').then((r) => r.data),
  revokeSession: (sessionId: string) =>
    apiClient.delete(`/sessions/${sessionId}`).then((r) => r.data),
  revokeAllSessions: () => apiClient.delete('/sessions').then((r) => r.data),
  listAuditEvents: (params?: {
    page?: number;
    pageSize?: number;
    module?: string;
    action?: string;
    fromDate?: string;
    toDate?: string;
  }) =>
    apiClient
      .get<ApiSuccessResponse<AuditEventRow[]>>('/audit-events', { params })
      .then((r) => r.data),
  getAuditEvent: (id: string) =>
    apiClient.get(`/audit-events/${id}`).then((r) => r.data),
};
