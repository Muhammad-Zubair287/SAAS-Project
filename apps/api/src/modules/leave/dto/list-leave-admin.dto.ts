import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export const LEAVE_REQUEST_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'RETURNED',
  'CANCELLED',
  'COMPLETED',
] as const;

export class ListLeaveAdminRequestsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: LEAVE_REQUEST_STATUSES })
  @IsOptional()
  @IsString()
  @IsIn(LEAVE_REQUEST_STATUSES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  leaveTypeId?: string;
}

export class ListLeaveTypesAdminDto {
  @ApiPropertyOptional({
    description: 'When true, include INACTIVE leave types (admin catalogue).',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeInactive?: boolean;
}
