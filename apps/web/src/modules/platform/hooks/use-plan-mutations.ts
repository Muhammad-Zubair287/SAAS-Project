'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '../api/platform-api';
import type { CreatePlanPayload, UpdatePlanPayload } from '../types/platform.types';
import { CATALOGUE_KEYS } from './use-tenants';
import { toastApiError, toastApiSuccess } from '../lib/platform-toast';

function invalidatePlanCatalogue(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['platform', 'plans'] });
}

function maybeToastSuccess(res: unknown): void {
  if (res && typeof res === 'object' && 'message' in res) {
    const message = (res as { message?: string }).message;
    if (message) toastApiSuccess(message);
  }
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePlanPayload) => platformApi.plansAdmin.create(payload),
    onSuccess: (res) => {
      invalidatePlanCatalogue(qc);
      maybeToastSuccess(res);
    },
    onError: (err) => toastApiError(err, 'Unable to create plan.'),
  });
}

export function useUpdatePlan(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePlanPayload) => platformApi.plansAdmin.update(planId, payload),
    onSuccess: (res) => {
      invalidatePlanCatalogue(qc);
      maybeToastSuccess(res);
    },
    onError: (err) => toastApiError(err, 'Unable to update plan.'),
  });
}

export function useSetPlanEntitlements(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ entitlementId: string; defaultValue: unknown }>) =>
      platformApi.plansAdmin.setEntitlements(planId, items),
    onSuccess: (res) => {
      invalidatePlanCatalogue(qc);
      maybeToastSuccess(res);
    },
    onError: (err) => toastApiError(err, 'Unable to save plan entitlements.'),
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => platformApi.plansAdmin.delete(planId),
    onSuccess: (res) => {
      invalidatePlanCatalogue(qc);
      maybeToastSuccess(res);
    },
    onError: (err) => toastApiError(err, 'Unable to delete plan.'),
  });
}
