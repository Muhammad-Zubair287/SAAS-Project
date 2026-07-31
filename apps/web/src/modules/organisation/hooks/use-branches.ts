'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organisationApi } from '../api/organisation-api';
import type { CreateBranchPayload, UpdateBranchPayload, ListParams } from '../types/organisation.types';

export const BRANCH_KEYS = {
  all:    ['branches'] as const,
  list:   (params?: ListParams) => [...BRANCH_KEYS.all, 'list', params] as const,
  detail: (id: string)          => [...BRANCH_KEYS.all, 'detail', id]  as const,
};

export function useBranches(params?: ListParams) {
  return useQuery({
    queryKey: BRANCH_KEYS.list(params),
    queryFn:  () => organisationApi.branches.list(params),
    staleTime: 60_000,
  });
}

export function useBranch(id: string | undefined) {
  return useQuery({
    queryKey: BRANCH_KEYS.detail(id ?? ''),
    queryFn:  () => organisationApi.branches.getById(id!),
    enabled:  !!id,
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBranchPayload) => organisationApi.branches.create(payload),
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: BRANCH_KEYS.all }); },
  });
}

export function useUpdateBranch(id: string, rowVersion?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateBranchPayload) =>
      organisationApi.branches.update(id, payload, rowVersion),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: BRANCH_KEYS.detail(id) });
      void qc.invalidateQueries({ queryKey: BRANCH_KEYS.list() });
    },
  });
}

export function useDeactivateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => organisationApi.branches.deactivate(id),
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: BRANCH_KEYS.all }); },
  });
}
