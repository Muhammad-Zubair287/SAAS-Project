'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employee-api';
import type {
  CreateEmployeePayload,
  UpdateEmployeePayload,
  UpsertPersonalDetailPayload,
  TransferEmployeePayload,
  ChangeEmployeeStatusPayload,
  StartEmployeeImportPayload,
  ListEmployeesParams,
} from '../types/employee.types';

export const EMPLOYEE_KEYS = {
  all:           ['employees'] as const,
  list:          (params?: ListEmployeesParams) => [...EMPLOYEE_KEYS.all, 'list', params] as const,
  detail:        (id: string) => [...EMPLOYEE_KEYS.all, 'detail', id] as const,
  personalDetail: (employeeId: string) => [...EMPLOYEE_KEYS.all, 'personalDetail', employeeId] as const,
  employment: (employeeId: string) => [...EMPLOYEE_KEYS.all, 'employment', employeeId] as const,
  employmentHistory: (employeeId: string) =>
    [...EMPLOYEE_KEYS.all, 'employment-history', employeeId] as const,
  timeline: (employeeId: string) => [...EMPLOYEE_KEYS.all, 'timeline', employeeId] as const,
  importJob: (importId: string) => [...EMPLOYEE_KEYS.all, 'import-job', importId] as const,
  dataQuality: () => [...EMPLOYEE_KEYS.all, 'data-quality'] as const,
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

export function useEmployeeEmployment(employeeId: string | undefined) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.employment(employeeId ?? ''),
    queryFn: () => employeeApi.lifecycle.getEmployment(employeeId!),
    enabled: !!employeeId,
  });
}

export function useEmployeeEmploymentHistory(employeeId: string | undefined) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.employmentHistory(employeeId ?? ''),
    queryFn: () => employeeApi.lifecycle.getEmploymentHistory(employeeId!),
    enabled: !!employeeId,
  });
}

export function useTransferEmployee(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TransferEmployeePayload) => employeeApi.lifecycle.transfer(employeeId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.detail(employeeId) });
      void qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.employment(employeeId) });
      void qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.employmentHistory(employeeId) });
      void qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.timeline(employeeId) });
    },
  });
}

export function useChangeEmployeeStatus(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChangeEmployeeStatusPayload) =>
      employeeApi.lifecycle.changeStatus(employeeId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.detail(employeeId) });
      void qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.timeline(employeeId) });
      void qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.list() });
    },
  });
}

export function useEmployeeTimeline(employeeId: string | undefined) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.timeline(employeeId ?? ''),
    queryFn: () => employeeApi.lifecycle.getTimeline(employeeId!),
    enabled: !!employeeId,
  });
}

export function useStartEmployeeImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: StartEmployeeImportPayload) => employeeApi.imports.start(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.list() });
    },
  });
}

export function useEmployeeImportJob(importId: string | undefined) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.importJob(importId ?? ''),
    queryFn: () => employeeApi.imports.getById(importId!),
    enabled: !!importId,
    refetchInterval: (query) => {
      const status = query.state.data?.data.status;
      return status === 'VALIDATING' ? 3_000 : false;
    },
  });
}

export function useCommitEmployeeImport(importId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => employeeApi.imports.commit(importId!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.all });
    },
  });
}

export function useEmployeeDataQuality() {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.dataQuality(),
    queryFn: () => employeeApi.quality.getSummary(),
    staleTime: 60_000,
  });
}
