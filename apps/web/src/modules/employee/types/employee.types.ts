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
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
