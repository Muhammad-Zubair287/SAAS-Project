import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { TenantStatus } from '../../../common/enums/platform.enum';
import {
  ALLOWED_TENANT_SORT_FIELDS,
  ISO_DATE_PATTERN,
  PLAN_KEY_PATTERN,
} from '../../../common/validation/input-security.constants';
import { trimOptionalString } from '../../../common/validation/sanitize.transform';
import { IsSafeText } from '../../../common/validation/validators';

export class ListTenantsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TenantStatus })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiPropertyOptional({ example: 'PK', description: 'ISO 3166-1 alpha-2' })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(2)
  @Matches(/^[A-Z]{2}$/)
  countryCode?: string;

  @ApiPropertyOptional({ example: 'growth' })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(PLAN_KEY_PATTERN)
  planKey?: string;

  @ApiPropertyOptional({ description: 'Full-text search on displayName, legalName' })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @IsSafeText()
  search?: string;

  @ApiPropertyOptional({ example: 'displayName', description: 'Sort field' })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @IsIn([...ALLOWED_TENANT_SORT_FIELDS])
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Created on or after (YYYY-MM-DD, inclusive)' })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(ISO_DATE_PATTERN)
  createdFrom?: string;

  @ApiPropertyOptional({ description: 'Created on or before (YYYY-MM-DD, inclusive)' })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(ISO_DATE_PATTERN)
  createdTo?: string;

  @ApiPropertyOptional({ description: 'Trial ends on or before (YYYY-MM-DD, inclusive)' })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(ISO_DATE_PATTERN)
  trialEndingBefore?: string;

  @ApiPropertyOptional({
    description: 'Minimum seat utilisation percent (1–100), computed from latest usage snapshot / seatLimit.',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  minSeatUtilisationPct?: number;
}
