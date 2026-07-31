import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SortOrder } from '../enums/app.enum';
import { APP_CONSTANTS } from '../constants/app.constants';

export class PaginationDto {
  @ApiPropertyOptional({ minimum: 1, default: APP_CONSTANTS.DEFAULT_PAGE })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = APP_CONSTANTS.DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: APP_CONSTANTS.MIN_PAGE_SIZE,
    maximum: APP_CONSTANTS.MAX_PAGE_SIZE,
    default: APP_CONSTANTS.DEFAULT_PAGE_SIZE,
  })
  @Type(() => Number)
  @IsInt()
  @Min(APP_CONSTANTS.MIN_PAGE_SIZE)
  @Max(APP_CONSTANTS.MAX_PAGE_SIZE)
  @IsOptional()
  pageSize?: number = APP_CONSTANTS.DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({ description: 'Cursor for cursor-based pagination' })
  @IsString()
  @IsOptional()
  cursor?: string;
}
