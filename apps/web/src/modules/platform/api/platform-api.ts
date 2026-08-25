import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';
import type {
  Tenant,
  TenantSummary,
  TenantUsage,
  SupportGrant,
  PlatformStats,
  PlatformUsageSummary,
  Plan,
  DeploymentRegion,
  AuditEvent,
  AuditEventDetail,
  AuditSummary,
  AuditExportJob,
  CreateTenantPayload,
  SuspendTenantPayload,
  RestoreTenantPayload,
  ChangePlanPayload,
  UpdateEntitlementsPayload,
  CreateSupportGrantPayload,
  RevokeSupportGrantPayload,
  ListAuditEventsParams,
  PlatformNotification,
  IntegrationHealthCard,
  IntegrationIncident,
  PlatformConfigDomain,
  CreateAnnouncementPayload,
  SearchResponse,
  CloseTenantPayload,
  UserPreferences,
  UsageDashboard,
  CreatePlanPayload,
  UpdatePlanPayload,
  EntitlementCatalogueItem,
  CreateRegionPayload,
} from '../types/platform.types';

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  timestamp: string;
}

export interface ListTenantsParams {
  page?: number;
  pageSize?: number;
  status?: string;
  countryCode?: string;
  planKey?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  createdFrom?: string;
  createdTo?: string;
  trialEndingBefore?: string;
  minSeatUtilisationPct?: number;
}

export interface ListSupportGrantsParams {
  page?: number;
  pageSize?: number;
  tenantId?: string;
  status?: string;
}

const BASE = '/platform';

