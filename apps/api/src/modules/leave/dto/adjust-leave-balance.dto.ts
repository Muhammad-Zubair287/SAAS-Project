import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  NotEquals,
} from 'class-validator';

export class AdjustLeaveBalanceDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiProperty()
  @IsUUID()
  leaveTypeId!: string;

  @ApiProperty({
    description:
      'Signed quantity in leave-type units. Positive creates a GRANT; negative creates an ADJUSTMENT.',
  })
  @Type(() => Number)
  @IsNumber()
  @NotEquals(0)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Defaults to today (UTC date) when omitted' })
  @IsOptional()
  @IsISO8601()
  effectiveDate?: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
