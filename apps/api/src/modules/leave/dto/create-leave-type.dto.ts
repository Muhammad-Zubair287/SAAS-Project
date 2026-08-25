import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export const LEAVE_PAID_STATUSES = ['PAID', 'UNPAID', 'MIXED'] as const;
export const LEAVE_UNITS = ['DAY', 'HOUR'] as const;
export const LEAVE_TYPE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export class CreateLeaveTypeDto {
  @ApiProperty({ maxLength: 40 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code!: string;

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: LEAVE_PAID_STATUSES })
  @IsIn(LEAVE_PAID_STATUSES)
  paidStatus!: (typeof LEAVE_PAID_STATUSES)[number];

  @ApiProperty({ enum: LEAVE_UNITS })
  @IsIn(LEAVE_UNITS)
  unit!: (typeof LEAVE_UNITS)[number];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  halfDayAllowed?: boolean;

  @ApiPropertyOptional({ enum: LEAVE_TYPE_STATUSES, default: 'ACTIVE' })
  @IsOptional()
  @IsIn(LEAVE_TYPE_STATUSES)
  status?: (typeof LEAVE_TYPE_STATUSES)[number];
}
