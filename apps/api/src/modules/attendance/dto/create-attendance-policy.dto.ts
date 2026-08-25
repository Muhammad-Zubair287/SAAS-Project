import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  MinLength,
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
  @ApiProperty() @IsString() @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/, {
    message: 'workStartTime must be in HH:MM format',
  }) workStartTime!: string;
  @ApiProperty() @IsString() @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/, {
    message: 'workEndTime must be in HH:MM format',
  }) workEndTime!: string;

  @ApiProperty() @IsInt() @Min(0) @Max(120) graceMinutes!: number;
  @ApiProperty() @IsInt() @Min(0) @Max(480) lateToleranceMinutes!: number;
  @ApiProperty() @IsInt() @Min(0) @Max(480) earlyDepartureToleranceMinutes!: number;
  @ApiProperty() @IsInt() @Min(1) halfDayMinutes!: number;
  @ApiProperty() @IsInt() @Min(1) minimumWorkingMinutes!: number;
  @ApiProperty() @IsInt() @Min(0) overtimeThresholdMinutes!: number;

  @ApiPropertyOptional() @IsString() @IsOptional() roundingStrategy?: string;
  @ApiProperty() @IsArray() @ArrayNotEmpty() @ArrayMaxSize(7) @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) weekendDefinition!: number[];
  @ApiPropertyOptional() @IsString() @IsOptional() timezone?: string;

  @ApiPropertyOptional() @IsBoolean() @IsOptional() allowManualAttendance?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() allowEarlyCheckIn?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() allowLateCheckOut?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() allowOvertime?: boolean;
  @ApiPropertyOptional() @IsArray() @IsString({ each: true }) @IsOptional() allowedIpRanges?: string[];
}
