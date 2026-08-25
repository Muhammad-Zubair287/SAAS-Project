'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organisationApi } from '../api/organisation-api';
import type {
  CreateGradePayload,
  ListGradesParams,
  UpdateGradePayload,
} from '../types/organisation.types';

export const ORG_OVERVIEW_KEYS = {
  all: ['organisation-overview'] as const,
  summary: () => [...ORG_OVERVIEW_KEYS.all, 'summary'] as const,
  history: (params?: { page?: number; pageSize?: number }) =>
    [...ORG_OVERVIEW_KEYS.all, 'history', params] as const,
  departmentTree: (legalEntityId?: string) =>
    [...ORG_OVERVIEW_KEYS.all, 'department-tree', legalEntityId] as const,
  grades: (params?: ListGradesParams) => [...ORG_OVERVIEW_KEYS.all, 'grades', params] as const,
  grade: (id: string) => [...ORG_OVERVIEW_KEYS.all, 'grade', id] as const,
};

export function useOrganisationOverview() {
  return useQuery({
    queryKey: ORG_OVERVIEW_KEYS.summary(),
    queryFn: () => organisationApi.overview.get(),
    staleTime: 60_000,
  });
}

export function useOrganisationHistory(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ORG_OVERVIEW_KEYS.history(params),
    queryFn: () => organisationApi.overview.history(params),
    staleTime: 60_000,
  });
}

export function useDepartmentTree(legalEntityId?: string) {
  return useQuery({
    queryKey: ORG_OVERVIEW_KEYS.departmentTree(legalEntityId),
    queryFn: () => organisationApi.overview.departmentTree(legalEntityId),
    staleTime: 60_000,
  });
}

export function useGrades(params?: ListGradesParams) {
  return useQuery({
    queryKey: ORG_OVERVIEW_KEYS.grades(params),
    queryFn: () => organisationApi.grades.list(params),
    staleTime: 60_000,
  });
}

export function useCreateGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGradePayload) => organisationApi.grades.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ORG_OVERVIEW_KEYS.all });
    },
  });
}

export function useUpdateGrade(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateGradePayload) => organisationApi.grades.update(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ORG_OVERVIEW_KEYS.grade(id) });
      void qc.invalidateQueries({ queryKey: ORG_OVERVIEW_KEYS.all });
    },
  });
}

export function useDeleteGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => organisationApi.grades.deactivate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ORG_OVERVIEW_KEYS.all });
    },
  });
}
