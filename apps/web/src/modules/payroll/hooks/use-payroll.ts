'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { maybeToastSuccess, toastApiError } from '../../../lib/api/toast-api';
import { payrollApi } from '../api/payroll-api';
import type { ListPayslipsParams, PublishPayslipPayload } from '../types/payroll.types';

export const PAYROLL_KEYS = {
  all: ['payroll'] as const,
  summary: () => [...PAYROLL_KEYS.all, 'summary'] as const,
  payslips: (params?: ListPayslipsParams) => [...PAYROLL_KEYS.all, 'payslips', params] as const,
};

export function usePayrollSummary() {
  return useQuery({
    queryKey: PAYROLL_KEYS.summary(),
    queryFn: () => payrollApi.summary(),
  });
}

export function useAdminPayslips(params?: ListPayslipsParams) {
  return useQuery({
    queryKey: PAYROLL_KEYS.payslips(params),
    queryFn: () => payrollApi.payslips.list(params),
  });
}

export function usePublishPayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PublishPayslipPayload) => payrollApi.payslips.publish(payload),
    onSuccess: (res) => {
      maybeToastSuccess(res);
      void qc.invalidateQueries({ queryKey: PAYROLL_KEYS.all });
    },
    onError: (err) => toastApiError(err, 'Request failed'),
  });
}
