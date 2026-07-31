export class AttendanceExceptionResponseDto {
  id!: string;
  tenantId!: string;
  attendanceRecordId!: string;
  employeeId!: string;
  exceptionType!: string;
  exceptionDate!: string;    // YYYY-MM-DD
  description!: string | null;
  severity!: string;
  isResolved!: boolean;
  resolvedAt!: string | null;
  resolvedBy!: string | null;
  resolutionNote!: string | null;
  createdAt!: string;
  updatedAt!: string;
}
