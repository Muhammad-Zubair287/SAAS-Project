import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';
import type {
  LegalEntity,
  Branch,
  Department,
  CostCentre,
  Position,
  CreateLegalEntityPayload,
  UpdateLegalEntityPayload,
  CreateBranchPayload,
  UpdateBranchPayload,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
  CreateCostCentrePayload,
  UpdateCostCentrePayload,
  CreatePositionPayload,
  UpdatePositionPayload,
  ListParams,
} from '../types/organisation.types';

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

const BASE = '';

export const organisationApi = {
  legalEntities: {
    create: (payload: CreateLegalEntityPayload) =>
      apiClient
        .post<ApiSuccessResponse<LegalEntity>>(`${BASE}/legal-entities`, payload)
        .then((r) => r.data),

    list: (params?: ListParams) =>
      apiClient
        .get<PaginatedResponse<LegalEntity>>(`${BASE}/legal-entities`, { params })
        .then((r) => r.data),

    getById: (id: string) =>
      apiClient
        .get<ApiSuccessResponse<LegalEntity>>(`${BASE}/legal-entities/${id}`)
        .then((r) => r.data),

    update: (id: string, payload: UpdateLegalEntityPayload, rowVersion?: string) =>
      apiClient
        .patch<ApiSuccessResponse<LegalEntity>>(`${BASE}/legal-entities/${id}`, payload, {
          headers: rowVersion ? { 'if-match': rowVersion } : {},
        })
        .then((r) => r.data),

    deactivate: (id: string) =>
      apiClient
        .delete<void>(`${BASE}/legal-entities/${id}`)
        .then(() => undefined),
  },

  branches: {
    create: (payload: CreateBranchPayload) =>
      apiClient
        .post<ApiSuccessResponse<Branch>>(`${BASE}/branches`, payload)
        .then((r) => r.data),

    list: (params?: ListParams) =>
      apiClient
        .get<PaginatedResponse<Branch>>(`${BASE}/branches`, { params })
        .then((r) => r.data),

    getById: (id: string) =>
      apiClient
        .get<ApiSuccessResponse<Branch>>(`${BASE}/branches/${id}`)
        .then((r) => r.data),

    update: (id: string, payload: UpdateBranchPayload, rowVersion?: string) =>
      apiClient
        .patch<ApiSuccessResponse<Branch>>(`${BASE}/branches/${id}`, payload, {
          headers: rowVersion ? { 'if-match': rowVersion } : {},
        })
        .then((r) => r.data),

    deactivate: (id: string) =>
      apiClient
        .delete<void>(`${BASE}/branches/${id}`)
        .then(() => undefined),
  },

  departments: {
    create: (payload: CreateDepartmentPayload) =>
      apiClient
        .post<ApiSuccessResponse<Department>>(`${BASE}/departments`, payload)
        .then((r) => r.data),

    list: (params?: ListParams) =>
      apiClient
        .get<PaginatedResponse<Department>>(`${BASE}/departments`, { params })
        .then((r) => r.data),

    getById: (id: string) =>
      apiClient
        .get<ApiSuccessResponse<Department>>(`${BASE}/departments/${id}`)
        .then((r) => r.data),

    update: (id: string, payload: UpdateDepartmentPayload, rowVersion?: string) =>
      apiClient
        .patch<ApiSuccessResponse<Department>>(`${BASE}/departments/${id}`, payload, {
          headers: rowVersion ? { 'if-match': rowVersion } : {},
        })
        .then((r) => r.data),

    deactivate: (id: string) =>
      apiClient
        .delete<void>(`${BASE}/departments/${id}`)
        .then(() => undefined),
  },

  costCentres: {
    create: (payload: CreateCostCentrePayload) =>
      apiClient
        .post<ApiSuccessResponse<CostCentre>>(`${BASE}/cost-centres`, payload)
        .then((r) => r.data),

    list: (params?: ListParams) =>
      apiClient
        .get<PaginatedResponse<CostCentre>>(`${BASE}/cost-centres`, { params })
        .then((r) => r.data),

    getById: (id: string) =>
      apiClient
        .get<ApiSuccessResponse<CostCentre>>(`${BASE}/cost-centres/${id}`)
        .then((r) => r.data),

    update: (id: string, payload: UpdateCostCentrePayload, rowVersion?: string) =>
      apiClient
        .patch<ApiSuccessResponse<CostCentre>>(`${BASE}/cost-centres/${id}`, payload, {
          headers: rowVersion ? { 'if-match': rowVersion } : {},
        })
        .then((r) => r.data),

    deactivate: (id: string) =>
      apiClient
        .delete<void>(`${BASE}/cost-centres/${id}`)
        .then(() => undefined),
  },

  positions: {
    create: (payload: CreatePositionPayload) =>
      apiClient
        .post<ApiSuccessResponse<Position>>(`${BASE}/positions`, payload)
        .then((r) => r.data),

    list: (params?: ListParams) =>
      apiClient
        .get<PaginatedResponse<Position>>(`${BASE}/positions`, { params })
        .then((r) => r.data),

    getById: (id: string) =>
      apiClient
        .get<ApiSuccessResponse<Position>>(`${BASE}/positions/${id}`)
        .then((r) => r.data),

    update: (id: string, payload: UpdatePositionPayload, rowVersion?: string) =>
      apiClient
        .patch<ApiSuccessResponse<Position>>(`${BASE}/positions/${id}`, payload, {
          headers: rowVersion ? { 'if-match': rowVersion } : {},
        })
        .then((r) => r.data),

    deactivate: (id: string) =>
      apiClient
        .delete<void>(`${BASE}/positions/${id}`)
        .then(() => undefined),
  },
};
