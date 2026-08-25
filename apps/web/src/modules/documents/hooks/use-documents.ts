'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '../api/documents-api';
import type {
  CreateDocumentTemplatePayload,
  UpdateDocumentTemplatePayload,
  ListDocumentTemplatesParams,
  CreateEmployeeDocumentPayload,
  UpdateEmployeeDocumentPayload,
  ListEmployeeDocumentsParams,
  CreateOnboardingTemplatePayload,
  UpdateOnboardingTemplatePayload,
  CreateOnboardingTemplateTaskPayload,
  ListOnboardingTemplatesParams,
  CreateOnboardingInstancePayload,
  UpdateOnboardingInstanceTaskPayload,
  ListOnboardingInstancesParams,
  CreateDocumentRequestPayload,
  UpdateDocumentRequestPayload,
  UpdateDocumentRequestItemPayload,
  ListDocumentRequestsParams,
} from '../types/documents.types';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const DOCUMENTS_KEYS = {
  all: ['documents'] as const,
  library: (params?: { page?: number; pageSize?: number; status?: string; search?: string; employeeId?: string }) =>
    [...DOCUMENTS_KEYS.all, 'library', params] as const,
  onboardingDashboard: () => [...DOCUMENTS_KEYS.all, 'onboarding-dashboard'] as const,

  templates: {
    all: ['document-templates'] as const,
    list: (params?: ListDocumentTemplatesParams) =>
      [...DOCUMENTS_KEYS.templates.all, 'list', params] as const,
    detail: (id: string) => [...DOCUMENTS_KEYS.templates.all, 'detail', id] as const,
  },

  employeeDocuments: {
    all: ['employee-documents'] as const,
    list: (employeeId: string, params?: ListEmployeeDocumentsParams) =>
      [...DOCUMENTS_KEYS.employeeDocuments.all, 'list', employeeId, params] as const,
    detail: (id: string) =>
      [...DOCUMENTS_KEYS.employeeDocuments.all, 'detail', id] as const,
  },

  onboardingTemplates: {
    all: ['onboarding-templates'] as const,
    list: (params?: ListOnboardingTemplatesParams) =>
      [...DOCUMENTS_KEYS.onboardingTemplates.all, 'list', params] as const,
    detail: (id: string) =>
      [...DOCUMENTS_KEYS.onboardingTemplates.all, 'detail', id] as const,
  },

  onboardingInstances: {
    all: ['onboarding-instances'] as const,
    list: (params?: ListOnboardingInstancesParams) =>
      [...DOCUMENTS_KEYS.onboardingInstances.all, 'list', params] as const,
    detail: (id: string) =>
      [...DOCUMENTS_KEYS.onboardingInstances.all, 'detail', id] as const,
  },

  documentRequests: {
    all: ['document-requests'] as const,
    list: (params?: ListDocumentRequestsParams) =>
      [...DOCUMENTS_KEYS.documentRequests.all, 'list', params] as const,
    detail: (id: string) =>
      [...DOCUMENTS_KEYS.documentRequests.all, 'detail', id] as const,
  },
};

// ─── Document Templates ───────────────────────────────────────────────────────

export function useDocumentTemplates(params?: ListDocumentTemplatesParams) {
  return useQuery({
    queryKey: DOCUMENTS_KEYS.templates.list(params),
    queryFn: () => documentsApi.templates.list(params),
    staleTime: 60_000,
  });
}

export function useDocumentTemplate(id: string | undefined) {
  return useQuery({
    queryKey: DOCUMENTS_KEYS.templates.detail(id ?? ''),
    queryFn: () => documentsApi.templates.getById(id!),
    enabled: !!id,
  });
}

export function useCreateDocumentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDocumentTemplatePayload) =>
      documentsApi.templates.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DOCUMENTS_KEYS.templates.all });
    },
  });
}

export function useUpdateDocumentTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateDocumentTemplatePayload) =>
      documentsApi.templates.update(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DOCUMENTS_KEYS.templates.detail(id) });
      void qc.invalidateQueries({ queryKey: DOCUMENTS_KEYS.templates.list() });
    },
  });
}

export function useDeleteDocumentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsApi.templates.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DOCUMENTS_KEYS.templates.all });
    },
  });
}

// ─── Employee Documents ───────────────────────────────────────────────────────

export function useEmployeeDocuments(
  employeeId: string | undefined,
  params?: ListEmployeeDocumentsParams,
) {
  return useQuery({
    queryKey: DOCUMENTS_KEYS.employeeDocuments.list(employeeId ?? '', params),
    queryFn: () => documentsApi.employeeDocuments.list(employeeId!, params),
    enabled: !!employeeId,
    staleTime: 60_000,
  });
}

export function useCreateEmployeeDocument(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEmployeeDocumentPayload) =>
      documentsApi.employeeDocuments.create(employeeId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: DOCUMENTS_KEYS.employeeDocuments.list(employeeId),
      });
    },
  });
}

export function useUpdateEmployeeDocument(
  employeeId: string,
  id: string,
  rowVersion?: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateEmployeeDocumentPayload) =>
      documentsApi.employeeDocuments.update(employeeId, id, payload, rowVersion),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: DOCUMENTS_KEYS.employeeDocuments.detail(id),
      });
      void qc.invalidateQueries({
        queryKey: DOCUMENTS_KEYS.employeeDocuments.list(employeeId),
      });
    },
  });
}

