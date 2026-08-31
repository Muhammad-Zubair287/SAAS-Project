import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  HOSTING_REGION_PATTERN,
  INTERNATIONAL_PHONE_PATTERN,
  ISO_DATE_PATTERN,
  LOCALE_PATTERN,
  ORGANIZATION_NAME_PATTERN,
  OTP_CODE_PATTERN,
  PERSON_NAME_PATTERN,
  PLAN_KEY_PATTERN,
  TIMEZONE_PATTERN,
} from '../../../common/validation/input-security.constants';
import { normalizeEmail, trimOptionalString, trimString } from '../../../common/validation/sanitize.transform';
import { IsSafeText } from '../../../common/validation/validators';

/** API-TEN-001 primaryAdmin object */
export class PrimaryAdminDto {
  @ApiProperty({ example: 'Ayesha Khan', maxLength: 160 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  @MinLength(2)
  @Matches(PERSON_NAME_PATTERN, {
    message: 'name must contain only letters and allowed name characters',
  })
  @IsSafeText()
  name!: string;

  @ApiProperty({ example: 'ayesha.khan@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  @IsSafeText()
  email!: string;

  @ApiPropertyOptional({ example: '+923001234567' })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(16)
  @Matches(INTERNATIONAL_PHONE_PATTERN, {
    message: 'phone must be digits only with an optional leading + for country code',
  })
  phone?: string;
}

/**
 * API-TEN-001 — Create Tenant request contract.
 * Field names match API Specification §14 exactly.
 */
export class CreateTenantDto {
  @ApiProperty({ example: 'Northstar Textiles', maxLength: 160 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  @MinLength(2)
  @Matches(ORGANIZATION_NAME_PATTERN, {
    message: 'displayName must contain only allowed business name characters',
  })
  @IsSafeText()
  displayName!: string;

  @ApiProperty({ example: 'Northstar Textiles (Private) Limited', maxLength: 200 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @MinLength(2)
  @Matches(ORGANIZATION_NAME_PATTERN, {
    message: 'legalName must contain only allowed business name characters',
  })
  @IsSafeText()
  legalName!: string;

  @ApiProperty({ example: 'PK' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(2)
  @Matches(/^[A-Z]{2}$/)
  countryCode!: string;

  @ApiProperty({ example: 'PKR' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(3)
  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @ApiProperty({ example: 'Asia/Karachi' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(TIMEZONE_PATTERN, { message: 'timeZone contains invalid characters' })
  @IsSafeText()
  timeZone!: string;

  @ApiProperty({ example: 'en-PK' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(LOCALE_PATTERN, { message: 'primaryLocale must be a valid locale code' })
  primaryLocale!: string;

  @ApiProperty({ example: 'aws-ap-south-1', description: 'Approved platform region key' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(HOSTING_REGION_PATTERN, { message: 'hostingRegion must be a lowercase region key' })
  hostingRegion!: string;

  @ApiProperty({ example: 'growth' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @Matches(PLAN_KEY_PATTERN, { message: 'planKey must be a lowercase slug' })
  planKey!: string;

  @ApiProperty({ example: 350, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  seatLimit!: number;

  @ApiProperty({ type: PrimaryAdminDto })
  @IsObject()
  @ValidateNested()
  @Type(() => PrimaryAdminDto)
  primaryAdmin!: PrimaryAdminDto;

  /** UX SCR-PLT-03 Step 2 — billing cycle (wizard field; persisted on subscription). */
  @ApiPropertyOptional({ example: 'monthly', enum: ['monthly', 'annual'] })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Matches(/^(monthly|annual)$/)
  billingCycle?: string;

  /** UX SCR-PLT-03 Step 2 — trial expiry when trial status is on. */
  @ApiPropertyOptional({ example: '2026-09-30' })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_PATTERN, { message: 'trialEndsAt must be YYYY-MM-DD' })
  trialEndsAt?: string;

  /** UX SCR-PLT-03 Step 2 — storage limit in GB. */
  @ApiPropertyOptional({ example: 100, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  storageLimitGb?: number;

  /** UX SCR-PLT-03 Save Draft vs Create and Send Invitation. */
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : value === true || value === 'true'))
  @IsBoolean()
  sendInvitation?: boolean;

  /** API security note — MFA step-up for tenant creation. */
  @ApiPropertyOptional()
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Matches(OTP_CODE_PATTERN, { message: 'mfaCode must be 6 to 8 digits' })
  mfaCode?: string;
}
