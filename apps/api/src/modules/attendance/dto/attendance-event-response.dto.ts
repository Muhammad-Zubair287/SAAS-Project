export class AttendanceEventResponseDto {
  id!: string;
  tenantId!: string;
  employeeId!: string;
  eventType!: string;
  source!: string;
  eventTime!: string;
  recordedAt!: string;
  deviceId!: string | null;
  idempotencyKey!: string;
  isCorrection!: boolean;
  correctsEventId!: string | null;
  status!: string;
  createdAt!: string;
}
