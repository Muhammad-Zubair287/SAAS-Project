-- M06 Batch 1 — Attendance Core
--   Tables: attendance_raw_event, attendance_record, attendance_exception
-- Expand-contract (ADR-010): additive only; no existing columns removed.
--
-- Creation order (FK dependencies):
--   attendance_raw_event → tenant, employee, attendance_raw_event (self)
--   attendance_record    → tenant, employee
--   attendance_exception → tenant, attendance_record, employee
--
-- ON DELETE behaviour:
--   attendance_raw_event → tenant:                RESTRICT
--   attendance_raw_event → employee:              RESTRICT
--   attendance_raw_event → attendance_raw_event:  SET NULL (correction self-ref)
--   attendance_record    → tenant:                RESTRICT
--   attendance_record    → employee:              RESTRICT
--   attendance_exception → tenant:                RESTRICT
--   attendance_exception → attendance_record:     CASCADE (exceptions owned by record)
--   attendance_exception → employee:              RESTRICT
--
-- RLS: every tenant-owned table gets ENABLE + FORCE + isolation POLICY.
-- Data classification: Confidential (employee attendance data).
-- Spec source: M06 specification — Batch 1 scope.

-- ─── 1. attendance_raw_event ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "attendance_raw_event" (
  "id"                UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"         UUID         NOT NULL,
  "employee_id"       UUID         NOT NULL,
  "event_type"        VARCHAR(20)  NOT NULL,
  "source"            VARCHAR(20)  NOT NULL,
  "event_time"        TIMESTAMPTZ  NOT NULL,
  "recorded_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "device_id"         UUID,
  "idempotency_key"   VARCHAR(128) NOT NULL,
  "latitude"          DECIMAL(10,7),
  "longitude"         DECIMAL(10,7),
  "ip_address"        VARCHAR(45),
  "metadata"          JSONB        NOT NULL DEFAULT '{}',
  "is_correction"     BOOLEAN      NOT NULL DEFAULT false,
  "corrects_event_id" UUID,
  "status"            VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  "processed_at"      TIMESTAMPTZ,
  "error_detail"      VARCHAR(500),
  "created_by"        UUID,
  "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Foreign keys
ALTER TABLE "attendance_raw_event"
  ADD CONSTRAINT "attendance_raw_event_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "attendance_raw_event_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT;

-- Self-reference FK (corrections point to originals; SET NULL keeps the original)
ALTER TABLE "attendance_raw_event"
  ADD CONSTRAINT "attendance_raw_event_corrects_event_id_fkey"
    FOREIGN KEY ("corrects_event_id") REFERENCES "attendance_raw_event"("id") ON DELETE SET NULL;

-- Unique constraints
ALTER TABLE "attendance_raw_event"
  ADD CONSTRAINT "attendance_raw_event_idempotency_key_uq" UNIQUE ("idempotency_key");

-- Indexes (all lead with tenant_id per indexing standards)
CREATE INDEX IF NOT EXISTS "attendance_raw_event_tenant_id_idx"
  ON "attendance_raw_event" ("tenant_id");
CREATE INDEX IF NOT EXISTS "attendance_raw_event_tenant_employee_idx"
  ON "attendance_raw_event" ("tenant_id", "employee_id");
CREATE INDEX IF NOT EXISTS "attendance_raw_event_tenant_event_time_idx"
  ON "attendance_raw_event" ("tenant_id", "event_time");
CREATE INDEX IF NOT EXISTS "attendance_raw_event_tenant_status_idx"
  ON "attendance_raw_event" ("tenant_id", "status");

-- BRIN index for time-series column (efficient for large sequential scans)
CREATE INDEX IF NOT EXISTS "attendance_raw_event_event_time_brin"
  ON "attendance_raw_event" USING BRIN ("event_time");

-- Row-Level Security
ALTER TABLE "attendance_raw_event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance_raw_event" FORCE ROW LEVEL SECURITY;
CREATE POLICY "attendance_raw_event_tenant_isolation" ON "attendance_raw_event"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ─── 2. attendance_record ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "attendance_record" (
  "id"                       UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"                UUID         NOT NULL,
  "employee_id"              UUID         NOT NULL,
  "attendance_date"          DATE         NOT NULL,
  "first_check_in"           TIMESTAMPTZ,
  "last_check_out"           TIMESTAMPTZ,
  "total_worked_minutes"     INTEGER      NOT NULL DEFAULT 0,
  "regular_minutes"          INTEGER      NOT NULL DEFAULT 0,
  "overtime_minutes"         INTEGER      NOT NULL DEFAULT 0,
  "late_minutes"             INTEGER      NOT NULL DEFAULT 0,
  "early_departure_minutes"  INTEGER      NOT NULL DEFAULT 0,
  "status"                   VARCHAR(30)  NOT NULL DEFAULT 'ABSENT',
  "is_manual"                BOOLEAN      NOT NULL DEFAULT false,
  "is_leave"                 BOOLEAN      NOT NULL DEFAULT false,
  "is_holiday"               BOOLEAN      NOT NULL DEFAULT false,
  "is_weekend"               BOOLEAN      NOT NULL DEFAULT false,
  "manual_note"              VARCHAR(500),
  "period_locked"            BOOLEAN      NOT NULL DEFAULT false,
  "calculation_version"      INTEGER      NOT NULL DEFAULT 1,
  "calculated_at"            TIMESTAMPTZ,
  "created_at"               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "created_by"               UUID,
  "updated_at"               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_by"               UUID,
  "row_version"              BIGINT       NOT NULL DEFAULT 1
);

-- Foreign keys
ALTER TABLE "attendance_record"
  ADD CONSTRAINT "attendance_record_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "attendance_record_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT;

-- Unique constraint (one record per employee per date within a tenant)
ALTER TABLE "attendance_record"
  ADD CONSTRAINT "attendance_record_tenant_emp_date_uq"
    UNIQUE ("tenant_id", "employee_id", "attendance_date");

-- Indexes
CREATE INDEX IF NOT EXISTS "attendance_record_tenant_id_idx"
  ON "attendance_record" ("tenant_id");
CREATE INDEX IF NOT EXISTS "attendance_record_tenant_employee_idx"
  ON "attendance_record" ("tenant_id", "employee_id");
CREATE INDEX IF NOT EXISTS "attendance_record_tenant_date_idx"
  ON "attendance_record" ("tenant_id", "attendance_date");
CREATE INDEX IF NOT EXISTS "attendance_record_tenant_status_idx"
  ON "attendance_record" ("tenant_id", "status");

-- Row-Level Security
ALTER TABLE "attendance_record" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance_record" FORCE ROW LEVEL SECURITY;
CREATE POLICY "attendance_record_tenant_isolation" ON "attendance_record"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ─── 3. attendance_exception ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "attendance_exception" (
  "id"                    UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"             UUID         NOT NULL,
  "attendance_record_id"  UUID         NOT NULL,
  "employee_id"           UUID         NOT NULL,
  "exception_type"        VARCHAR(40)  NOT NULL,
  "exception_date"        DATE         NOT NULL,
  "description"           VARCHAR(500),
  "severity"              VARCHAR(10)  NOT NULL DEFAULT 'WARNING',
  "is_resolved"           BOOLEAN      NOT NULL DEFAULT false,
  "resolved_at"           TIMESTAMPTZ,
  "resolved_by"           UUID,
  "resolution_note"       VARCHAR(500),
  "created_at"            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Foreign keys
ALTER TABLE "attendance_exception"
  ADD CONSTRAINT "attendance_exception_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "attendance_exception_attendance_record_id_fkey"
    FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_record"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "attendance_exception_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT;

-- Indexes
CREATE INDEX IF NOT EXISTS "attendance_exception_tenant_id_idx"
  ON "attendance_exception" ("tenant_id");
CREATE INDEX IF NOT EXISTS "attendance_exception_tenant_record_idx"
  ON "attendance_exception" ("tenant_id", "attendance_record_id");
CREATE INDEX IF NOT EXISTS "attendance_exception_tenant_employee_idx"
  ON "attendance_exception" ("tenant_id", "employee_id");
CREATE INDEX IF NOT EXISTS "attendance_exception_tenant_date_idx"
  ON "attendance_exception" ("tenant_id", "exception_date");
CREATE INDEX IF NOT EXISTS "attendance_exception_tenant_resolved_idx"
  ON "attendance_exception" ("tenant_id", "is_resolved");

-- Row-Level Security
ALTER TABLE "attendance_exception" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance_exception" FORCE ROW LEVEL SECURITY;
CREATE POLICY "attendance_exception_tenant_isolation" ON "attendance_exception"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
