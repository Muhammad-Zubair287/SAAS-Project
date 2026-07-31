'use client';

import { useQuery } from '@tanstack/react-query';
import { platformApi, type ListTenantsParams } from '../api/platform-api';

export const TENANT_KEYS = {
  all: ['tenants'] as const,
  list: (params?: ListTenantsParams) => [...TENANT_KEYS.all, 'list', params] as const,
  detail: (id: string) => [...TENANT_KEYS.all, 'detail', id] as const,
  usage: (id: string) => [...TENANT_KEYS.all, 'usage', id] as const,
  stats: () => [...TENANT_KEYS.all, 'stats'] as const,
  grants: (tenantId: string) => [...TENANT_KEYS.all, 'grants', tenantId] as const,
};

export function useTenants(params?: ListTenantsParams) {
  return useQuery({
    queryKey: TENANT_KEYS.list(params),
    queryFn: () => platformApi.tenants.list(params),
  });
}

export function useTenant(tenantId: string | undefined) {
  return useQuery({
    queryKey: TENANT_KEYS.detail(tenantId ?? ''),
    queryFn: () => platformApi.tenants.getById(tenantId!),
    enabled: !!tenantId,
  });
}

export function useTenantUsage(tenantId: string | undefined) {
  return useQuery({
    queryKey: TENANT_KEYS.usage(tenantId ?? ''),
    queryFn: () => platformApi.tenants.getUsage(tenantId!),
    enabled: !!tenantId,
  });
}

export function usePlatformStats() {
  return useQuery({
    queryKey: TENANT_KEYS.stats(),
    queryFn: () => platformApi.tenants.getStats(),
    staleTime: 60_000,
  });
}

export function useSupportGrants(tenantId: string | undefined) {
  return useQuery({
    queryKey: TENANT_KEYS.grants(tenantId ?? ''),
    queryFn: () => platformApi.supportGrants.listByTenant(tenantId!),
    enabled: !!tenantId,
  });
}
