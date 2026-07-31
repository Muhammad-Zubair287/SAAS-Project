import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
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
}
