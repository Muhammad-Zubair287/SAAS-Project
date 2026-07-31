export class PersonalDetailResponseDto {
  id!: string;
  tenantId!: string;
  employeeId!: string;
  nationality!: string | null;
  countryOfBirth!: string | null;
  maritalStatus!: string | null;
  addressLine1!: string | null;
  addressLine2!: string | null;
  city!: string | null;
  stateProvince!: string | null;
  postalCode!: string | null;
  countryCode!: string | null;
  nextOfKinName!: string | null;
  nextOfKinRelationship!: string | null;
  nextOfKinPhone!: string | null;
  createdAt!: string;
  updatedAt!: string;
  rowVersion!: string;
}
