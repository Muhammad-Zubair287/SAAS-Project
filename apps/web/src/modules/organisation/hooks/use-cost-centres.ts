'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organisationApi } from '../api/organisation-api';
import type { CreateCostCentrePayload, UpdateCostCentrePayload, ListParams } from '../types/organisation.types';

export const COST_CENTRE_KEYS = {
  all:    ['costCentres'] as const,
  list:   (params?: ListParams) => [...COST_CENTRE_KEYS.all, 'list', params] as const,
  detail: (id: string)          => [...COST_CENTRE_KEYS.all, 'detail', id]  as const,
};

export function useCostCentres(params?: ListParams) {
  return useQuery({
    queryKey: COST_CENTRE_KEYS.list(params),
    queryFn:  () => organisationApi.costCentres.list(params),
    staleTime: 60_000,
  });
}

export function useCostCentre(id: string | undefined) {
  return useQuery({
    queryKey: COST_CENTRE_KEYS.detail(id ?? ''),
    queryFn:  () => organisationApi.costCentres.getById(id!),
    enabled:  !!id,
  });
}

export function useCreateCostCentre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCostCentrePayload) => organisationApi.costCentres.create(payload),
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: COST_CENTRE_KEYS.all }); },
  });
}

export function useUpdateCostCentre(id: string, rowVersion?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCostCentrePayload) =>
      organisationApi.costCentres.update(id, payload, rowVersion),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: COST_CENTRE_KEYS.detail(id) });
      void qc.invalidateQueries({ queryKey: COST_CENTRE_KEYS.list() });
    },
  });
}

export function useDeactivateCostCentre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => organisationApi.costCentres.deactivate(id),
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: COST_CENTRE_KEYS.all }); },
  });
}
