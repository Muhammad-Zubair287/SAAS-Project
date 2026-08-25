import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export const LEAVE_REQUEST_CREATE_STATUSES = ['DRAFT', 'SUBMITTED'] as const;
export const LEAVE_DAY_PARTS = ['FULL', 'FIRST_HALF', 'SECOND_HALF'] as const;

export class ListLeaveRequestsQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateLeaveRequestDto {
  @ApiProperty()
  @IsUUID()
  leaveTypeId!: string;

  @ApiProperty()
  @IsISO8601()
  startsOn!: string;

  @ApiProperty()
  @IsISO8601()
  endsOn!: string;

  @ApiPropertyOptional({ enum: LEAVE_DAY_PARTS, default: 'FULL' })
  @IsOptional()
  @IsIn(LEAVE_DAY_PARTS)
  dayPart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  halfDay?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  evidenceFileKey?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  emergency?: boolean;

  @ApiPropertyOptional({ enum: LEAVE_REQUEST_CREATE_STATUSES, default: 'DRAFT' })
  @IsOptional()
  @IsIn(LEAVE_REQUEST_CREATE_STATUSES)
  status?: string;
}

export class GrantLeaveBalanceDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiProperty()
  @IsUUID()
  leaveTypeId!: string;

  @ApiProperty({ description: 'Positive grant quantity in leave-type units' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @ApiProperty()
  @IsISO8601()
  effectiveDate!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  reason!: string;
}
