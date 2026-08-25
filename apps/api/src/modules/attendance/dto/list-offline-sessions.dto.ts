import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ListOfflineSessionsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Session status (e.g. ACTIVE, CLOSED)' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Filter sessions started on or after this instant' })
  @IsISO8601()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter sessions started on or before this instant' })
  @IsISO8601()
  @IsOptional()
  dateTo?: string;
}
