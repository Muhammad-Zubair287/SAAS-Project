-- M07 Phase 3: AttendanceRecord schedule provenance (additive, nullable)
ALTER TABLE "attendance_record"
  ADD COLUMN IF NOT EXISTS "schedule_source" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "resolved_shift_id" UUID,
  ADD COLUMN IF NOT EXISTS "shift_assignment_id" UUID,
  ADD COLUMN IF NOT EXISTS "attendance_policy_id" UUID;

CREATE INDEX IF NOT EXISTS "attendance_record_tenant_resolved_shift_idx"
  ON "attendance_record" ("tenant_id", "resolved_shift_id");

CREATE INDEX IF NOT EXISTS "attendance_record_tenant_shift_assignment_idx"
  ON "attendance_record" ("tenant_id", "shift_assignment_id");

CREATE INDEX IF NOT EXISTS "attendance_record_tenant_policy_idx"
  ON "attendance_record" ("tenant_id", "attendance_policy_id");

ALTER TABLE "attendance_record"
  DROP CONSTRAINT IF EXISTS "attendance_record_resolved_shift_id_fkey";
ALTER TABLE "attendance_record"
  ADD CONSTRAINT "attendance_record_resolved_shift_id_fkey"
  FOREIGN KEY ("resolved_shift_id") REFERENCES "shift"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendance_record"
  DROP CONSTRAINT IF EXISTS "attendance_record_shift_assignment_id_fkey";
ALTER TABLE "attendance_record"
  ADD CONSTRAINT "attendance_record_shift_assignment_id_fkey"
  FOREIGN KEY ("shift_assignment_id") REFERENCES "shift_assignment"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendance_record"
  DROP CONSTRAINT IF EXISTS "attendance_record_attendance_policy_id_fkey";
ALTER TABLE "attendance_record"
  ADD CONSTRAINT "attendance_record_attendance_policy_id_fkey"
  FOREIGN KEY ("attendance_policy_id") REFERENCES "attendance_policy"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
