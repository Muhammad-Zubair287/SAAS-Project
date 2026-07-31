export class CostCentreResponseDto {
  id!: string;
  tenantId!: string;
  legalEntityId!: string;
  code!: string;
  name!: string;
  description!: string | null;
  status!: string;
  createdAt!: string;
  updatedAt!: string;
  rowVersion!: string;
}
