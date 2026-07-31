export class LegalEntityResponseDto {
  id!: string;
  tenantId!: string;
  name!: string;
  registrationNumber!: string | null;
  countryCode!: string;
  currencyCode!: string;
  timezone!: string;
  addressLine1!: string | null;
  addressLine2!: string | null;
  city!: string | null;
  stateProvince!: string | null;
  postalCode!: string | null;
  isPrimary!: boolean;
  status!: string;
  createdAt!: string;
  updatedAt!: string;
  rowVersion!: string;
}
