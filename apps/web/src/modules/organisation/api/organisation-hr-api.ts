import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';

export interface OrgOverview {
  counts: {
    legalEntities: number;
    branches: number;
    departments: number;
    positions: number;
    grades: number;
    activeEmployees: number;
    unassignedEmployees: number;
  };
  incompleteStructure: boolean;
  generatedAt: string;
}

export interface Grade {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  status: string;
}

export const organisationHrApi = {
  overview: () =>
    apiClient
      .get<ApiSuccessResponse<OrgOverview>>('/organisation/overview')
      .then((r) => r.data),
  history: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get('/organisation/history', { params }).then((r) => r.data),
  departmentTree: (legalEntityId?: string) =>
    apiClient
      .get('/departments/tree', { params: legalEntityId ? { legalEntityId } : undefined })
      .then((r) => r.data),
  grades: {
    list: (params?: { page?: number; pageSize?: number; search?: string }) =>
      apiClient.get('/grades', { params }).then((r) => r.data),
    create: (payload: { code: string; name: string; description?: string; sortOrder?: number }) =>
      apiClient.post<ApiSuccessResponse<Grade>>('/grades', payload).then((r) => r.data),
  },
};
