export class PositionResponseDto {
  id!: string;
  tenantId!: string;
  legalEntityId!: string;
  departmentId!: string | null;
  costCentreId!: string | null;
  title!: string;
  code!: string;
  grade!: string | null;
  description!: string | null;
  isManager!: boolean;
  status!: string;
  createdAt!: string;
  updatedAt!: string;
  rowVersion!: string;
}