export const platformApi = {
  catalogue: {
    listPlans: (includeEntitlements = false) =>
      apiClient
        .get<ApiSuccessResponse<Plan[]>>(`${BASE}/plans`, {
          params: includeEntitlements ? { includeEntitlements: 'true' } : {},
        })
        .then((r) => r.data),

    listRegions: () =>
      apiClient
        .get<ApiSuccessResponse<DeploymentRegion[]>>(`${BASE}/deployment-regions`)
        .then((r) => r.data),
  },

  tenants: {
    create: (payload: CreateTenantPayload) =>
      apiClient
        .post<ApiSuccessResponse<Tenant>>(`${BASE}/tenants`, payload)
        .then((r) => r.data),

    list: (params?: ListTenantsParams) =>
      apiClient
        .get<PaginatedResponse<TenantSummary>>(`${BASE}/tenants`, { params })
        .then((r) => r.data),

    getById: (tenantId: string) =>
      apiClient
        .get<ApiSuccessResponse<Tenant>>(`${BASE}/tenants/${tenantId}`)
        .then((r) => r.data),

    update: (tenantId: string, payload: Partial<Pick<Tenant, 'displayName' | 'legalName' | 'seatLimit'>>, rowVersion?: string) =>
      apiClient
        .patch<ApiSuccessResponse<Tenant>>(`${BASE}/tenants/${tenantId}`, payload, {
          headers: rowVersion ? { 'if-match': rowVersion } : {},
        })
        .then((r) => r.data),

    activate: (tenantId: string) =>
      apiClient
        .post<ApiSuccessResponse<Tenant>>(`${BASE}/tenants/${tenantId}/activate`)
        .then((r) => r.data),

    suspend: (tenantId: string, payload: SuspendTenantPayload) =>
      apiClient
        .post<ApiSuccessResponse<Tenant>>(`${BASE}/tenants/${tenantId}/suspend`, payload)
        .then((r) => r.data),

    restore: (tenantId: string, payload: RestoreTenantPayload) =>
      apiClient
        .post<ApiSuccessResponse<Tenant>>(`${BASE}/tenants/${tenantId}/restore`, payload)
        .then((r) => r.data),

    getUsage: (tenantId: string) =>
      apiClient
        .get<ApiSuccessResponse<TenantUsage>>(`${BASE}/tenants/${tenantId}/usage`)
        .then((r) => r.data),

    changePlan: (tenantId: string, payload: ChangePlanPayload) =>
      apiClient
        .put<ApiSuccessResponse<Tenant>>(`${BASE}/tenants/${tenantId}/plan`, payload)
        .then((r) => r.data),

    updateEntitlements: (tenantId: string, payload: UpdateEntitlementsPayload, rowVersion?: string) =>
      apiClient
        .put<ApiSuccessResponse<Tenant>>(`${BASE}/tenants/${tenantId}/entitlements`, payload, {
          headers: rowVersion ? { 'if-match': rowVersion } : {},
        })
        .then((r) => r.data),

    getStats: () =>
      apiClient
        .get<ApiSuccessResponse<PlatformStats>>(`${BASE}/tenants/stats`)
        .then((r) => r.data),

    getUsageSummary: () =>
      apiClient
        .get<ApiSuccessResponse<PlatformUsageSummary>>(`${BASE}/tenants/usage/summary`)
        .then((r) => r.data),

    validateSlug: (slug: string) =>
      apiClient
        .get<ApiSuccessResponse<{ available: boolean; slug: string }>>(
          `${BASE}/tenants/validate/slug`,
          { params: { slug } },
        )
        .then((r) => r.data),

    validateAdminEmail: (email: string) =>
      apiClient
        .get<ApiSuccessResponse<{ available: boolean; email: string }>>(
          `${BASE}/tenants/validate/email`,
          { params: { email } },
        )
        .then((r) => r.data),
  },

  supportGrants: {
    create: (tenantId: string, payload: CreateSupportGrantPayload) =>
      apiClient
        .post<ApiSuccessResponse<SupportGrant>>(
          `${BASE}/tenants/${tenantId}/support-grants`,
          payload,
        )
        .then((r) => r.data),

    list: (params?: ListSupportGrantsParams) =>
      apiClient
        .get<PaginatedResponse<SupportGrant>>(`${BASE}/support-grants`, { params })
        .then((r) => r.data),

    listByTenant: (tenantId: string) =>
      apiClient
        .get<ApiSuccessResponse<SupportGrant[]>>(
          `${BASE}/tenants/${tenantId}/support-grants`,
        )
        .then((r) => r.data),

    revoke: (grantId: string, payload: RevokeSupportGrantPayload) =>
      apiClient
        .delete<ApiSuccessResponse<SupportGrant>>(`${BASE}/support-grants/${grantId}`, {
          data: payload,
        })
        .then((r) => r.data),

    approve: (grantId: string) =>
      apiClient
        .post<ApiSuccessResponse<SupportGrant>>(`${BASE}/support-grants/${grantId}/approve`)
        .then((r) => r.data),

    reject: (grantId: string, payload: { reason: string }) =>
      apiClient
        .post<ApiSuccessResponse<SupportGrant>>(`${BASE}/support-grants/${grantId}/reject`, payload)
        .then((r) => r.data),
  },

  audit: {
    list: (params?: ListAuditEventsParams) =>
      apiClient
        .get<PaginatedResponse<AuditEvent>>(`${BASE}/audit-events`, { params })
        .then((r) => r.data),

    getById: (id: string) =>
      apiClient
        .get<ApiSuccessResponse<AuditEventDetail>>(`${BASE}/audit-events/${id}`)
        .then((r) => r.data),

    getSummary: (params?: { fromDate?: string; toDate?: string }) =>
      apiClient
        .get<ApiSuccessResponse<AuditSummary>>(`${BASE}/audit-events/summary`, { params })
        .then((r) => r.data),

    requestExport: (payload?: { filters?: Record<string, unknown>; reason?: string }) =>
      apiClient
        .post<ApiSuccessResponse<AuditExportJob>>(`${BASE}/audit-events/exports`, payload ?? {})
        .then((r) => r.data),

    listExports: () =>
      apiClient
        .get<ApiSuccessResponse<AuditExportJob[]>>(`${BASE}/audit-events/exports`)
        .then((r) => r.data),
  },

  notifications: {
    listUnread: () =>
      apiClient
        .get<PaginatedResponse<PlatformNotification>>(`${BASE}/notifications`, {
          params: { unreadOnly: 'true', pageSize: 20 },
        })
        .then((r) => r.data),

    list: (params?: { page?: number; pageSize?: number; unreadOnly?: boolean }) =>
      apiClient
        .get<PaginatedResponse<PlatformNotification>>(`${BASE}/notifications`, {
          params: {
            ...params,
            unreadOnly: params?.unreadOnly ? 'true' : undefined,
          },
        })
        .then((r) => r.data),

    getUnreadCount: () =>
      apiClient
        .get<ApiSuccessResponse<{ count: number }>>(`${BASE}/notifications/unread-count`)
        .then((r) => r.data),

    markRead: (id: string) =>
      apiClient
        .post<ApiSuccessResponse<{ ok: boolean }>>(`${BASE}/notifications/${id}/read`)
        .then((r) => r.data),

    markAllRead: () =>
      apiClient
        .post<ApiSuccessResponse<{ ok: boolean }>>(`${BASE}/notifications/read-all`)
        .then((r) => r.data),
  },

  integrationHealth: {
    list: () =>
      apiClient
        .get<ApiSuccessResponse<IntegrationHealthCard[]>>(`${BASE}/integration-health`)
        .then((r) => r.data),

    listIncidents: () =>
      apiClient
        .get<ApiSuccessResponse<IntegrationIncident[]>>(`${BASE}/integration-health/incidents`)
        .then((r) => r.data),

    retry: (integrationId: string) =>
      apiClient
        .post<ApiSuccessResponse<{ ok: boolean; status: string }>>(
          `${BASE}/integration-health/${integrationId}/retry`,
        )
        .then((r) => r.data),

    setEnabled: (integrationId: string, enabled: boolean) =>
      apiClient
        .patch<ApiSuccessResponse<{ id: string; enabled: boolean; status: string }>>(
          `${BASE}/integration-health/${integrationId}/enabled`,
          { enabled },
        )
        .then((r) => r.data),

    disable: (integrationId: string) =>
      apiClient
        .patch<ApiSuccessResponse<{ id: string; enabled: boolean; status: string }>>(
          `${BASE}/integration-health/${integrationId}/enabled`,
          { enabled: false },
        )
        .then((r) => r.data),
  },

  config: {
    get: (domain: string) =>
      apiClient
        .get<ApiSuccessResponse<PlatformConfigDomain>>(`${BASE}/config/${domain}`)
        .then((r) => r.data),

    put: (domain: string, value: Record<string, unknown>, rowVersion?: string) =>
      apiClient
        .put<ApiSuccessResponse<PlatformConfigDomain>>(`${BASE}/config/${domain}`, {
          value,
          rowVersion,
        })
        .then((r) => r.data),

    listAll: () =>
      apiClient
        .get<ApiSuccessResponse<PlatformConfigDomain[]>>(`${BASE}/config`)
        .then((r) => r.data),
  },

  usage: {
    dashboard: (rangeDays = 30) =>
      apiClient
        .get<ApiSuccessResponse<UsageDashboard>>(`${BASE}/usage/dashboard`, {
          params: { rangeDays },
        })
        .then((r) => r.data),
  },

  plansAdmin: {
    create: (payload: CreatePlanPayload) =>
      apiClient
        .post<ApiSuccessResponse<Plan>>(`${BASE}/plans`, payload)
        .then((r) => r.data),

    update: (planId: string, payload: UpdatePlanPayload) =>
      apiClient
        .patch<ApiSuccessResponse<Plan>>(`${BASE}/plans/${planId}`, payload)
        .then((r) => r.data),

    setEntitlements: (planId: string, items: Array<{ entitlementId: string; defaultValue: unknown }>) =>
      apiClient
        .put<ApiSuccessResponse<Plan>>(`${BASE}/plans/${planId}/entitlements`, { items })
        .then((r) => r.data),

    listEntitlements: () =>
      apiClient
        .get<ApiSuccessResponse<EntitlementCatalogueItem[]>>(`${BASE}/entitlements`)
        .then((r) => r.data),

    createRegion: (payload: CreateRegionPayload) =>
      apiClient
        .post<ApiSuccessResponse<DeploymentRegion>>(`${BASE}/deployment-regions`, payload)
        .then((r) => r.data),

    updateRegion: (regionId: string, payload: Partial<CreateRegionPayload>) =>
      apiClient
        .patch<ApiSuccessResponse<DeploymentRegion>>(`${BASE}/deployment-regions/${regionId}`, payload)
        .then((r) => r.data),
  },

  announcements: {
    create: (payload: CreateAnnouncementPayload) =>
      apiClient
        .post<ApiSuccessResponse<{ created: number }>>(`${BASE}/announcements`, payload)
        .then((r) => r.data),
  },

  search: {
    query: (q: string) =>
      apiClient
        .get<ApiSuccessResponse<SearchResponse>>(`${BASE}/search`, { params: { q } })
        .then((r) => r.data),
  },

  me: {
    getPreferences: () =>
      apiClient
        .get<ApiSuccessResponse<UserPreferences>>(`${BASE}/me/preferences`)
        .then((r) => r.data),

    updatePreferences: (prefs: UserPreferences) =>
      apiClient
        .patch<ApiSuccessResponse<UserPreferences>>(`${BASE}/me/preferences`, prefs)
        .then((r) => r.data),
  },

  tenantActions: {
    close: (tenantId: string, payload: CloseTenantPayload) =>
      apiClient
        .post<ApiSuccessResponse<Tenant>>(`${BASE}/tenants/${tenantId}/close`, payload)
        .then((r) => r.data),
  },

  supportGrantActions: {
    approve: (grantId: string) =>
      apiClient
        .post<ApiSuccessResponse<SupportGrant>>(`${BASE}/support-grants/${grantId}/approve`)
        .then((r) => r.data),

    reject: (grantId: string, payload: { reason: string }) =>
      apiClient
        .post<ApiSuccessResponse<SupportGrant>>(`${BASE}/support-grants/${grantId}/reject`, payload)
        .then((r) => r.data),
  },
};
