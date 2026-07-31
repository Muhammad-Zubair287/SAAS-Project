import {
  IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional,
  IsString, IsUUID, Max, Min, MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAttendancePolicyDto {
  @ApiPropertyOptional() @IsUUID() @IsOptional() legalEntityId?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() branchId?: string;

  @ApiProperty() @IsString() @MinLength(2) name!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;

  @ApiProperty() @IsDateString() effectiveFrom!: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() effectiveTo?: string;

  @ApiProperty() @IsInt() @Min(1) @Max(1440) workingMinutesPerDay!: number;
  @ApiProperty() @IsString() workStartTime!: string;  // "HH:MM"
  @ApiProperty() @IsString() workEndTime!: string;    // "HH:MM"

  @ApiProperty() @IsInt() @Min(0) @Max(120) graceMinutes!: number;
  @ApiProperty() @IsInt() @Min(0) @Max(480) lateToleranceMinutes!: number;
  @ApiProperty() @IsInt() @Min(0) @Max(480) earlyDepartureToleranceMinutes!: number;
  @ApiProperty() @IsInt() @Min(1) halfDayMinutes!: number;
  @ApiProperty() @IsInt() @Min(1) minimumWorkingMinutes!: number;
  @ApiProperty() @IsInt() @Min(0) overtimeThresholdMinutes!: number;

  @ApiPropertyOptional() @IsString() @IsOptional() roundingStrategy?: string;
  @ApiProperty() weekendDefinition!: number[];  // [0,6] = Sun+Sat
  @ApiPropertyOptional() @IsString() @IsOptional() timezone?: string;

  @ApiPropertyOptional() @IsBoolean() @IsOptional() allowManualAttendance?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() allowEarlyCheckIn?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() allowLateCheckOut?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() allowOvertime?: boolean;
  @ApiPropertyOptional() @IsOptional() allowedIpRanges?: string[];
}
