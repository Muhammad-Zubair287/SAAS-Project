import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import {
  SHIFT_CODE_PATTERN,
  SHIFT_STATUS,
  SHIFT_TIME_PATTERN,
} from '../constants/shift.constants';

const SHIFT_SORT_FIELDS = ['code', 'name', 'effectiveFrom', 'createdAt'] as const;

export class CreateShiftDto {
  @ApiProperty({ example: 'MORNING' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  @Matches(SHIFT_CODE_PATTERN, {
    message: 'code must be alphanumeric with optional . _ -',
  })
  code!: string;

  @ApiProperty({ example: 'Morning Shift' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: '09:00', description: 'Local start time HH:MM' })
  @IsString()
  @Matches(SHIFT_TIME_PATTERN, { message: 'startLocalTime must be HH:MM' })
  startLocalTime!: string;

  @ApiProperty({ example: '17:00', description: 'Local end time HH:MM' })
  @IsString()
  @Matches(SHIFT_TIME_PATTERN, { message: 'endLocalTime must be HH:MM' })
  endLocalTime!: string;

  // No property initializers: UpdateShiftDto (PartialType) must not inject
  // defaults that look like explicit material field changes on PATCH.
  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  crossesMidnight?: boolean;

  @ApiProperty({ example: 480, description: 'Required working minutes' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requiredMinutes!: number;

  @ApiPropertyOptional({ default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  breakMinutes?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  breakPaid?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  checkInWindowBeforeMinutes?: number;

  @ApiPropertyOptional({ default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  checkInWindowAfterMinutes?: number;

  @ApiPropertyOptional({ default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  checkOutWindowAfterMinutes?: number;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  attendancePolicyId!: string;

  @ApiProperty({ example: '2026-08-01', description: 'Inclusive effective start date (YYYY-MM-DD)' })
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Exclusive effective end date (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;
}

export class UpdateShiftDto extends PartialType(
  OmitType(CreateShiftDto, ['code'] as const),
) {
  @ApiPropertyOptional({ enum: [SHIFT_STATUS.ACTIVE, SHIFT_STATUS.INACTIVE] })
  @IsIn([SHIFT_STATUS.ACTIVE, SHIFT_STATUS.INACTIVE])
  @IsOptional()
  status?: string;
}

export class ListShiftsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: [SHIFT_STATUS.ACTIVE, SHIFT_STATUS.INACTIVE] })
  @IsIn([SHIFT_STATUS.ACTIVE, SHIFT_STATUS.INACTIVE])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Matches name or code' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: SHIFT_SORT_FIELDS })
  @IsIn(SHIFT_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof SHIFT_SORT_FIELDS)[number];
}

export class ShiftResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  version!: number;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  startLocalTime!: string;

  @ApiProperty()
  endLocalTime!: string;

  @ApiProperty()
  crossesMidnight!: boolean;

  @ApiProperty()
  requiredMinutes!: number;

  @ApiProperty()
  breakMinutes!: number;

  @ApiProperty()
  breakPaid!: boolean;

  @ApiProperty()
  checkInWindowBeforeMinutes!: number;

  @ApiProperty()
  checkInWindowAfterMinutes!: number;

  @ApiProperty()
  checkOutWindowAfterMinutes!: number;

  @ApiProperty()
  attendancePolicyId!: string;

  @ApiProperty()
  effectiveFrom!: string;

  @ApiPropertyOptional({ nullable: true })
  effectiveTo!: string | null;

  @ApiProperty({ description: 'Optimistic concurrency token (stringified bigint)' })
  rowVersion!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({
    description:
      'Count of default ShiftAssignments effective today (list aggregate; omit on create/detail if not computed)',
  })
  activeAssignmentCount?: number;
}

export function toShiftResponse(
  row: {
    id: string;
    code: string;
    name: string;
    version: number;
    status: string;
    startLocalTime: string;
    endLocalTime: string;
    crossesMidnight: boolean;
    requiredMinutes: number;
    breakMinutes: number;
    breakPaid: boolean;
    checkInWindowBeforeMinutes: number;
    checkInWindowAfterMinutes: number;
    checkOutWindowAfterMinutes: number;
    attendancePolicyId: string;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    rowVersion: bigint;
    createdAt: Date;
    updatedAt: Date;
  },
  extras?: { activeAssignmentCount?: number },
): ShiftResponseDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    version: row.version,
    status: row.status,
    startLocalTime: row.startLocalTime,
    endLocalTime: row.endLocalTime,
    crossesMidnight: row.crossesMidnight,
    requiredMinutes: row.requiredMinutes,
    breakMinutes: row.breakMinutes,
    breakPaid: row.breakPaid,
    checkInWindowBeforeMinutes: row.checkInWindowBeforeMinutes,
    checkInWindowAfterMinutes: row.checkInWindowAfterMinutes,
    checkOutWindowAfterMinutes: row.checkOutWindowAfterMinutes,
    attendancePolicyId: row.attendancePolicyId,
    effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
    effectiveTo: row.effectiveTo
      ? row.effectiveTo.toISOString().slice(0, 10)
      : null,
    rowVersion: row.rowVersion.toString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(extras?.activeAssignmentCount !== undefined
      ? { activeAssignmentCount: extras.activeAssignmentCount }
      : {}),
  };
}
