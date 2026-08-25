import { apiClient } from '../../../lib/api/client';
import type { ApiSuccessResponse } from '../../../lib/api/types';
import type {
  AdminPayslip,
  ListPayslipsParams,
  PayrollSummary,
  PublishPayslipPayload,
} from '../types/payroll.types';

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

/**
 * Admin payroll API.
 * - GET /payroll/payslips — admin list
 * - GET /payroll/summary — KPIs
 * - POST /payslips — publish (existing ESS admin endpoint)
 */
export const payrollApi = {
  summary: () =>
    apiClient
      .get<ApiSuccessResponse<PayrollSummary>>('/payroll/summary')
      .then((r) => r.data),

  payslips: {
    list: (params?: ListPayslipsParams) =>
      apiClient
        .get<PaginatedResponse<AdminPayslip>>('/payroll/payslips', { params })
        .then((r) => r.data),

    publish: (payload: PublishPayslipPayload) =>
      apiClient
        .post<ApiSuccessResponse<AdminPayslip> & { message?: string }>('/payslips', payload)
        .then((r) => r.data),
  },
};
