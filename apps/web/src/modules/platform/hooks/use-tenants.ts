'use client';

import { useQuery } from '@tanstack/react-query';
import { platformApi, type ListTenantsParams, type ListSupportGrantsParams } from '../api/platform-api';
import type { ListAuditEventsParams } from '../types/platform.types';

export const TENANT_KEYS = {
  all: ['tenants'] as const,
  list: (params?: ListTenantsParams) => [...TENANT_KEYS.all, 'list', params] as const,
  detail: (id: string) => [...TENANT_KEYS.all, 'detail', id] as const,
  usage: (id: string) => [...TENANT_KEYS.all, 'usage', id] as const,
  stats: () => [...TENANT_KEYS.all, 'stats'] as const,
  usageSummary: () => [...TENANT_KEYS.all, 'usageSummary'] as const,
  grants: (tenantId: string) => [...TENANT_KEYS.all, 'grants', tenantId] as const,
  allGrants: (params?: ListSupportGrantsParams) => [...TENANT_KEYS.all, 'allGrants', params] as const,
};

export const CATALOGUE_KEYS = {
  plans: (includeEntitlements?: boolean) => ['platform', 'plans', includeEntitlements] as const,
  regions: () => ['platform', 'regions'] as const,
};

export const AUDIT_KEYS = {
  list: (params?: ListAuditEventsParams) => ['platform', 'audit', params] as const,
  detail: (id: string) => ['platform', 'audit', 'detail', id] as const,
  summary: () => ['platform', 'audit', 'summary'] as const,
};

export const NOTIFICATION_KEYS = {
  unreadCount: () => ['platform', 'notifications', 'unreadCount'] as const,
  unread: () => ['platform', 'notifications', 'unread'] as const,
  list: (params?: { page?: number; pageSize?: number }) => ['platform', 'notifications', 'list', params] as const,
};

export const INTEGRATION_KEYS = {
  list: () => ['platform', 'integrations'] as const,
  incidents: () => ['platform', 'integrations', 'incidents'] as const,
};

export const CONFIG_KEYS = {
  domain: (domain: string) => ['platform', 'config', domain] as const,
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

export function usePlatformUsageSummary() {
  return useQuery({
    queryKey: TENANT_KEYS.usageSummary(),
    queryFn: () => platformApi.tenants.getUsageSummary(),
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

export function useAllSupportGrants(params?: ListSupportGrantsParams) {
  return useQuery({
    queryKey: TENANT_KEYS.allGrants(params),
    queryFn: () => platformApi.supportGrants.list(params),
  });
}

export function usePlans(includeEntitlements = false) {
  return useQuery({
    queryKey: CATALOGUE_KEYS.plans(includeEntitlements),
    queryFn: () => platformApi.catalogue.listPlans(includeEntitlements),
    staleTime: 300_000,
  });
}

export function useDeploymentRegions() {
  return useQuery({
    queryKey: CATALOGUE_KEYS.regions(),
    queryFn: () => platformApi.catalogue.listRegions(),
    staleTime: 300_000,
  });
}

export function useAuditEvents(params?: ListAuditEventsParams) {
  return useQuery({
    queryKey: AUDIT_KEYS.list(params),
    queryFn: () => platformApi.audit.list(params),
  });
}

export function useAuditEvent(id: string | undefined) {
  return useQuery({
    queryKey: AUDIT_KEYS.detail(id ?? ''),
    queryFn: () => platformApi.audit.getById(id!),
    enabled: !!id,
  });
}

export function useAuditSummary() {
  return useQuery({
    queryKey: AUDIT_KEYS.summary(),
    queryFn: () => platformApi.audit.getSummary(),
    staleTime: 60_000,
  });
}

export function useNotificationUnreadCount() {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.unreadCount(),
    queryFn: () => platformApi.notifications.getUnreadCount(),
    refetchInterval: 30_000,
  });
}

export function useUnreadNotifications() {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.unread(),
    queryFn: () => platformApi.notifications.listUnread(),
  });
}

export function useNotifications(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(params),
    queryFn: () => platformApi.notifications.list(params),
  });
}

export function useIntegrationHealth() {
  return useQuery({
    queryKey: INTEGRATION_KEYS.list(),
    queryFn: () => platformApi.integrationHealth.list(),
    staleTime: 30_000,
  });
}

export function useIntegrationIncidents() {
  return useQuery({
    queryKey: INTEGRATION_KEYS.incidents(),
    queryFn: () => platformApi.integrationHealth.listIncidents(),
    staleTime: 30_000,
  });
}

export function usePlatformConfig(domain: string) {
  return useQuery({
    queryKey: CONFIG_KEYS.domain(domain),
    queryFn: () => platformApi.config.get(domain),
    staleTime: 120_000,
  });
}
