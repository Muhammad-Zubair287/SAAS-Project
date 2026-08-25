export interface PayrollEmployeeRef {
  id: string;
  displayName: string | null;
  employeeNumber: string | null;
}

export interface AdminPayslip {
  id: string;
  employeeId: string;
  employee: PayrollEmployeeRef;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  grossAmount: number;
  netAmount: number;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
}

export interface PayrollSummary {
  publishedCount: number;
  generatedCount: number;
  totalCount: number;
}

export interface ListPayslipsParams {
  page?: number;
  pageSize?: number;
  status?: string;
  employeeId?: string;
}

export interface PublishPayslipPayload {
  employeeId: string;
  payrollVersionId?: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  grossAmount: number;
  netAmount: number;
  earnings: unknown[];
  deductions: unknown[];
  documentFileKey?: string;
}
