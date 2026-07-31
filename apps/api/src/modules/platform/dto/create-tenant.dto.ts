import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PrimaryAdminDto {
  @ApiProperty({ example: 'Sarah Khan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: 'sarah.khan@northstar.com' })
  @IsEmail()
  email!: string;
}

export class CreateTenantDto {
  @ApiProperty({ example: 'Northstar Textiles', maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  displayName!: string;

  @ApiProperty({ example: 'Northstar Textiles (Pvt) Ltd', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  legalName!: string;

  @ApiProperty({ example: 'PK', description: 'ISO 3166-1 alpha-2 country code' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(2)
  @Matches(/^[A-Z]{2}$/, { message: 'countryCode must be a 2-letter uppercase ISO code' })
  countryCode!: string;

  @ApiProperty({ example: 'PKR', description: 'ISO 4217 currency code' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(3)
  @Matches(/^[A-Z]{3}$/, { message: 'baseCurrency must be a 3-letter uppercase ISO code' })
  baseCurrency!: string;

  @ApiProperty({ example: 'Asia/Karachi', description: 'IANA time-zone identifier' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  defaultTimezone!: string;

  @ApiProperty({ example: 'en-PK', description: 'BCP 47 locale' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  defaultLocale!: string;

  @ApiProperty({ example: 'a1b2c3d4-...', description: 'Deployment region UUID' })
  @IsUUID()
  deploymentRegionId!: string;

  @ApiProperty({ example: 'a1b2c3d4-...', description: 'Plan UUID' })
  @IsUUID()
  planId!: string;

  @ApiProperty({ example: 350, minimum: 1, maximum: 100000, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  seatLimit?: number;

  @ApiProperty({ example: 'monthly', enum: ['monthly', 'annual'], required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^(monthly|annual)$/, { message: 'billingCycle must be monthly or annual' })
  billingCycle?: string;

  @ApiProperty({ type: PrimaryAdminDto })
  @IsObject()
  @ValidateNested()
  @Type(() => PrimaryAdminDto)
  primaryAdmin!: PrimaryAdminDto;

  @ApiProperty({
    required: false,
    example: '2024-09-30',
    description: 'Trial end date (ISO date string). Omit for paid from day one.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'trialEndsAt must be YYYY-MM-DD' })
  trialEndsAt?: string;
}
