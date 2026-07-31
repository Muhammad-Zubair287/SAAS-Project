export class EmployeeResponseDto {
  id!: string;
  tenantId!: string;
  legalEntityId!: string;
  branchId!: string | null;
  departmentId!: string | null;
  positionId!: string | null;
  managerId!: string | null;
  employeeNumber!: string;
  firstName!: string;
  lastName!: string;
  displayName!: string;
  gender!: string | null;
  dateOfBirth!: string | null;
  nationalId!: string | null;
  emailWork!: string;
  emailPersonal!: string | null;
  phoneWork!: string | null;
  phoneMobile!: string | null;
  hireDate!: string;
  terminationDate!: string | null;
  status!: string;
  employmentType!: string;
  createdAt!: string;
  updatedAt!: string;
  rowVersion!: string;
}
