import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import {
  ROSTER_ASSIGNMENT_SOURCE,
  ROSTER_CALENDAR_MAX_PAGE_SIZE,
  ROSTER_LIST_MAX_EMPLOYEE_IDS,
  ROSTER_RECURRENCE_TYPE,
  ROSTER_STATUS,
  type RosterRecurrenceType,
  type RosterStatus,
} from '../constants/roster.constants';

function toStringArray(value: unknown): string[] | undefined {
  if (value == null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return undefined;
}

// ─── Nested recurrence config ─────────────────────────────────────────────────

export class RosterRecurrenceDto {
  @ApiProperty({
    enum: Object.values(ROSTER_RECURRENCE_TYPE),
    description: 'DAILY expands every day; WEEKLY expands matching daysOfWeek only',
  })
  @IsEnum(ROSTER_RECURRENCE_TYPE)
  type!: RosterRecurrenceType;

  @ApiPropertyOptional({
    type: [Number],
    description: '0=Sun,1=Mon…6=Sat — required for WEEKLY recurrence',
    example: [1, 2, 3, 4, 5],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @IsOptional()
  daysOfWeek?: number[];
}

// ─── Create ───────────────────────────────────────────────────────────────────

export class CreateRosterAssignmentDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Required when isRestDay is false (default)',
  })
  @IsUUID()
  @IsOptional()
  shiftId?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'When true, shiftId must be absent',
  })
  @IsBoolean()
  @IsOptional()
  isRestDay?: boolean;

  @ApiPropertyOptional({ format: 'uuid', description: 'Optional branch / location pin' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Individual employee targets (mutually exclusive with departmentId)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  @IsOptional()
  employeeIds?: string[];

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Department snapshot — expands to ACTIVE members at request time',
  })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiProperty({
    example: '2026-09-01',
    description: 'Inclusive start date (YYYY-MM-DD)',
  })
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    example: '2026-09-30',
    description: 'Inclusive end date (YYYY-MM-DD); max span 92 days',
  })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ description: 'Expansion rule; absence defaults to DAILY' })
  @ValidateNested()
  @Type(() => RosterRecurrenceDto)
  @IsOptional()
  recurrence?: RosterRecurrenceDto;

  @ApiPropertyOptional({
    type: [Number],
    description: '0=Sun…6=Sat weekday numbers that should be marked isRestDay=true',
    example: [0, 6],
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @IsOptional()
  restWeekdays?: number[];

  @ApiPropertyOptional({
    default: false,
    description:
      'When true, supersede existing effective-published rows (requires roster.override permission)',
  })
  @IsBoolean()
  @IsOptional()
  overrideExisting?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'Metadata only — does not deliver notifications in this release',
  })
  @IsBoolean()
  @IsOptional()
  notificationRequested?: boolean;

  @ApiPropertyOptional({
    default: false,
    description:
      'Must be true when publishing would impact unlocked existing attendance records',
  })
  @IsBoolean()
  @IsOptional()
  confirmAttendanceImpact?: boolean;

  @ApiPropertyOptional({
    default: false,
    description:
      'Allow publish to proceed despite period-locked attendance (requires roster.override)',
  })
  @IsBoolean()
  @IsOptional()
  overrideLocked?: boolean;
}

// ─── Update (DRAFT tip only) ──────────────────────────────────────────────────

export class UpdateRosterAssignmentDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Ignored when isRestDay becomes true' })
  @IsUUID()
  @IsOptional()
  shiftId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isRestDay?: boolean;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  @IsOptional()
  branchId?: string | null;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export class ListRosterDto extends PaginationDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: ROSTER_CALENDAR_MAX_PAGE_SIZE,
    default: 20,
    description:
      'Page size. Calendar range loads may use up to ROSTER_CALENDAR_MAX_PAGE_SIZE (bounded).',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ROSTER_CALENDAR_MAX_PAGE_SIZE)
  @IsOptional()
  override pageSize?: number = 20;

  @ApiProperty({ example: '2026-09-01', description: 'Inclusive lower bound (YYYY-MM-DD)' })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ example: '2026-09-30', description: 'Inclusive upper bound (YYYY-MM-DD)' })
  @IsDateString()
  dateTo!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @ApiPropertyOptional({
    type: [String],
    description: `Bounded employee scope filter (max ${ROSTER_LIST_MAX_EMPLOYEE_IDS})`,
  })
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ROSTER_LIST_MAX_EMPLOYEE_IDS)
  @IsUUID('4', { each: true })
  @IsOptional()
  employeeIds?: string[];

  @ApiPropertyOptional({
    format: 'uuid',
    description: "Filter by employee's CURRENT department membership (not assignment sourceReferenceId)",
  })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: "Filter by employee's CURRENT branch membership",
  })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ enum: Object.values(ROSTER_STATUS) })
  @IsEnum(ROSTER_STATUS)
  @IsOptional()
  rosterStatus?: RosterStatus;

  @ApiPropertyOptional({
    default: false,
    description:
      'Include full history (all published rows); default returns only draft tips + effective-published',
  })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @IsOptional()
  includeHistory?: boolean;
}

