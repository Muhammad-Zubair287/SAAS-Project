'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organisationApi } from '../api/organisation-api';
import type { CreatePositionPayload, UpdatePositionPayload, ListParams } from '../types/organisation.types';

export const POSITION_KEYS = {
  all:    ['positions'] as const,
  list:   (params?: ListParams) => [...POSITION_KEYS.all, 'list', params] as const,
  detail: (id: string)          => [...POSITION_KEYS.all, 'detail', id]  as const,
};

export function usePositions(params?: ListParams) {
  return useQuery({
    queryKey: POSITION_KEYS.list(params),
    queryFn:  () => organisationApi.positions.list(params),
    staleTime: 60_000,
  });
}

export function usePosition(id: string | undefined) {
  return useQuery({
    queryKey: POSITION_KEYS.detail(id ?? ''),
    queryFn:  () => organisationApi.positions.getById(id!),
    enabled:  !!id,
  });
}

export function useCreatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePositionPayload) => organisationApi.positions.create(payload),
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: POSITION_KEYS.all }); },
  });
}

export function useUpdatePosition(id: string, rowVersion?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePositionPayload) =>
      organisationApi.positions.update(id, payload, rowVersion),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: POSITION_KEYS.detail(id) });
      void qc.invalidateQueries({ queryKey: POSITION_KEYS.list() });
    },
  });
}

export function useDeactivatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => organisationApi.positions.deactivate(id),
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: POSITION_KEYS.all }); },
  });
}
