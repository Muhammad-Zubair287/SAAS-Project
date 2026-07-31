export class DepartmentResponseDto {
  id!: string;
  tenantId!: string;
  legalEntityId!: string;
  branchId!: string | null;
  parentId!: string | null;
  costCentreId!: string | null;
  name!: string;
  code!: string;
  status!: string;
  createdAt!: string;
  updatedAt!: string;
  rowVersion!: string;
}