// ─── Publish ──────────────────────────────────────────────────────────────────

export class PublishRosterDto {
  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ example: '2026-09-30' })
  @IsDateString()
  dateTo!: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Limit publish scope to these employees',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  @IsOptional()
  employeeIds?: string[];

  @ApiPropertyOptional({ format: 'uuid', description: 'Limit scope to this department' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Limit scope to this branch' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  notificationRequested?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'Confirm impact on unlocked existing attendance records',
  })
  @IsBoolean()
  @IsOptional()
  confirmAttendanceImpact?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'Allow override of period-locked attendance records (requires roster.override)',
  })
  @IsBoolean()
  @IsOptional()
  overrideLocked?: boolean;
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export class RosterConflictDto {
  @ApiProperty()
  employeeId!: string;

  @ApiProperty()
  workDate!: string;

  @ApiPropertyOptional({ description: 'Existing draft tip id, if present' })
  existingDraftTipId?: string;

  @ApiPropertyOptional({ description: 'Existing effective-published id, if present' })
  existingPublishedId?: string;
}

export class RosterAssignmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeId!: string;

  @ApiPropertyOptional({ nullable: true })
  employeeName?: string | null;

  @ApiProperty({ example: '2026-09-01' })
  workDate!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  shiftId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  shiftName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  shiftCode?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '09:00' })
  startLocalTime?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '17:00' })
  endLocalTime?: string | null;

  @ApiPropertyOptional({ nullable: true })
  crossesMidnight?: boolean | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  branchId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  branchName?: string | null;

  @ApiProperty({ enum: Object.values(ROSTER_STATUS) })
  rosterStatus!: string;

  @ApiProperty()
  isRestDay!: boolean;

  @ApiProperty()
  isDraftTip!: boolean;

  @ApiProperty()
  isEffectivePublished!: boolean;

  @ApiPropertyOptional({ nullable: true })
  publishedAt!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  publishedBy!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  supersedesId!: string | null;

  @ApiProperty({ enum: Object.values(ROSTER_ASSIGNMENT_SOURCE) })
  assignmentSource!: string;

  @ApiPropertyOptional({ nullable: true })
  sourceReferenceId!: string | null;

  @ApiProperty()
  rowVersion!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class RosterBulkResultDto {
  @ApiProperty()
  dateFrom!: string;

  @ApiProperty()
  dateTo!: string;

  @ApiProperty()
  employeesResolved!: number;

  @ApiProperty()
  rowsCreated!: number;

  @ApiPropertyOptional({ description: 'Ids of up to 20 created rows' })
  sampleIds!: string[];

  @ApiPropertyOptional({ default: false })
  notificationRequested?: boolean;
}

export class RosterPublishResultDto {
  @ApiProperty()
  dateFrom!: string;

  @ApiProperty()
  dateTo!: string;

  @ApiProperty()
  rowsPublished!: number;

  @ApiProperty()
  employeesAffected!: number;

  @ApiPropertyOptional({ description: 'Ids of up to 20 published rows' })
  sampleIds!: string[];

  @ApiPropertyOptional({ default: false })
  notificationRequested?: boolean;
}

// ─── Type + mapper ────────────────────────────────────────────────────────────

export type RosterAssignmentWithRelations = {
  id: string;
  tenantId: string;
  employeeId: string;
  workDate: Date;
  shiftId: string | null;
  branchId: string | null;
  rosterStatus: string;
  isRestDay: boolean;
  isDraftTip: boolean;
  isEffectivePublished: boolean;
  publishedAt: Date | null;
  publishedBy: string | null;
  supersedesId: string | null;
  assignmentSource: string;
  sourceReferenceId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  rowVersion: bigint;
  employee?: { displayName: string } | null;
  shift?: {
    name: string;
    code: string;
    startLocalTime: string;
    endLocalTime: string;
    crossesMidnight: boolean;
  } | null;
  branch?: { name: string } | null;
};

export function toRosterAssignmentResponse(
  row: RosterAssignmentWithRelations,
): RosterAssignmentResponseDto {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employee?.displayName ?? null,
    workDate: row.workDate.toISOString().slice(0, 10),
    shiftId: row.shiftId,
    shiftName: row.shift?.name ?? null,
    shiftCode: row.shift?.code ?? null,
    startLocalTime: row.shift?.startLocalTime ?? null,
    endLocalTime: row.shift?.endLocalTime ?? null,
    crossesMidnight: row.shift?.crossesMidnight ?? null,
    branchId: row.branchId,
    branchName: row.branch?.name ?? null,
    rosterStatus: row.rosterStatus,
    isRestDay: row.isRestDay,
    isDraftTip: row.isDraftTip,
    isEffectivePublished: row.isEffectivePublished,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    publishedBy: row.publishedBy,
    supersedesId: row.supersedesId,
    assignmentSource: row.assignmentSource,
    sourceReferenceId: row.sourceReferenceId,
    rowVersion: row.rowVersion.toString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
