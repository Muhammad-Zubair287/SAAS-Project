import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { SHIFT_ASSIGNMENT_SOURCE } from '../constants/shift-assignment.constants';

export class CreateShiftAssignmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  shiftId!: string;

  @ApiProperty({ example: '2026-08-01', description: 'Inclusive effective start (YYYY-MM-DD)' })
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Exclusive effective end (YYYY-MM-DD); omit for open-ended',
  })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ApiPropertyOptional({ type: [String], description: 'Individual employee targets' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  @IsOptional()
  employeeIds?: string[];

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Department snapshot target — expands to CURRENT ACTIVE members at assign time',
  })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Optional Branch (MVP Location)',
  })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  overrideExisting?: boolean;

  @ApiPropertyOptional({
    default: false,
    description:
      'Future integration metadata only — does not deliver notifications in Phase 2',
  })
  @IsBoolean()
  @IsOptional()
  notificationRequested?: boolean;
}

export class UpdateShiftAssignmentDto {
  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Exclusive end; null clears to open-ended when explicitly sent as null',
    nullable: true,
  })
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  @IsOptional()
  effectiveTo?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  @IsOptional()
  branchId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  shiftId?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  overrideExisting?: boolean;
}

export class ListShiftAssignmentsDto extends PaginationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filter by department snapshot sourceReferenceId',
  })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filter by shift id',
  })
  @IsUUID()
  @IsOptional()
  shiftId?: string;

  @ApiPropertyOptional({
    example: '2026-08-09',
    description: 'Only assignments effective on this date (inclusive/exclusive range)',
  })
  @IsDateString()
  @IsOptional()
  asOf?: string;
}

export class AssignmentConflictDto {
  @ApiProperty()
  employeeId!: string;

  @ApiProperty()
  conflictingAssignmentId!: string;

  @ApiProperty()
  shiftId!: string;

  @ApiProperty()
  effectiveFrom!: string;

  @ApiPropertyOptional({ nullable: true })
  effectiveTo!: string | null;
}

export class ShiftAssignmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeId!: string;

  @ApiPropertyOptional({ description: 'Employee display name (list/detail enrichment)' })
  employeeName?: string | null;

  @ApiProperty()
  shiftId!: string;

  @ApiPropertyOptional({ description: 'Shift name (list/detail enrichment)' })
  shiftName?: string | null;

  @ApiPropertyOptional({ description: 'Shift code (list/detail enrichment)' })
  shiftCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  branchId!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Branch / location name (list/detail enrichment)',
  })
  branchName?: string | null;

  @ApiProperty()
  effectiveFrom!: string;

  @ApiPropertyOptional({ nullable: true })
  effectiveTo!: string | null;

  @ApiProperty({ enum: Object.values(SHIFT_ASSIGNMENT_SOURCE) })
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

export class ShiftAssignmentBulkResultDto {
  @ApiProperty()
  target!: 'EMPLOYEES' | 'DEPARTMENT';

  @ApiPropertyOptional({ nullable: true })
  departmentId!: string | null;

  @ApiProperty()
  employeesResolved!: number;

  @ApiProperty()
  created!: number;

  @ApiProperty()
  overridden!: number;

  @ApiProperty({ type: [ShiftAssignmentResponseDto] })
  assignments!: ShiftAssignmentResponseDto[];

  @ApiPropertyOptional({
    description: 'Accepted for future notification integration; not delivered in Phase 2',
  })
  notificationRequested?: boolean;
}

export type ShiftAssignmentWithRelations = {
  id: string;
  employeeId: string;
  shiftId: string;
  branchId: string | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  assignmentSource: string;
  sourceReferenceId: string | null;
  rowVersion: bigint;
  createdAt: Date;
  updatedAt: Date;
  employee?: { displayName: string } | null;
  shift?: { name: string; code: string } | null;
  branch?: { name: string } | null;
};

export function toShiftAssignmentResponse(
  row: ShiftAssignmentWithRelations,
): ShiftAssignmentResponseDto {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employee?.displayName ?? null,
    shiftId: row.shiftId,
    shiftName: row.shift?.name ?? null,
    shiftCode: row.shift?.code ?? null,
    branchId: row.branchId,
    branchName: row.branch?.name ?? null,
    effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
    effectiveTo: row.effectiveTo
      ? row.effectiveTo.toISOString().slice(0, 10)
      : null,
    assignmentSource: row.assignmentSource,
    sourceReferenceId: row.sourceReferenceId,
    rowVersion: row.rowVersion.toString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
