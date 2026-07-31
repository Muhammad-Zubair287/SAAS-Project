'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organisationApi } from '../api/organisation-api';
import type {
  CreateLegalEntityPayload,
  UpdateLegalEntityPayload,
  ListParams,
} from '../types/organisation.types';

export const LEGAL_ENTITY_KEYS = {
  all:    ['legalEntities'] as const,
  list:   (params?: ListParams) => [...LEGAL_ENTITY_KEYS.all, 'list', params] as const,
  detail: (id: string)          => [...LEGAL_ENTITY_KEYS.all, 'detail', id]  as const,
};

export function useLegalEntities(params?: ListParams) {
  return useQuery({
    queryKey:  LEGAL_ENTITY_KEYS.list(params),
    queryFn:   () => organisationApi.legalEntities.list(params),
    staleTime: 60_000,
  });
}

export function useLegalEntity(id: string | undefined) {
  return useQuery({
    queryKey: LEGAL_ENTITY_KEYS.detail(id ?? ''),
    queryFn:  () => organisationApi.legalEntities.getById(id!),
    enabled:  !!id,
  });
}

export function useCreateLegalEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLegalEntityPayload) =>
      organisationApi.legalEntities.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LEGAL_ENTITY_KEYS.all });
    },
  });
}

export function useUpdateLegalEntity(id: string, rowVersion?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateLegalEntityPayload) =>
      organisationApi.legalEntities.update(id, payload, rowVersion),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LEGAL_ENTITY_KEYS.detail(id) });
      void qc.invalidateQueries({ queryKey: LEGAL_ENTITY_KEYS.list() });
    },
  });
}

export function useDeactivateLegalEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => organisationApi.legalEntities.deactivate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LEGAL_ENTITY_KEYS.all });
    },
  });
}
