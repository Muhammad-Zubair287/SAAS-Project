'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '../api/platform-api';
import { TENANT_KEYS } from './use-tenants';
import type {
  CreateTenantPayload,
  SuspendTenantPayload,
  RestoreTenantPayload,
  ChangePlanPayload,
  UpdateEntitlementsPayload,
  CreateSupportGrantPayload,
  RevokeSupportGrantPayload,
} from '../types/platform.types';

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTenantPayload) => platformApi.tenants.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TENANT_KEYS.all });
    },
  });
}

export function useActivateTenant(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => platformApi.tenants.activate(tenantId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TENANT_KEYS.detail(tenantId) });
      void qc.invalidateQueries({ queryKey: TENANT_KEYS.list() });
      void qc.invalidateQueries({ queryKey: TENANT_KEYS.stats() });
    },
  });
}

export function useSuspendTenant(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SuspendTenantPayload) =>
      platformApi.tenants.suspend(tenantId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TENANT_KEYS.detail(tenantId) });
      void qc.invalidateQueries({ queryKey: TENANT_KEYS.list() });
      void qc.invalidateQueries({ queryKey: TENANT_KEYS.stats() });
    },
  });
}

export function useRestoreTenant(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RestoreTenantPayload) =>
      platformApi.tenants.restore(tenantId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TENANT_KEYS.detail(tenantId) });
      void qc.invalidateQueries({ queryKey: TENANT_KEYS.list() });
      void qc.invalidateQueries({ queryKey: TENANT_KEYS.stats() });
    },
  });
}

export function useChangePlan(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChangePlanPayload) =>
      platformApi.tenants.changePlan(tenantId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TENANT_KEYS.detail(tenantId) });
    },
  });
}

export function useUpdateEntitlements(tenantId: string, rowVersion?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateEntitlementsPayload) =>
      platformApi.tenants.updateEntitlements(tenantId, payload, rowVersion),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TENANT_KEYS.detail(tenantId) });
    },
  });
}

export function useCreateSupportGrant(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSupportGrantPayload) =>
      platformApi.supportGrants.create(tenantId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TENANT_KEYS.grants(tenantId) });
    },
  });
}

export function useRevokeSupportGrant(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ grantId, payload }: { grantId: string; payload: RevokeSupportGrantPayload }) =>
      platformApi.supportGrants.revoke(grantId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TENANT_KEYS.grants(tenantId) });
    },
  });
}
