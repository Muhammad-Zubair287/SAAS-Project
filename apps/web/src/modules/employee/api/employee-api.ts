import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';
import type {
  Employee,
  EmployeePersonalDetail,
  EmployeeEmploymentRecord,
  EmployeeTimelineEvent,
  EmployeeImportJob,
  EmployeeDataQualityResponse,
  CreateEmployeePayload,
  UpdateEmployeePayload,
  UpsertPersonalDetailPayload,
  TransferEmployeePayload,
  ChangeEmployeeStatusPayload,
  StartEmployeeImportPayload,
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

  lifecycle: {
    getEmployment: (employeeId: string) =>
      apiClient
        .get<ApiSuccessResponse<EmployeeEmploymentRecord>>(
          `${BASE}/${employeeId}/employment`,
        )
        .then((r) => r.data),

    getEmploymentHistory: (employeeId: string) =>
      apiClient
        .get<ApiSuccessResponse<EmployeeEmploymentRecord[]>>(
          `${BASE}/${employeeId}/employment-history`,
        )
        .then((r) => r.data),

    transfer: (employeeId: string, payload: TransferEmployeePayload) =>
      apiClient
        .post<ApiSuccessResponse<{ employment: EmployeeEmploymentRecord }>>(
          `${BASE}/${employeeId}/transfers`,
          payload,
        )
        .then((r) => r.data),

    changeStatus: (employeeId: string, payload: ChangeEmployeeStatusPayload) =>
      apiClient
        .post<
          ApiSuccessResponse<{
            id: string;
            status: string;
            statusReason: string | null;
            lastWorkingDate: string | null;
            accessDisableDate: string | null;
            terminationDate: string | null;
          }>
        >(`${BASE}/${employeeId}/status-changes`, payload)
        .then((r) => r.data),

    getTimeline: (employeeId: string) =>
      apiClient
        .get<ApiSuccessResponse<EmployeeTimelineEvent[]>>(`${BASE}/${employeeId}/history`)
        .then((r) => r.data),
  },

  imports: {
    start: (payload: StartEmployeeImportPayload) =>
      apiClient
        .post<ApiSuccessResponse<EmployeeImportJob>>('/imports/employees', payload)
        .then((r) => r.data),

    getById: (importId: string) =>
      apiClient
        .get<ApiSuccessResponse<EmployeeImportJob>>(`/imports/${importId}`)
        .then((r) => r.data),

    commit: (importId: string) =>
      apiClient
        .post<ApiSuccessResponse<EmployeeImportJob>>(`/imports/${importId}/commit`)
        .then((r) => r.data),
  },

  quality: {
    getSummary: () =>
      apiClient
        .get<ApiSuccessResponse<EmployeeDataQualityResponse>>('/employees/data-quality')
        .then((r) => r.data),
  },
};