// ─── Onboarding Templates ─────────────────────────────────────────────────────

export function useOnboardingTemplates(params?: ListOnboardingTemplatesParams) {
  return useQuery({
    queryKey: DOCUMENTS_KEYS.onboardingTemplates.list(params),
    queryFn: () => documentsApi.onboardingTemplates.list(params),
    staleTime: 60_000,
  });
}

export function useOnboardingTemplate(id: string | undefined) {
  return useQuery({
    queryKey: DOCUMENTS_KEYS.onboardingTemplates.detail(id ?? ''),
    queryFn: () => documentsApi.onboardingTemplates.getById(id!),
    enabled: !!id,
  });
}

export function useCreateOnboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOnboardingTemplatePayload) =>
      documentsApi.onboardingTemplates.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: DOCUMENTS_KEYS.onboardingTemplates.all,
      });
    },
  });
}

export function useUpdateOnboardingTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateOnboardingTemplatePayload) =>
      documentsApi.onboardingTemplates.update(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: DOCUMENTS_KEYS.onboardingTemplates.detail(id),
      });
      void qc.invalidateQueries({
        queryKey: DOCUMENTS_KEYS.onboardingTemplates.list(),
      });
    },
  });
}

export function useDeleteOnboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsApi.onboardingTemplates.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: DOCUMENTS_KEYS.onboardingTemplates.all,
      });
    },
  });
}

export function useAddOnboardingTemplateTask(templateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOnboardingTemplateTaskPayload) =>
      documentsApi.onboardingTemplates.addTask(templateId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: DOCUMENTS_KEYS.onboardingTemplates.detail(templateId),
      });
    },
  });
}

// ─── Onboarding Instances ─────────────────────────────────────────────────────

export function useOnboardingInstances(params?: ListOnboardingInstancesParams) {
  return useQuery({
    queryKey: DOCUMENTS_KEYS.onboardingInstances.list(params),
    queryFn: () => documentsApi.onboardingInstances.list(params),
    staleTime: 60_000,
  });
}

export function useOnboardingInstance(id: string | undefined) {
  return useQuery({
    queryKey: DOCUMENTS_KEYS.onboardingInstances.detail(id ?? ''),
    queryFn: () => documentsApi.onboardingInstances.getById(id!),
    enabled: !!id,
  });
}

export function useCreateOnboardingInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOnboardingInstancePayload) =>
      documentsApi.onboardingInstances.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: DOCUMENTS_KEYS.onboardingInstances.all,
      });
    },
  });
}

export function useUpdateOnboardingInstanceTask(instanceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: string;
      payload: UpdateOnboardingInstanceTaskPayload;
    }) => documentsApi.onboardingInstances.updateTask(instanceId, taskId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: DOCUMENTS_KEYS.onboardingInstances.detail(instanceId),
      });
    },
  });
}

// ─── Document Requests ────────────────────────────────────────────────────────

export function useDocumentRequests(params?: ListDocumentRequestsParams) {
  return useQuery({
    queryKey: DOCUMENTS_KEYS.documentRequests.list(params),
    queryFn: () => documentsApi.documentRequests.list(params),
    staleTime: 60_000,
  });
}

export function useDocumentRequest(id: string | undefined) {
  return useQuery({
    queryKey: DOCUMENTS_KEYS.documentRequests.detail(id ?? ''),
    queryFn: () => documentsApi.documentRequests.getById(id!),
    enabled: !!id,
  });
}

export function useCreateDocumentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDocumentRequestPayload) =>
      documentsApi.documentRequests.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: DOCUMENTS_KEYS.documentRequests.all,
      });
    },
  });
}

export function useUpdateDocumentRequest(id: string, rowVersion?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateDocumentRequestPayload) =>
      documentsApi.documentRequests.update(id, payload, rowVersion),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: DOCUMENTS_KEYS.documentRequests.detail(id),
      });
      void qc.invalidateQueries({
        queryKey: DOCUMENTS_KEYS.documentRequests.list(),
      });
    },
  });
}

export function useUpdateDocumentRequestItem(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: string;
      payload: UpdateDocumentRequestItemPayload;
    }) => documentsApi.documentRequests.updateItem(requestId, itemId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: DOCUMENTS_KEYS.documentRequests.detail(requestId),
      });
    },
  });
}

export function useDocumentLibrary(params?: { page?: number; pageSize?: number; status?: string; search?: string; employeeId?: string }) {
  return useQuery({
    queryKey: DOCUMENTS_KEYS.library(params),
    queryFn: () => documentsApi.library.list(params),
    staleTime: 60_000,
  });
}

export function useApproveDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      documentsApi.library.approve(id, notes),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DOCUMENTS_KEYS.all });
    },
  });
}

export function useRejectDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      documentsApi.library.reject(id, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DOCUMENTS_KEYS.all });
    },
  });
}

export function useOnboardingDashboard() {
  return useQuery({
    queryKey: DOCUMENTS_KEYS.onboardingDashboard(),
    queryFn: () => documentsApi.onboardingDashboard.get(),
    staleTime: 60_000,
  });
}
