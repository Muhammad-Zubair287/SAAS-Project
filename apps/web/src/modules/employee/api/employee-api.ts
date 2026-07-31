import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';
import type {
  Employee,
  EmployeePersonalDetail,
  CreateEmployeePayload,
  UpdateEmployeePayload,
  UpsertPersonalDetailPayload,
  ListEmployeesParams,
} from '../types/employee.types';

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

const BASE = '/employees';

export const employeeApi = {
  employees: {
    create: (payload: CreateEmployeePayload) =>
      apiClient
        .post<ApiSuccessResponse<Employee>>(BASE, payload)
        .then((r) => r.data),

    list: (params?: ListEmployeesParams) =>
      apiClient
        .get<PaginatedResponse<Employee>>(BASE, { params })
        .then((r) => r.data),

    getById: (id: string) =>
      apiClient
        .get<ApiSuccessResponse<Employee>>(`${BASE}/${id}`)
        .then((r) => r.data),

    update: (id: string, payload: UpdateEmployeePayload, rowVersion?: string) =>
      apiClient
        .patch<ApiSuccessResponse<Employee>>(`${BASE}/${id}`, payload, {
          headers: rowVersion ? { 'if-match': rowVersion } : {},
        })
        .then((r) => r.data),

    deactivate: (id: string) =>
      apiClient
        .delete<void>(`${BASE}/${id}`)
        .then(() => undefined),
  },

  personalDetails: {
    upsert: (employeeId: string, payload: UpsertPersonalDetailPayload) =>
      apiClient
        .put<ApiSuccessResponse<EmployeePersonalDetail>>(
          `${BASE}/${employeeId}/personal-details`,
          payload,
        )
        .then((r) => r.data),

    get: (employeeId: string) =>
      apiClient
        .get<ApiSuccessResponse<EmployeePersonalDetail>>(
          `${BASE}/${employeeId}/personal-details`,
        )
        .then((r) => r.data),
  },
};
