'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organisationApi } from '../api/organisation-api';
import type { CreateDepartmentPayload, UpdateDepartmentPayload, ListParams } from '../types/organisation.types';

export const DEPARTMENT_KEYS = {
  all:    ['departments'] as const,
  list:   (params?: ListParams) => [...DEPARTMENT_KEYS.all, 'list', params] as const,
  detail: (id: string)          => [...DEPARTMENT_KEYS.all, 'detail', id]  as const,
};

export function useDepartments(params?: ListParams) {
  return useQuery({
    queryKey: DEPARTMENT_KEYS.list(params),
    queryFn:  () => organisationApi.departments.list(params),
    staleTime: 60_000,
  });
}

export function useDepartment(id: string | undefined) {
  return useQuery({
    queryKey: DEPARTMENT_KEYS.detail(id ?? ''),
    queryFn:  () => organisationApi.departments.getById(id!),
    enabled:  !!id,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDepartmentPayload) => organisationApi.departments.create(payload),
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: DEPARTMENT_KEYS.all }); },
  });
}

export function useUpdateDepartment(id: string, rowVersion?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateDepartmentPayload) =>
      organisationApi.departments.update(id, payload, rowVersion),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DEPARTMENT_KEYS.detail(id) });
      void qc.invalidateQueries({ queryKey: DEPARTMENT_KEYS.list() });
    },
  });
}

export function useDeactivateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => organisationApi.departments.deactivate(id),
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: DEPARTMENT_KEYS.all }); },
  });
}
