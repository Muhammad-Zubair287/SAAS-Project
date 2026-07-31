export class BranchResponseDto {
  id!: string;
  tenantId!: string;
  legalEntityId!: string;
  name!: string;
  code!: string;
  addressLine1!: string | null;
  addressLine2!: string | null;
  city!: string | null;
  stateProvince!: string | null;
  postalCode!: string | null;
  countryCode!: string;
  timezone!: string;
  isHeadOffice!: boolean;
  status!: string;
  createdAt!: string;
  updatedAt!: string;
  rowVersion!: string;
}
