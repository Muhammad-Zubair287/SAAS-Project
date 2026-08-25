import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const ESS_CHANGE_REQUEST_TYPES = [
  'PROFILE_CHANGE',
  'ATTENDANCE_CORRECTION',
  'DOCUMENT',
  'OTHER',
] as const;

export const ESS_CHANGE_REQUEST_CREATE_STATUSES = ['DRAFT', 'SUBMITTED'] as const;

export class CreateChangeRequestDto {
  @ApiProperty({ enum: ESS_CHANGE_REQUEST_TYPES })
  @IsIn(ESS_CHANGE_REQUEST_TYPES)
  requestType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  section?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fieldPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requestedValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  evidenceFileKey?: string;

  @ApiPropertyOptional({ enum: ESS_CHANGE_REQUEST_CREATE_STATUSES, default: 'DRAFT' })
  @IsOptional()
  @IsIn(ESS_CHANGE_REQUEST_CREATE_STATUSES)
  status?: string;
}

export class DecideChangeRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  decisionNote?: string;
}
