import { IsUUID, IsDateString, IsOptional, IsString, MaxLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ATTENDANCE_STATUS } from '../constants/attendance.constants';

export class CreateManualAttendanceRecordDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ description: 'Attendance date in YYYY-MM-DD format' })
  @IsDateString()
  attendanceDate!: string;

  @ApiProperty({ enum: Object.values(ATTENDANCE_STATUS) })
  @IsIn(Object.values(ATTENDANCE_STATUS))
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  manualNote?: string;
}
