'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employee-api';
import type {
  CreateEmployeePayload,
  UpdateEmployeePayload,
  UpsertPersonalDetailPayload,
  ListEmployeesParams,
} from '../types/employee.types';

export const EMPLOYEE_KEYS = {
  all:           ['employees'] as const,
  list:          (params?: ListEmployeesParams) => [...EMPLOYEE_KEYS.all, 'list', params] as const,
  detail:        (id: string) => [...EMPLOYEE_KEYS.all, 'detail', id] as const,
  personalDetail: (employeeId: string) => [...EMPLOYEE_KEYS.all, 'personalDetail', employeeId] as const,
};

export function useEmployees(params?: ListEmployeesParams) {
  return useQuery({
    queryKey:  EMPLOYEE_KEYS.list(params),
    queryFn:   () => employeeApi.employees.list(params),
    staleTime: 60_000,
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.detail(id ?? ''),
    queryFn:  () => employeeApi.employees.getById(id!),
    enabled:  !!id,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEmployeePayload) =>
      employeeApi.employees.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.all });
    },
  });
}

export function useUpdateEmployee(id: string, rowVersion?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateEmployeePayload) =>
      employeeApi.employees.update(id, payload, rowVersion),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.detail(id) });
      void qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.list() });
    },
  });
}

export function useDeactivateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => employeeApi.employees.deactivate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.all });
    },
  });
}

export function useEmployeePersonalDetail(employeeId: string | undefined) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.personalDetail(employeeId ?? ''),
    queryFn:  () => employeeApi.personalDetails.get(employeeId!),
    enabled:  !!employeeId,
    retry:    false,
  });
}

export function useUpsertPersonalDetail(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertPersonalDetailPayload) =>
      employeeApi.personalDetails.upsert(employeeId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.personalDetail(employeeId) });
    },
  });
}
