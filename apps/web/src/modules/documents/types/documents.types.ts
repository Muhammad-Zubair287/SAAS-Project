// ─── Document Status ──────────────────────────────────────────────────────────

export type DocumentStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REJECTED';

export type DocumentRequestStatus =
  | 'PENDING'
  | 'PARTIAL'
  | 'COMPLETED'
  | 'CANCELLED';

export type DocumentRequestItemStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED';

export type OnboardingStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type OnboardingTaskStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED';

export type TaskType =
  | 'DOCUMENT_REQUEST'
  | 'FORM'
  | 'MANUAL'
  | 'SYSTEM';

export type EsignStatus =
  | 'PENDING'
  | 'SIGNED'
  | 'DECLINED'
  | 'EXPIRED';

// ─── Document Template ────────────────────────────────────────────────────────

export interface DocumentTemplate {
  id: string;
  tenantId: string;
  type: string;
  name: string;
  description: string | null;
  isRequired: boolean;
  expiryMonths: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
}

export interface CreateDocumentTemplatePayload {
  type: string;
  name: string;
  description?: string;
  isRequired?: boolean;
  expiryMonths?: number;
  isActive?: boolean;
}

export interface UpdateDocumentTemplatePayload {
  type?: string;
  name?: string;
  description?: string;
  isRequired?: boolean;
  expiryMonths?: number;
  isActive?: boolean;
}

export interface ListDocumentTemplatesParams {
  page?: number;
  pageSize?: number;
  status?: string;
  documentType?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── Employee Document ────────────────────────────────────────────────────────

export interface EmployeeDocument {
  id: string;
  tenantId: string;
  employeeId: string;
  templateId: string | null;
  documentType: string;
  title: string;
  fileKey: string | null;
  fileSize: number | null;
  mimeType: string | null;
  expiryDate: string | null;
  issuedDate: string | null;
  issuedBy: string | null;
  status: DocumentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
}

export interface CreateEmployeeDocumentPayload {
  templateId?: string;
  documentType: string;
  title: string;
  fileKey?: string;
  fileSize?: number;
  mimeType?: string;
  expiryDate?: string;
  issuedDate?: string;
  issuedBy?: string;
  notes?: string;
}

export interface UpdateEmployeeDocumentPayload {
  documentType?: string;
  title?: string;
  fileKey?: string;
  fileSize?: number;
  mimeType?: string;
  expiryDate?: string;
  issuedDate?: string;
  issuedBy?: string;
  status?: DocumentStatus;
  notes?: string;
}

export interface ListEmployeeDocumentsParams {
  page?: number;
  pageSize?: number;
  status?: DocumentStatus | '';
  documentType?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── Onboarding Template ─────────────────────────────────────────────────────

export interface OnboardingTemplateTask {
  id: string;
  tenantId: string;
  onboardingTemplateId: string;
  title: string;
  description: string | null;
  taskType: TaskType;
  sortOrder: number;
  isRequired: boolean;
  dueDays: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingTemplate {
  id: string;
  tenantId: string;
  legalEntityId: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
  tasks?: OnboardingTemplateTask[];
}

export interface CreateOnboardingTemplatePayload {
  legalEntityId?: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateOnboardingTemplatePayload {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateOnboardingTemplateTaskPayload {
  title: string;
  description?: string;
  taskType: TaskType;
  sortOrder?: number;
  isRequired?: boolean;
  dueDays?: number;
}

export interface ListOnboardingTemplatesParams {
  page?: number;
  pageSize?: number;
  legalEntityId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── Onboarding Instance ──────────────────────────────────────────────────────

export interface OnboardingInstanceTask {
  id: string;
  tenantId: string;
  onboardingInstanceId: string;
  templateTaskId: string | null;
  title: string;
  taskType: TaskType;
  isRequired: boolean;
  status: OnboardingTaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  completedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
}

export interface OnboardingInstance {
  id: string;
  tenantId: string;
  employeeId: string;
  onboardingTemplateId: string | null;
  title: string;
  status: OnboardingStatus;
  startedAt: string | null;
  completedAt: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
  tasks?: OnboardingInstanceTask[];
}

export interface CreateOnboardingInstancePayload {
  employeeId: string;
  onboardingTemplateId?: string;
  title: string;
  dueDate?: string;
}

export interface UpdateOnboardingInstanceTaskPayload {
  status: OnboardingTaskStatus;
  notes?: string;
}

export interface ListOnboardingInstancesParams {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  status?: OnboardingStatus | '';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── Document Request ─────────────────────────────────────────────────────────

export interface DocumentRequestItem {
  id: string;
  tenantId: string;
  documentRequestId: string;
  documentTemplateId: string | null;
  title: string;
  isRequired: boolean;
  employeeDocumentId: string | null;
  status: DocumentRequestItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRequest {
  id: string;
  tenantId: string;
  employeeId: string;
  requestedBy: string;
  title: string;
  message: string | null;
  dueDate: string | null;
  status: DocumentRequestStatus;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
  items?: DocumentRequestItem[];
}

export interface DocumentRequestItemPayload {
  documentTemplateId?: string;
  title: string;
  isRequired?: boolean;
}

export interface CreateDocumentRequestPayload {
  employeeId: string;
  title: string;
  message?: string;
  dueDate?: string;
  items?: DocumentRequestItemPayload[];
}

export interface UpdateDocumentRequestPayload {
  status?: DocumentRequestStatus;
}

export interface UpdateDocumentRequestItemPayload {
  employeeDocumentId?: string;
  status?: DocumentRequestItemStatus;
}

export interface ListDocumentRequestsParams {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  status?: DocumentRequestStatus | '';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OnboardingDashboardResponse {
  employeesOnboarding: number;
  completionPercentage: number;
  overdueTasks: number;
  documentsPendingReview: number;
  employeesAwaitingActivation: number;
  upcomingJoiningDates: number;
  generatedAt: string;
}
