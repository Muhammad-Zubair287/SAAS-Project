export type EmployeeStatus =
  | 'ACTIVE'
  | 'PROBATION'
  | 'ON_LEAVE'
  | 'INACTIVE'
  | 'TERMINATED';

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'INTERN';

export type EmployeeGender =
  | 'MALE'
  | 'FEMALE'
  | 'OTHER'
  | 'UNDISCLOSED';

export type MaritalStatus =
  | 'SINGLE'
  | 'MARRIED'
  | 'DIVORCED'
  | 'WIDOWED'
  | 'SEPARATED'
  | 'UNDISCLOSED';

export interface Employee {
  id: string;
  tenantId: string;
  legalEntityId: string;
  branchId: string | null;
  departmentId: string | null;
  positionId: string | null;
  managerId: string | null;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  displayName: string;
  gender: EmployeeGender | null;
  dateOfBirth: string | null;
  nationalId: string | null;
  emailWork: string;
  emailPersonal: string | null;
  phoneWork: string | null;
  phoneMobile: string | null;
  hireDate: string;
  terminationDate: string | null;
  status: EmployeeStatus;
  employmentType: EmploymentType;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
}

export interface EmployeePersonalDetail {
  id: string;
  tenantId: string;
  employeeId: string;
  nationality: string | null;
  countryOfBirth: string | null;
  maritalStatus: MaritalStatus | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
  nextOfKinName: string | null;
  nextOfKinRelationship: string | null;
  nextOfKinPhone: string | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
}

export interface CreateEmployeePayload {
  legalEntityId: string;
  branchId?: string;
  departmentId?: string;
  positionId?: string;
  managerId?: string;
  firstName: string;
  lastName: string;
  gender?: EmployeeGender;
  dateOfBirth?: string;
  nationalId?: string;
  emailWork: string;
  emailPersonal?: string;
  phoneWork?: string;
  phoneMobile?: string;
  hireDate: string;
  employmentType: EmploymentType;
}

export interface UpdateEmployeePayload {
  branchId?: string;
  departmentId?: string;
  positionId?: string;
  managerId?: string;
  firstName?: string;
  lastName?: string;
  gender?: EmployeeGender;
  emailWork?: string;
  emailPersonal?: string;
  phoneWork?: string;
  phoneMobile?: string;
  employmentType?: EmploymentType;
  status?: EmployeeStatus;
}

export interface UpsertPersonalDetailPayload {
  nationality?: string;
  countryOfBirth?: string;
  maritalStatus?: MaritalStatus;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  countryCode?: string;
  nextOfKinName?: string;
  nextOfKinRelationship?: string;
  nextOfKinPhone?: string;
}

export interface ListEmployeesParams {
  page?: number;
  pageSize?: number;
  status?: EmployeeStatus | '';
  employmentType?: EmploymentType | '';
  legalEntityId?: string;
  branchId?: string;
  departmentId?: string;
  managerId?: string;
  positionId?: string;
  gradeId?: string;
  hireDateFrom?: string;
  hireDateTo?: string;
  legalEntityName?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EmployeeEmploymentRecord {
  id: string;
  employeeId: string;
  legalEntityId: string;
  branchId: string | null;
  departmentId: string | null;
  positionId: string | null;
  managerId: string | null;
  costCentreId: string | null;
  gradeId: string | null;
  employmentType: string;
  workArrangement: string | null;
  probationEndDate: string | null;
  changeReason: string | null;
  changeType: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface TransferEmployeePayload {
  legalEntityId?: string;
  branchId?: string | null;
  departmentId?: string | null;
  positionId?: string | null;
  managerId?: string | null;
  costCentreId?: string | null;
  gradeId?: string | null;
  effectiveDate: string;
  reason?: string;
}

export interface ChangeEmployeeStatusPayload {
  status: string;
  effectiveDate: string;
  reason?: string;
  lastWorkingDate?: string;
  accessDisableDate?: string;
  notes?: string;
}

export interface EmployeeTimelineEvent {
  id: string;
  eventType: string;
  summary: string;
  metadata: unknown;
  occurredAt: string;
  actorId: string;
  visibility: string;
}

export interface EmployeeImportRow {
  id: string;
  rowNumber: number;
  status: string;
  errors?: string[];
  warnings?: string[];
  payload: Record<string, unknown>;
  employeeId?: string | null;
}

export interface EmployeeImportJob {
  id: string;
  status: string;
  fileName: string | null;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  committedRows: number;
  createdAt: string;
  validatedAt: string | null;
  committedAt: string | null;
  rows?: EmployeeImportRow[];
}

export interface StartEmployeeImportPayload {
  fileName?: string;
  rows: Record<string, unknown>[];
}

export interface EmployeeDataQualityResponse {
  totals: {
    activeEmployees: number;
    missingManager: number;
    missingDepartment: number;
    missingShift: number;
    missingMandatoryFields: number;
    missingCompensation: number;
    inactiveStructureAssignments: number;
    duplicateIdentifiers: number;
    expiredDocuments: number;
  };
  samples: {
    missingManager: string[];
    missingDepartment: string[];
    missingShift: string[];
    missingMandatoryFields: string[];
    missingCompensation: string[];
  };
}
