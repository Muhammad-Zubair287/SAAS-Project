-- M07 Phase 4 — RosterAssignment engine
-- Dual-tip uniqueness (PD-5):
--   is_draft_tip            → at most one correction/new DRAFT tip per employee/workDate
--   is_effective_published  → at most one attendance-authoritative PUBLISHED row
-- Historical published rows remain with both flags false.

CREATE TABLE "roster_assignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "work_date" DATE NOT NULL,
    "shift_id" UUID,
    "branch_id" UUID,
    "roster_status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "is_rest_day" BOOLEAN NOT NULL DEFAULT false,
    "is_draft_tip" BOOLEAN NOT NULL DEFAULT false,
    "is_effective_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(6),
    "published_by" UUID,
    "supersedes_id" UUID,
    "assignment_source" VARCHAR(40) NOT NULL,
    "source_reference_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "row_version" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "roster_assignment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "roster_assignment_rest_shift_chk" CHECK (
      ("is_rest_day" = true AND "shift_id" IS NULL)
      OR ("is_rest_day" = false AND "shift_id" IS NOT NULL)
    ),
    CONSTRAINT "roster_assignment_status_chk" CHECK (
      "roster_status" IN ('DRAFT', 'PUBLISHED')
    ),
    CONSTRAINT "roster_assignment_draft_tip_chk" CHECK (
      ("is_draft_tip" = false)
      OR ("is_draft_tip" = true AND "roster_status" = 'DRAFT')
    ),
    CONSTRAINT "roster_assignment_effective_pub_chk" CHECK (
      ("is_effective_published" = false)
      OR ("is_effective_published" = true AND "roster_status" = 'PUBLISHED')
    )
);

CREATE INDEX "roster_assignment_tenant_work_date_status_idx"
  ON "roster_assignment"("tenant_id", "work_date", "roster_status");
CREATE INDEX "roster_assignment_tenant_employee_work_date_idx"
  ON "roster_assignment"("tenant_id", "employee_id", "work_date");
CREATE INDEX "roster_assignment_tenant_shift_idx"
  ON "roster_assignment"("tenant_id", "shift_id");
CREATE INDEX "roster_assignment_tenant_branch_idx"
  ON "roster_assignment"("tenant_id", "branch_id");
CREATE INDEX "roster_assignment_tenant_source_idx"
  ON "roster_assignment"("tenant_id", "assignment_source", "source_reference_id");
CREATE INDEX "roster_assignment_tenant_supersedes_idx"
  ON "roster_assignment"("tenant_id", "supersedes_id");

-- Prisma cannot express partial unique indexes; maintained via raw SQL.
CREATE UNIQUE INDEX "roster_assignment_draft_tip_uq"
  ON "roster_assignment"("tenant_id", "employee_id", "work_date")
  WHERE "is_draft_tip" = true;

CREATE UNIQUE INDEX "roster_assignment_effective_published_uq"
  ON "roster_assignment"("tenant_id", "employee_id", "work_date")
  WHERE "is_effective_published" = true;

ALTER TABLE "roster_assignment" ADD CONSTRAINT "roster_assignment_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "roster_assignment" ADD CONSTRAINT "roster_assignment_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "roster_assignment" ADD CONSTRAINT "roster_assignment_shift_id_fkey"
  FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "roster_assignment" ADD CONSTRAINT "roster_assignment_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "roster_assignment" ADD CONSTRAINT "roster_assignment_supersedes_id_fkey"
  FOREIGN KEY ("supersedes_id") REFERENCES "roster_assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "roster_assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roster_assignment" FORCE ROW LEVEL SECURITY;
CREATE POLICY roster_assignment_tenant_isolation ON "roster_assignment"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Additive AttendanceRecord provenance for roster pin
ALTER TABLE "attendance_record"
  ADD COLUMN IF NOT EXISTS "roster_assignment_id" UUID;

CREATE INDEX IF NOT EXISTS "attendance_record_tenant_roster_assignment_idx"
  ON "attendance_record"("tenant_id", "roster_assignment_id");

ALTER TABLE "attendance_record"
  DROP CONSTRAINT IF EXISTS "attendance_record_roster_assignment_id_fkey";
ALTER TABLE "attendance_record"
  ADD CONSTRAINT "attendance_record_roster_assignment_id_fkey"
  FOREIGN KEY ("roster_assignment_id") REFERENCES "roster_assignment"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
