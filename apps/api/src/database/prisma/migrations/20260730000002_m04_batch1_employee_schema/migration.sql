-- M04 Batch 1 — Employee Core HR: Employee Master
--   Tables: employee, employee_personal_detail
-- Expand-contract (ADR-010): additive only; no existing columns removed.
--
-- Creation order (FK dependencies):
--   employee → tenant, legal_entity, branch, department, position, employee (self)
--   employee_personal_detail → tenant, employee
--
-- ON DELETE behaviour:
--   employee → tenant:                RESTRICT
--   employee → legal_entity:          RESTRICT
--   employee → branch:                SET NULL
--   employee → department:            SET NULL
--   employee → position:              SET NULL
--   employee → employee (manager):    SET NULL
--   employee_personal_detail → tenant:    RESTRICT
--   employee_personal_detail → employee:  CASCADE (personal detail is owned by the employee)
--
-- RLS: every tenant-owned table gets ENABLE + FORCE + isolation POLICY.
-- Data classification: Confidential (names, contact, address, NOK).
-- Spec source: M04 specification — Batch 1 scope.

-- ─── 1. employee ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "employee" (
  "id"               UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"        UUID         NOT NULL,
  "legal_entity_id"  UUID         NOT NULL,
  "branch_id"        UUID,
  "department_id"    UUID,
  "position_id"      UUID,
  "manager_id"       UUID,
  "employee_number"  VARCHAR(40)  NOT NULL,
  "first_name"       VARCHAR(100) NOT NULL,
  "last_name"        VARCHAR(100) NOT NULL,
  "display_name"     VARCHAR(200) NOT NULL,
  "gender"           VARCHAR(20),
  "date_of_birth"    DATE,
  "national_id"      VARCHAR(20),
  "email_work"       VARCHAR(254) NOT NULL,
  "email_personal"   VARCHAR(254),
  "phone_work"       VARCHAR(30),
  "phone_mobile"     VARCHAR(30),
  "hire_date"        DATE         NOT NULL,
  "termination_date" DATE,
  "status"           VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  "employment_type"  VARCHAR(20)  NOT NULL,
  "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "created_by"       UUID,
  "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_by"       UUID,
  "row_version"      BIGINT       NOT NULL DEFAULT 1
);

-- Foreign keys
ALTER TABLE "employee"
  ADD CONSTRAINT "employee_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "employee_legal_entity_id_fkey"
    FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entity"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "employee_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "employee_department_id_fkey"
    FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "employee_position_id_fkey"
    FOREIGN KEY ("position_id") REFERENCES "position"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "employee_manager_id_fkey"
    FOREIGN KEY ("manager_id") REFERENCES "employee"("id") ON DELETE SET NULL;

-- Unique constraints
ALTER TABLE "employee"
  ADD CONSTRAINT "employee_tenant_legal_entity_number_uq"
    UNIQUE ("tenant_id", "legal_entity_id", "employee_number"),
  ADD CONSTRAINT "employee_tenant_email_work_uq"
    UNIQUE ("tenant_id", "email_work");

-- Indexes (all lead with tenant_id per indexing standards)
CREATE INDEX IF NOT EXISTS "employee_tenant_id_idx"
  ON "employee" ("tenant_id");
CREATE INDEX IF NOT EXISTS "employee_tenant_legal_entity_idx"
  ON "employee" ("tenant_id", "legal_entity_id");
CREATE INDEX IF NOT EXISTS "employee_tenant_department_idx"
  ON "employee" ("tenant_id", "department_id");
CREATE INDEX IF NOT EXISTS "employee_tenant_branch_idx"
  ON "employee" ("tenant_id", "branch_id");
CREATE INDEX IF NOT EXISTS "employee_tenant_manager_idx"
  ON "employee" ("tenant_id", "manager_id");
CREATE INDEX IF NOT EXISTS "employee_tenant_status_idx"
  ON "employee" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "employee_tenant_employment_type_idx"
  ON "employee" ("tenant_id", "employment_type");

-- Row-Level Security
ALTER TABLE "employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employee" FORCE ROW LEVEL SECURITY;
CREATE POLICY "employee_tenant_isolation" ON "employee"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ─── 2. employee_personal_detail ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "employee_personal_detail" (
  "id"                      UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"               UUID         NOT NULL,
  "employee_id"             UUID         NOT NULL,
  "nationality"             CHAR(2),
  "country_of_birth"        CHAR(2),
  "marital_status"          VARCHAR(20),
  "address_line1"           VARCHAR(200),
  "address_line2"           VARCHAR(200),
  "city"                    VARCHAR(100),
  "state_province"          VARCHAR(100),
  "postal_code"             VARCHAR(20),
  "country_code"            CHAR(2),
  "next_of_kin_name"        VARCHAR(200),
  "next_of_kin_relationship" VARCHAR(40),
  "next_of_kin_phone"       VARCHAR(30),
  "created_at"              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "row_version"             BIGINT       NOT NULL DEFAULT 1
);

-- Foreign keys
ALTER TABLE "employee_personal_detail"
  ADD CONSTRAINT "employee_personal_detail_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "employee_personal_detail_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE;

-- Unique constraint (1:1 with employee)
ALTER TABLE "employee_personal_detail"
  ADD CONSTRAINT "employee_personal_detail_employee_id_uq"
    UNIQUE ("employee_id");

-- Indexes
CREATE INDEX IF NOT EXISTS "employee_personal_detail_tenant_id_idx"
  ON "employee_personal_detail" ("tenant_id");
CREATE INDEX IF NOT EXISTS "employee_personal_detail_tenant_employee_idx"
  ON "employee_personal_detail" ("tenant_id", "employee_id");

-- Row-Level Security
ALTER TABLE "employee_personal_detail" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employee_personal_detail" FORCE ROW LEVEL SECURITY;
CREATE POLICY "employee_personal_detail_tenant_isolation" ON "employee_personal_detail"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
