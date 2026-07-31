import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';
import type {
  DocumentTemplate,
  CreateDocumentTemplatePayload,
  UpdateDocumentTemplatePayload,
  ListDocumentTemplatesParams,
  EmployeeDocument,
  CreateEmployeeDocumentPayload,
  UpdateEmployeeDocumentPayload,
  ListEmployeeDocumentsParams,
  OnboardingTemplate,
  CreateOnboardingTemplatePayload,
  UpdateOnboardingTemplatePayload,
  CreateOnboardingTemplateTaskPayload,
  OnboardingTemplateTask,
  ListOnboardingTemplatesParams,
  OnboardingInstance,
  CreateOnboardingInstancePayload,
  UpdateOnboardingInstanceTaskPayload,
  OnboardingInstanceTask,
  ListOnboardingInstancesParams,
  DocumentRequest,
  CreateDocumentRequestPayload,
  UpdateDocumentRequestPayload,
  UpdateDocumentRequestItemPayload,
  DocumentRequestItem,
  ListDocumentRequestsParams,
} from '../types/documents.types';

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  timestamp: string;
}

export const documentsApi = {
  // ── Document Templates ────────────────────────────────────────────────────
  templates: {
    create: (payload: CreateDocumentTemplatePayload) =>
      apiClient
        .post<ApiSuccessResponse<DocumentTemplate>>('/document-templates', payload)
        .then((r) => r.data),

    list: (params?: ListDocumentTemplatesParams) =>
      apiClient
        .get<PaginatedResponse<DocumentTemplate>>('/document-templates', { params })
        .then((r) => r.data),

    getById: (id: string) =>
      apiClient
        .get<ApiSuccessResponse<DocumentTemplate>>(`/document-templates/${id}`)
        .then((r) => r.data),

    update: (id: string, payload: UpdateDocumentTemplatePayload) =>
      apiClient
        .patch<ApiSuccessResponse<DocumentTemplate>>(`/document-templates/${id}`, payload)
        .then((r) => r.data),

    delete: (id: string) =>
      apiClient.delete<void>(`/document-templates/${id}`).then(() => undefined),
  },

  // ── Employee Documents ────────────────────────────────────────────────────
  employeeDocuments: {
    create: (employeeId: string, payload: CreateEmployeeDocumentPayload) =>
      apiClient
        .post<ApiSuccessResponse<EmployeeDocument>>(
          `/employees/${employeeId}/documents`,
          payload,
        )
        .then((r) => r.data),

    list: (employeeId: string, params?: ListEmployeeDocumentsParams) =>
      apiClient
        .get<PaginatedResponse<EmployeeDocument>>(
          `/employees/${employeeId}/documents`,
          { params },
        )
        .then((r) => r.data),

    getById: (employeeId: string, id: string) =>
      apiClient
        .get<ApiSuccessResponse<EmployeeDocument>>(
          `/employees/${employeeId}/documents/${id}`,
        )
        .then((r) => r.data),

    update: (
      employeeId: string,
      id: string,
      payload: UpdateEmployeeDocumentPayload,
      rowVersion?: string,
    ) =>
      apiClient
        .patch<ApiSuccessResponse<EmployeeDocument>>(
          `/employees/${employeeId}/documents/${id}`,
          payload,
          { headers: rowVersion ? { 'if-match': rowVersion } : {} },
        )
        .then((r) => r.data),

    delete: (employeeId: string, id: string) =>
      apiClient
        .delete<void>(`/employees/${employeeId}/documents/${id}`)
        .then(() => undefined),
  },

  // ── Onboarding Templates ──────────────────────────────────────────────────
  onboardingTemplates: {
    create: (payload: CreateOnboardingTemplatePayload) =>
      apiClient
        .post<ApiSuccessResponse<OnboardingTemplate>>('/onboarding-templates', payload)
        .then((r) => r.data),

    list: (params?: ListOnboardingTemplatesParams) =>
      apiClient
        .get<PaginatedResponse<OnboardingTemplate>>('/onboarding-templates', { params })
        .then((r) => r.data),

    getById: (id: string) =>
      apiClient
        .get<ApiSuccessResponse<OnboardingTemplate>>(`/onboarding-templates/${id}`)
        .then((r) => r.data),

    update: (id: string, payload: UpdateOnboardingTemplatePayload) =>
      apiClient
        .patch<ApiSuccessResponse<OnboardingTemplate>>(
          `/onboarding-templates/${id}`,
          payload,
        )
        .then((r) => r.data),

    delete: (id: string) =>
      apiClient
        .delete<void>(`/onboarding-templates/${id}`)
        .then(() => undefined),

    addTask: (id: string, payload: CreateOnboardingTemplateTaskPayload) =>
      apiClient
        .post<ApiSuccessResponse<OnboardingTemplateTask>>(
          `/onboarding-templates/${id}/tasks`,
          payload,
        )
        .then((r) => r.data),

    deleteTask: (id: string, taskId: string) =>
      apiClient
        .delete<void>(`/onboarding-templates/${id}/tasks/${taskId}`)
        .then(() => undefined),
  },

  // ── Onboarding Instances ──────────────────────────────────────────────────
  onboardingInstances: {
    create: (payload: CreateOnboardingInstancePayload) =>
      apiClient
        .post<ApiSuccessResponse<OnboardingInstance>>('/onboarding-instances', payload)
        .then((r) => r.data),

    list: (params?: ListOnboardingInstancesParams) =>
      apiClient
        .get<PaginatedResponse<OnboardingInstance>>('/onboarding-instances', { params })
        .then((r) => r.data),

    getById: (id: string) =>
      apiClient
        .get<ApiSuccessResponse<OnboardingInstance>>(`/onboarding-instances/${id}`)
        .then((r) => r.data),

    updateTask: (
      id: string,
      taskId: string,
      payload: UpdateOnboardingInstanceTaskPayload,
    ) =>
      apiClient
        .patch<ApiSuccessResponse<OnboardingInstanceTask>>(
          `/onboarding-instances/${id}/tasks/${taskId}`,
          payload,
        )
        .then((r) => r.data),
  },

  // ── Document Requests ─────────────────────────────────────────────────────
  documentRequests: {
    create: (payload: CreateDocumentRequestPayload) =>
      apiClient
        .post<ApiSuccessResponse<DocumentRequest>>('/document-requests', payload)
        .then((r) => r.data),

    list: (params?: ListDocumentRequestsParams) =>
      apiClient
        .get<PaginatedResponse<DocumentRequest>>('/document-requests', { params })
        .then((r) => r.data),

    getById: (id: string) =>
      apiClient
        .get<ApiSuccessResponse<DocumentRequest>>(`/document-requests/${id}`)
        .then((r) => r.data),

    update: (id: string, payload: UpdateDocumentRequestPayload, rowVersion?: string) =>
      apiClient
        .patch<ApiSuccessResponse<DocumentRequest>>(
          `/document-requests/${id}`,
          payload,
          { headers: rowVersion ? { 'if-match': rowVersion } : {} },
        )
        .then((r) => r.data),

    updateItem: (
      id: string,
      itemId: string,
      payload: UpdateDocumentRequestItemPayload,
    ) =>
      apiClient
        .patch<ApiSuccessResponse<DocumentRequestItem>>(
          `/document-requests/${id}/items/${itemId}`,
          payload,
        )
        .then((r) => r.data),
  },
};
