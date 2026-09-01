import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  Allow,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  ENTITLEMENT_CODE_PATTERN,
  ORGANIZATION_NAME_PATTERN,
  PLAN_CODE_PATTERN,
} from '../../../common/validation/input-security.constants';
import { trimOptionalString, trimString, normalizePlanCode, normalizeEntitlementCode, normalizeUppercaseToken } from '../../../common/validation/sanitize.transform';
import { IsSafeText } from '../../../common/validation/validators';

export class PlanEntitlementItemDto {
  @IsUUID()
  entitlementId!: string;

  @Allow()
  defaultValue!: unknown;
}

export class CreatePlanDto {
  @ApiProperty({ example: 'growth', maxLength: 40 })
  @Transform(normalizePlanCode)
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @MinLength(2)
  @Matches(PLAN_CODE_PATTERN, {
    message: 'code must be lowercase alphanumeric with optional underscores or hyphens',
  })
  @IsSafeText()
  code!: string;

  @ApiProperty({ example: 'Growth', maxLength: 100 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @MinLength(2)
  @Matches(ORGANIZATION_NAME_PATTERN, {
    message: 'name must contain only allowed business name characters',
  })
  @IsSafeText()
  name!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @IsSafeText()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @IsSafeText()
  billingModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsSafeText()
  status?: string;

  @ApiPropertyOptional({ type: [PlanEntitlementItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanEntitlementItemDto)
  entitlements?: PlanEntitlementItemDto[];
}

export class UpdatePlanDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @MinLength(2)
  @Matches(ORGANIZATION_NAME_PATTERN, {
    message: 'name must contain only allowed business name characters',
  })
  @IsSafeText()
  name?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @IsSafeText()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @IsSafeText()
  billingModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsSafeText()
  status?: string;
}

export class SetPlanEntitlementsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanEntitlementItemDto)
  items!: PlanEntitlementItemDto[];
}

export class CreateEntitlementDto {
  @ApiProperty({ example: 'feature_core_hr', maxLength: 80 })
  @Transform(normalizeEntitlementCode)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @MinLength(3)
  @Matches(ENTITLEMENT_CODE_PATTERN, {
    message: 'code must be lowercase snake_case',
  })
  @IsSafeText()
  code!: string;

  @ApiProperty({ example: 'Core HR', maxLength: 120 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @MinLength(2)
  @Matches(ORGANIZATION_NAME_PATTERN, {
    message: 'label must contain only allowed characters',
  })
  @IsSafeText()
  label!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @IsSafeText()
  description?: string;

  @ApiProperty({ example: 'BOOLEAN' })
  @Transform(normalizeUppercaseToken)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @IsSafeText()
  dataType!: string;

  @Allow()
  defaultValue!: unknown;

  @ApiPropertyOptional({ maxLength: 40 })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @IsSafeText()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsSafeText()
  status?: string;
}
