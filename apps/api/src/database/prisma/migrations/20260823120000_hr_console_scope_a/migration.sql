-- HR Console Scope A: employment history, compensation, emergency contacts,
-- grades, org history, import jobs, attendance periods, employee assignment FKs.

CREATE TABLE IF NOT EXISTS "grade" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" UUID,
    "row_version" BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT "grade_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "grade_tenant_code_uq" ON "grade"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "grade_tenant_id_idx" ON "grade"("tenant_id");
CREATE INDEX IF NOT EXISTS "grade_tenant_status_idx" ON "grade"("tenant_id", "status");

ALTER TABLE "grade" ADD CONSTRAINT "grade_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "organisation_change_event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "entity_type" VARCHAR(40) NOT NULL,
    "entity_id" UUID NOT NULL,
    "change_type" VARCHAR(40) NOT NULL,
    "previous_value" JSONB,
    "new_value" JSONB,
    "effective_date" DATE NOT NULL,
    "changed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organisation_change_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "org_change_event_tenant_id_idx" ON "organisation_change_event"("tenant_id");
CREATE INDEX IF NOT EXISTS "org_change_event_entity_idx" ON "organisation_change_event"("tenant_id", "entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "org_change_event_effective_idx" ON "organisation_change_event"("tenant_id", "effective_date");

ALTER TABLE "organisation_change_event" ADD CONSTRAINT "organisation_change_event_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employee"
  ADD COLUMN IF NOT EXISTS "grade_id" UUID,
  ADD COLUMN IF NOT EXISTS "cost_centre_id" UUID,
  ADD COLUMN IF NOT EXISTS "attendance_policy_id" UUID,
  ADD COLUMN IF NOT EXISTS "default_shift_id" UUID,
  ADD COLUMN IF NOT EXISTS "preferred_name" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "status_reason" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "access_disable_date" DATE,
  ADD COLUMN IF NOT EXISTS "last_working_date" DATE;

CREATE INDEX IF NOT EXISTS "employee_tenant_grade_idx" ON "employee"("tenant_id", "grade_id");
CREATE INDEX IF NOT EXISTS "employee_tenant_position_idx" ON "employee"("tenant_id", "position_id");

DO $$ BEGIN
  ALTER TABLE "employee" ADD CONSTRAINT "employee_grade_id_fkey"
    FOREIGN KEY ("grade_id") REFERENCES "grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "employee" ADD CONSTRAINT "employee_cost_centre_id_fkey"
    FOREIGN KEY ("cost_centre_id") REFERENCES "cost_centre"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "employee" ADD CONSTRAINT "employee_attendance_policy_id_fkey"
    FOREIGN KEY ("attendance_policy_id") REFERENCES "attendance_policy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "employee" ADD CONSTRAINT "employee_default_shift_id_fkey"
    FOREIGN KEY ("default_shift_id") REFERENCES "shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "employment_record" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "legal_entity_id" UUID NOT NULL,
    "branch_id" UUID,
    "department_id" UUID,
    "position_id" UUID,
    "manager_id" UUID,
    "cost_centre_id" UUID,
    "grade_id" UUID,
    "employment_type" VARCHAR(20) NOT NULL,
    "work_arrangement" VARCHAR(40),
    "probation_end_date" DATE,
    "change_reason" VARCHAR(500),
    "change_type" VARCHAR(40) NOT NULL DEFAULT 'INITIAL',
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" UUID,
    CONSTRAINT "employment_record_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "employment_record_tenant_id_idx" ON "employment_record"("tenant_id");
CREATE INDEX IF NOT EXISTS "employment_record_tenant_employee_idx" ON "employment_record"("tenant_id", "employee_id");
CREATE INDEX IF NOT EXISTS "employment_record_effective_idx" ON "employment_record"("tenant_id", "employee_id", "effective_from");
CREATE INDEX IF NOT EXISTS "employment_record_effective_to_idx" ON "employment_record"("tenant_id", "effective_to");

ALTER TABLE "employment_record" ADD CONSTRAINT "employment_record_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employment_record" ADD CONSTRAINT "employment_record_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employment_record" ADD CONSTRAINT "employment_record_legal_entity_id_fkey"
  FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employment_record" ADD CONSTRAINT "employment_record_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employment_record" ADD CONSTRAINT "employment_record_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employment_record" ADD CONSTRAINT "employment_record_position_id_fkey"
  FOREIGN KEY ("position_id") REFERENCES "position"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employment_record" ADD CONSTRAINT "employment_record_manager_id_fkey"
  FOREIGN KEY ("manager_id") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employment_record" ADD CONSTRAINT "employment_record_cost_centre_id_fkey"
  FOREIGN KEY ("cost_centre_id") REFERENCES "cost_centre"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employment_record" ADD CONSTRAINT "employment_record_grade_id_fkey"
  FOREIGN KEY ("grade_id") REFERENCES "grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "compensation_record" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "pay_frequency" VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" UUID,
    CONSTRAINT "compensation_record_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "compensation_record_tenant_id_idx" ON "compensation_record"("tenant_id");
CREATE INDEX IF NOT EXISTS "compensation_record_tenant_employee_idx" ON "compensation_record"("tenant_id", "employee_id");
CREATE INDEX IF NOT EXISTS "compensation_record_effective_idx" ON "compensation_record"("tenant_id", "employee_id", "effective_from");

ALTER TABLE "compensation_record" ADD CONSTRAINT "compensation_record_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compensation_record" ADD CONSTRAINT "compensation_record_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "emergency_contact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "relationship" VARCHAR(40) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "email" VARCHAR(254),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "emergency_contact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "emergency_contact_tenant_id_idx" ON "emergency_contact"("tenant_id");
CREATE INDEX IF NOT EXISTS "emergency_contact_tenant_employee_idx" ON "emergency_contact"("tenant_id", "employee_id");

ALTER TABLE "emergency_contact" ADD CONSTRAINT "emergency_contact_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "emergency_contact" ADD CONSTRAINT "emergency_contact_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "employee_timeline_event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "event_type" VARCHAR(60) NOT NULL,
    "summary" VARCHAR(500) NOT NULL,
    "metadata" JSONB,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "actor_id" UUID,
    "visibility" VARCHAR(20) NOT NULL DEFAULT 'HR',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_timeline_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "employee_timeline_tenant_id_idx" ON "employee_timeline_event"("tenant_id");
CREATE INDEX IF NOT EXISTS "employee_timeline_employee_idx" ON "employee_timeline_event"("tenant_id", "employee_id", "occurred_at");

ALTER TABLE "employee_timeline_event" ADD CONSTRAINT "employee_timeline_event_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employee_timeline_event" ADD CONSTRAINT "employee_timeline_event_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "employee_import_job" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "file_name" VARCHAR(255),
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "valid_rows" INTEGER NOT NULL DEFAULT 0,
    "warning_rows" INTEGER NOT NULL DEFAULT 0,
    "error_rows" INTEGER NOT NULL DEFAULT 0,
    "committed_rows" INTEGER NOT NULL DEFAULT 0,
    "error_report_key" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "validated_at" TIMESTAMPTZ(6),
    "committed_at" TIMESTAMPTZ(6),
    CONSTRAINT "employee_import_job_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "employee_import_job_tenant_id_idx" ON "employee_import_job"("tenant_id");
CREATE INDEX IF NOT EXISTS "employee_import_job_status_idx" ON "employee_import_job"("tenant_id", "status");

ALTER TABLE "employee_import_job" ADD CONSTRAINT "employee_import_job_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "employee_import_row" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "import_job_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "errors" JSONB,
    "warnings" JSONB,
    "employee_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_import_row_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "employee_import_row_job_idx" ON "employee_import_row"("tenant_id", "import_job_id");

ALTER TABLE "employee_import_row" ADD CONSTRAINT "employee_import_row_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employee_import_row" ADD CONSTRAINT "employee_import_row_import_job_id_fkey"
  FOREIGN KEY ("import_job_id") REFERENCES "employee_import_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "attendance_period" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "locked_at" TIMESTAMPTZ(6),
    "locked_by" UUID,
    "unlock_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "attendance_period_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "attendance_period_tenant_range_uq" ON "attendance_period"("tenant_id", "period_start", "period_end");
CREATE INDEX IF NOT EXISTS "attendance_period_tenant_id_idx" ON "attendance_period"("tenant_id");
CREATE INDEX IF NOT EXISTS "attendance_period_status_idx" ON "attendance_period"("tenant_id", "status");

ALTER TABLE "attendance_period" ADD CONSTRAINT "attendance_period_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill current employment rows from employee master
INSERT INTO "employment_record" (
  "tenant_id", "employee_id", "legal_entity_id", "branch_id", "department_id",
  "position_id", "manager_id", "cost_centre_id", "grade_id", "employment_type",
  "change_type", "effective_from", "updated_at", "created_by"
)
SELECT
  e."tenant_id", e."id", e."legal_entity_id", e."branch_id", e."department_id",
  e."position_id", e."manager_id", e."cost_centre_id", e."grade_id", e."employment_type",
  'INITIAL', e."hire_date", CURRENT_TIMESTAMP, e."created_by"
FROM "employee" e
WHERE NOT EXISTS (
  SELECT 1 FROM "employment_record" er
  WHERE er."tenant_id" = e."tenant_id" AND er."employee_id" = e."id" AND er."effective_to" IS NULL
);
