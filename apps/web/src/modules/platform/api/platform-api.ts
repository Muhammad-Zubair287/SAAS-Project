import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';
import type {
  Tenant,
  TenantSummary,
  TenantUsage,
  SupportGrant,
  PlatformStats,
  CreateTenantPayload,
  SuspendTenantPayload,
  RestoreTenantPayload,
  ChangePlanPayload,
  UpdateEntitlementsPayload,
  CreateSupportGrantPayload,
  RevokeSupportGrantPayload,
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
}

const BASE = '/platform';

export const platformApi = {
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
  },

  supportGrants: {
    create: (tenantId: string, payload: CreateSupportGrantPayload) =>
      apiClient
        .post<ApiSuccessResponse<SupportGrant>>(
          `${BASE}/tenants/${tenantId}/support-grants`,
          payload,
        )
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
  },
};
