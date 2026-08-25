import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateTenantProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  registrationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  industry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  employeeSizeBand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  stateProvince?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'PK' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  countryCode?: string;

  @ApiPropertyOptional({ example: 'PKR' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  baseCurrency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  defaultTimezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  financialYearStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  payrollMonthConfig?: string;
}

export class TenantProfileResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty() legalName!: string;
  @ApiProperty() countryCode!: string;
  @ApiProperty() baseCurrency!: string;
  @ApiProperty() defaultTimezone!: string;
  @ApiProperty() defaultLocale!: string;
  @ApiPropertyOptional() registrationNumber?: string | null;
  @ApiPropertyOptional() industry?: string | null;
  @ApiPropertyOptional() employeeSizeBand?: string | null;
  @ApiPropertyOptional() addressLine1?: string | null;
  @ApiPropertyOptional() addressLine2?: string | null;
  @ApiPropertyOptional() city?: string | null;
  @ApiPropertyOptional() stateProvince?: string | null;
  @ApiPropertyOptional() postalCode?: string | null;
  @ApiPropertyOptional() contactEmail?: string | null;
  @ApiPropertyOptional() contactPhone?: string | null;
  @ApiPropertyOptional() financialYearStart?: string | null;
  @ApiPropertyOptional() payrollMonthConfig?: string | null;
  @ApiPropertyOptional() logoUrl?: string | null;
}

export class UpdateTenantBrandingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  loginLogoUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  faviconUrl?: string | null;

  @ApiPropertyOptional({ example: '#0F766E' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  primaryColor?: string | null;

  @ApiPropertyOptional({ example: '#134E4A' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  secondaryColor?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  applicationName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  emailSenderName?: string | null;
}

export class TenantBrandingResponseDto {
  @ApiProperty() tenantId!: string;
  @ApiPropertyOptional() logoUrl?: string | null;
  @ApiPropertyOptional() loginLogoUrl?: string | null;
  @ApiPropertyOptional() faviconUrl?: string | null;
  @ApiPropertyOptional() primaryColor?: string | null;
  @ApiPropertyOptional() secondaryColor?: string | null;
  @ApiPropertyOptional() applicationName?: string | null;
  @ApiPropertyOptional() emailSenderName?: string | null;
  @ApiPropertyOptional({ type: [String] }) contrastWarnings?: string[];
}

export class UpdateTenantRegionalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  defaultLocale?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  enabledLocales?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  dateFormat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  numberFormat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  currencyDisplay?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  defaultTimezone?: string;

  @ApiPropertyOptional({ description: '0=Sunday … 6=Saturday' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekStart?: number;

  @ApiPropertyOptional({ type: [Boolean] })
  @IsOptional()
  workingWeekPattern?: boolean[];
}

export class TenantRegionalResponseDto {
  @ApiProperty() defaultLocale!: string;
  @ApiProperty({ type: [String] }) enabledLocales!: string[];
  @ApiPropertyOptional() dateFormat?: string | null;
  @ApiPropertyOptional() numberFormat?: string | null;
  @ApiPropertyOptional() currencyDisplay?: string | null;
  @ApiProperty() defaultTimezone!: string;
  @ApiPropertyOptional() weekStart?: number | null;
  @ApiPropertyOptional({ type: [Boolean] }) workingWeekPattern?: boolean[] | null;
}

export class UpdateTenantSecurityPolicyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(8)
  @Max(128)
  passwordMinLength?: number;

  @ApiPropertyOptional()
  @IsOptional()
  passwordRequireUpper?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  passwordRequireLower?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  passwordRequireDigit?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  passwordRequireSymbol?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  mfaRequiredForAdmins?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  sessionTtlHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxLoginAttempts?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  trustedEmailDomains?: string[];
}

export class TenantSecurityPolicyResponseDto {
  @ApiProperty() passwordMinLength!: number;
  @ApiProperty() passwordRequireUpper!: boolean;
  @ApiProperty() passwordRequireLower!: boolean;
  @ApiProperty() passwordRequireDigit!: boolean;
  @ApiProperty() passwordRequireSymbol!: boolean;
  @ApiProperty() mfaRequiredForAdmins!: boolean;
  @ApiProperty() sessionTtlHours!: number;
  @ApiProperty() maxLoginAttempts!: number;
  @ApiProperty({ type: [String] }) trustedEmailDomains!: string[];
}

export class CreateUpgradeRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  requestedPlanId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  requestedPlanKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  billingContactEmail?: string;
}
