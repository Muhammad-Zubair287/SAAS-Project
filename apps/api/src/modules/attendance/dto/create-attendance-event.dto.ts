import { IsUUID, IsIn, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ATTENDANCE_EVENT_TYPE, ATTENDANCE_SOURCE } from '../constants/attendance.constants';

export class CreateAttendanceEventDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ enum: Object.values(ATTENDANCE_EVENT_TYPE) })
  @IsIn(Object.values(ATTENDANCE_EVENT_TYPE))
  eventType!: string;

  @ApiProperty({ description: 'ISO-8601 UTC timestamp of when the event occurred' })
  @IsISO8601()
  eventTime!: string;

  @ApiProperty({ enum: Object.values(ATTENDANCE_SOURCE) })
  @IsIn(Object.values(ATTENDANCE_SOURCE))
  source!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
