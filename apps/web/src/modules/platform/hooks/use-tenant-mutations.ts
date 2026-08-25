'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '../api/platform-api';
import type {
  CreateTenantPayload,
  SuspendTenantPayload,
  RestoreTenantPayload,
  ChangePlanPayload,
  UpdateEntitlementsPayload,
  CreateSupportGrantPayload,
  RevokeSupportGrantPayload,
  CloseTenantPayload,
  ApproveSupportGrantPayload,
  RejectSupportGrantPayload,
  UserPreferences,
} from '../types/platform.types';
import {
  TENANT_KEYS,
  NOTIFICATION_KEYS,
  INTEGRATION_KEYS,
  CONFIG_KEYS,
} from './use-tenants';
import { toastApiError, toastApiSuccess } from '../lib/platform-toast';

function maybeToastSuccess(res: unknown): void {
  if (res && typeof res === 'object' && 'message' in res) {
    const message = (res as { message?: string }).message;
    if (message) toastApiSuccess(message);
  }
}

function invalidateTenantSurface(qc: ReturnType<typeof useQueryClient>, tenantId?: string) {
  void qc.invalidateQueries({ queryKey: TENANT_KEYS.all });
  void qc.invalidateQueries({ queryKey: TENANT_KEYS.stats() });
  void qc.invalidateQueries({ queryKey: TENANT_KEYS.usageSummary() });
  if (tenantId) {
    void qc.invalidateQueries({ queryKey: TENANT_KEYS.detail(tenantId) });
    void qc.invalidateQueries({ queryKey: TENANT_KEYS.grants(tenantId) });
  }
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTenantPayload) => platformApi.tenants.create(payload),
    onSuccess: (res) => {
      invalidateTenantSurface(qc);
      maybeToastSuccess(res);
    },
    onError: (err) => toastApiError(err, 'Unable to create tenant.'),
  });
}

export function useActivateTenant(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => platformApi.tenants.activate(tenantId),
    onSuccess: (res) => {
      invalidateTenantSurface(qc, tenantId);
      maybeToastSuccess(res);
    },
    onError: (err) => toastApiError(err, 'Unable to activate tenant.'),
  });
}

export function useSuspendTenant(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SuspendTenantPayload) =>
      platformApi.tenants.suspend(tenantId, payload),
    onSuccess: (res) => {
      invalidateTenantSurface(qc, tenantId);
      maybeToastSuccess(res);
    },
    onError: (err) => toastApiError(err, 'Unable to suspend tenant.'),
  });
}

export function useRestoreTenant(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RestoreTenantPayload) =>
      platformApi.tenants.restore(tenantId, payload),
    onSuccess: (res) => {
      invalidateTenantSurface(qc, tenantId);
      maybeToastSuccess(res);
    },
    onError: (err) => toastApiError(err, 'Unable to restore tenant.'),
  });
}

export function useChangePlan(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChangePlanPayload) =>
      platformApi.tenants.changePlan(tenantId, payload),
    onSuccess: (res) => {
      invalidateTenantSurface(qc, tenantId);
      maybeToastSuccess(res);
    },
    onError: (err) => toastApiError(err, 'Unable to change plan.'),
  });
}

export function useUpdateEntitlements(tenantId: string, rowVersion?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateEntitlementsPayload) =>
      platformApi.tenants.updateEntitlements(tenantId, payload, rowVersion),
    onSuccess: (res) => {
      invalidateTenantSurface(qc, tenantId);
      maybeToastSuccess(res);
    },
    onError: (err) => toastApiError(err, 'Unable to update entitlements.'),
  });
}

export function useCreateSupportGrant(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSupportGrantPayload) =>
      platformApi.supportGrants.create(tenantId, payload),
    onSuccess: (res) => {
      invalidateTenantSurface(qc, tenantId);
      maybeToastSuccess(res);
    },
    onError: (err) => toastApiError(err, 'Unable to create support grant.'),
  });
}

export function useRevokeSupportGrant(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ grantId, payload }: { grantId: string; payload: RevokeSupportGrantPayload }) =>
      platformApi.supportGrants.revoke(grantId, payload),
    onSuccess: (res) => {
      invalidateTenantSurface(qc, tenantId);
      maybeToastSuccess(res);
    },
    onError: (err) => toastApiError(err, 'Unable to revoke support grant.'),
  });
}

export function useApproveSupportGrant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ grantId }: { grantId: string; payload?: ApproveSupportGrantPayload }) =>
      platformApi.supportGrantActions.approve(grantId),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: TENANT_KEYS.all });
      maybeToastSuccess(res);
    },
    onError: (err) => toastApiError(err, 'Unable to approve support grant.'),
  });
}

export function useRejectSupportGrant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ grantId, payload }: { grantId: string; payload: RejectSupportGrantPayload }) =>
      platformApi.supportGrantActions.reject(grantId, { reason: payload.reason }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: TENANT_KEYS.all });
      maybeToastSuccess(res);
    },
    onError: (err) => toastApiError(err, 'Unable to reject support grant.'),
  });
}

export function useCloseTenant(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CloseTenantPayload) =>
      platformApi.tenantActions.close(tenantId, payload),
    onSuccess: (res) => {
      invalidateTenantSurface(qc, tenantId);
      maybeToastSuccess(res);
    },
    onError: (err) => toastApiError(err, 'Unable to close tenant.'),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => platformApi.notifications.markRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unreadCount() });
      void qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unread() });
    },
    onError: (err) => toastApiError(err, 'Unable to mark notification read.'),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => platformApi.notifications.markAllRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unreadCount() });
      void qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unread() });
    },
    onError: (err) => toastApiError(err, 'Unable to mark notifications read.'),
  });
}

export function useRetryIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (integrationId: string) => platformApi.integrationHealth.retry(integrationId),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: INTEGRATION_KEYS.list() });
      maybeToastSuccess(res);
    },
    onError: (err) => toastApiError(err, 'Unable to retry integration.'),
  });
}

export function useDisableIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (integrationId: string) => platformApi.integrationHealth.disable(integrationId),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: INTEGRATION_KEYS.list() });
      maybeToastSuccess(res);
    },
    onError: (err) => toastApiError(err, 'Unable to disable integration.'),
  });
}

export function useSavePlatformConfig(domain: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, unknown>) => platformApi.config.put(domain, values),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: CONFIG_KEYS.domain(domain) });
      maybeToastSuccess(res);
    },
    onError: (err) => toastApiError(err, 'Unable to save configuration.'),
  });
}

export function useUpdateUserPreferences() {
  return useMutation({
    mutationFn: (prefs: UserPreferences) => platformApi.me.updatePreferences(prefs),
    onError: (err) => toastApiError(err, 'Unable to update preferences.'),
  });
}

export function useCreateAnnouncement() {
  return useMutation({
    mutationFn: platformApi.announcements.create,
    onSuccess: (res) => maybeToastSuccess(res),
    onError: (err) => toastApiError(err, 'Unable to create announcement.'),
  });
}
