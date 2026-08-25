import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { TenantStatus } from '../../../common/enums/platform.enum';

export class ListTenantsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TenantStatus })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiPropertyOptional({ example: 'PK', description: 'ISO 3166-1 alpha-2' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  countryCode?: string;

  @ApiPropertyOptional({ example: 'growth' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  planKey?: string;

  @ApiPropertyOptional({ description: 'Full-text search on displayName, legalName' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ example: 'displayName', description: 'Sort field' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Created on or after (YYYY-MM-DD, inclusive)' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  createdFrom?: string;

  @ApiPropertyOptional({ description: 'Created on or before (YYYY-MM-DD, inclusive)' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  createdTo?: string;

  @ApiPropertyOptional({ description: 'Trial ends on or before (YYYY-MM-DD, inclusive)' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
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
