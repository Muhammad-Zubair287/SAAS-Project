export type OrgEntityStatus = 'ACTIVE' | 'INACTIVE';

export interface LegalEntity {
  id: string;
  tenantId: string;
  name: string;
  registrationNumber: string | null;
  countryCode: string;
  currencyCode: string;
  timezone: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  isPrimary: boolean;
  status: OrgEntityStatus;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
}

export interface Branch {
  id: string;
  tenantId: string;
  legalEntityId: string;
  name: string;
  code: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string;
  timezone: string;
  isHeadOffice: boolean;
  status: OrgEntityStatus;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
}

export interface Department {
  id: string;
  tenantId: string;
  legalEntityId: string;
  branchId: string | null;
  parentId: string | null;
  costCentreId: string | null;
  name: string;
  code: string;
  status: OrgEntityStatus;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
}

export interface CostCentre {
  id: string;
  tenantId: string;
  legalEntityId: string;
  code: string;
  name: string;
  description: string | null;
  status: OrgEntityStatus;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
}

export interface Position {
  id: string;
  tenantId: string;
  legalEntityId: string;
  departmentId: string | null;
  costCentreId: string | null;
  title: string;
  code: string;
  grade: string | null;
  description: string | null;
  isManager: boolean;
  status: OrgEntityStatus;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
}

// Payloads sent to the API
export interface CreateLegalEntityPayload {
  name: string;
  registrationNumber?: string;
  countryCode: string;
  currencyCode: string;
  timezone: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  isPrimary?: boolean;
}

export type UpdateLegalEntityPayload = Partial<CreateLegalEntityPayload>;

export interface CreateBranchPayload {
  legalEntityId: string;
  name: string;
  code: string;
  countryCode: string;
  timezone: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  isHeadOffice?: boolean;
}

export type UpdateBranchPayload = Partial<Omit<CreateBranchPayload, 'legalEntityId'>>;

export interface CreateDepartmentPayload {
  legalEntityId: string;
  branchId?: string;
  parentId?: string;
  costCentreId?: string;
  name: string;
  code: string;
}

export type UpdateDepartmentPayload = Partial<Omit<CreateDepartmentPayload, 'legalEntityId'>>;

export interface CreateCostCentrePayload {
  legalEntityId: string;
  code: string;
  name: string;
  description?: string;
}

export type UpdateCostCentrePayload = Partial<Omit<CreateCostCentrePayload, 'legalEntityId'>>;

export interface CreatePositionPayload {
  legalEntityId: string;
  departmentId?: string;
  costCentreId?: string;
  title: string;
  code: string;
  grade?: string;
  description?: string;
  isManager?: boolean;
}

export type UpdatePositionPayload = Partial<Omit<CreatePositionPayload, 'legalEntityId'>>;

export interface ListParams {
  page?: number;
  pageSize?: number;
  status?: OrgEntityStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  legalEntityId?: string;
  branchId?: string;
  departmentId?: string;
}

export interface OrganisationOverviewResponse {
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

export interface OrganisationHistoryEvent {
  id: string;
  entityType: string;
  entityId: string;
  changeType: string;
  previousValue: unknown;
  newValue: unknown;
  effectiveDate: string;
  changedBy: string | null;
  createdAt: string;
}

export interface Grade {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentTreeNode {
  id: string;
  name: string;
  code: string;
  status: string;
  parentId: string | null;
  legalEntityId: string;
  children: DepartmentTreeNode[];
}

export interface CreateGradePayload {
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateGradePayload {
  name?: string;
  description?: string;
  sortOrder?: number;
  status?: string;
}

export interface ListGradesParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}
