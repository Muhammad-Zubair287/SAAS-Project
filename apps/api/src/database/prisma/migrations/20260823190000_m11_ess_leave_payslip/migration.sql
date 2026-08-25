-- M11 Employee Self-Service Leave + Payslip
-- Employee-facing leave balances/requests and published payslips.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_paid_status') THEN
    CREATE TYPE "leave_paid_status" AS ENUM ('PAID', 'UNPAID', 'MIXED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_unit') THEN
    CREATE TYPE "leave_unit" AS ENUM ('DAY', 'HOUR');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_type_status') THEN
    CREATE TYPE "leave_type_status" AS ENUM ('ACTIVE', 'INACTIVE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_ledger_entry_type') THEN
    CREATE TYPE "leave_ledger_entry_type" AS ENUM ('GRANT', 'ACCRUAL', 'RESERVATION', 'CONSUMPTION', 'RELEASE', 'ADJUSTMENT', 'EXPIRY', 'CARRY_FORWARD');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_ledger_source_type') THEN
    CREATE TYPE "leave_ledger_source_type" AS ENUM ('LEAVE_REQUEST', 'POLICY_JOB', 'MANUAL_ADJUSTMENT', 'MIGRATION', 'SEED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_request_status') THEN
    CREATE TYPE "leave_request_status" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED', 'COMPLETED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_day_part') THEN
    CREATE TYPE "leave_day_part" AS ENUM ('FULL', 'FIRST_HALF', 'SECOND_HALF');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_payroll_impact') THEN
    CREATE TYPE "leave_payroll_impact" AS ENUM ('NONE', 'PAID', 'UNPAID');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payslip_status') THEN
    CREATE TYPE "payslip_status" AS ENUM ('GENERATED', 'PUBLISHED', 'WITHDRAWN', 'REPLACED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "leave_type" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "paid_status" "leave_paid_status" NOT NULL,
  "unit" "leave_unit" NOT NULL,
  "half_day_allowed" BOOLEAN NOT NULL DEFAULT false,
  "status" "leave_type_status" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "row_version" BIGINT NOT NULL DEFAULT 1,
  CONSTRAINT "leave_type_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "leave_type_tenant_code_uq"
  ON "leave_type"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "leave_type_tenant_status_idx"
  ON "leave_type"("tenant_id", "status");

CREATE TABLE IF NOT EXISTS "leave_ledger_entry" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "leave_type_id" UUID NOT NULL,
  "policy_id" UUID,
  "entry_type" "leave_ledger_entry_type" NOT NULL,
  "quantity" DECIMAL(10,4) NOT NULL,
  "effective_date" DATE NOT NULL,
  "expires_on" DATE,
  "source_type" "leave_ledger_source_type" NOT NULL,
  "source_id" UUID,
  "description" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "leave_ledger_entry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "leave_ledger_entry_tenant_employee_type_effective_idx"
  ON "leave_ledger_entry"("tenant_id", "employee_id", "leave_type_id", "effective_date");
CREATE INDEX IF NOT EXISTS "leave_ledger_entry_tenant_source_idx"
  ON "leave_ledger_entry"("tenant_id", "source_type", "source_id");

CREATE TABLE IF NOT EXISTS "leave_request" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "leave_type_id" UUID NOT NULL,
  "policy_id" UUID,
  "starts_on" DATE NOT NULL,
  "ends_on" DATE NOT NULL,
  "requested_quantity" DECIMAL(10,4) NOT NULL,
  "reason" TEXT,
  "evidence_file_key" VARCHAR(500),
  "emergency" BOOLEAN NOT NULL DEFAULT false,
  "status" "leave_request_status" NOT NULL DEFAULT 'DRAFT',
  "submitted_at" TIMESTAMPTZ(6),
  "decided_at" TIMESTAMPTZ(6),
  "decided_by" UUID,
  "balance_snapshot" JSONB,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "row_version" BIGINT NOT NULL DEFAULT 1,
  CONSTRAINT "leave_request_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "leave_request_tenant_employee_starts_idx"
  ON "leave_request"("tenant_id", "employee_id", "starts_on");
CREATE INDEX IF NOT EXISTS "leave_request_tenant_employee_status_idx"
  ON "leave_request"("tenant_id", "employee_id", "status");
CREATE INDEX IF NOT EXISTS "leave_request_tenant_status_idx"
  ON "leave_request"("tenant_id", "status");

CREATE TABLE IF NOT EXISTS "leave_request_day" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "leave_request_id" UUID NOT NULL,
  "leave_date" DATE NOT NULL,
  "quantity" DECIMAL(10,4) NOT NULL,
  "day_part" "leave_day_part" NOT NULL,
  "holiday" BOOLEAN NOT NULL DEFAULT false,
  "rest_day" BOOLEAN NOT NULL DEFAULT false,
  "payroll_impact" "leave_payroll_impact" NOT NULL DEFAULT 'NONE',
  CONSTRAINT "leave_request_day_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "leave_request_day_uq"
  ON "leave_request_day"("tenant_id", "leave_request_id", "leave_date", "day_part");
CREATE INDEX IF NOT EXISTS "leave_request_day_tenant_date_idx"
  ON "leave_request_day"("tenant_id", "leave_date");

CREATE TABLE IF NOT EXISTS "payslip" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "payroll_version_id" UUID,
  "period_label" VARCHAR(120) NOT NULL,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "gross_amount" DECIMAL(14,2) NOT NULL,
  "net_amount" DECIMAL(14,2) NOT NULL,
  "earnings" JSONB NOT NULL,
  "deductions" JSONB NOT NULL,
  "status" "payslip_status" NOT NULL DEFAULT 'GENERATED',
  "published_at" TIMESTAMPTZ(6),
  "document_file_key" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "row_version" BIGINT NOT NULL DEFAULT 1,
  CONSTRAINT "payslip_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "payslip_tenant_employee_published_idx"
  ON "payslip"("tenant_id", "employee_id", "published_at");
CREATE INDEX IF NOT EXISTS "payslip_tenant_status_idx"
  ON "payslip"("tenant_id", "status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_type_tenant_id_fkey') THEN
    ALTER TABLE "leave_type"
      ADD CONSTRAINT "leave_type_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_ledger_entry_tenant_id_fkey') THEN
    ALTER TABLE "leave_ledger_entry"
      ADD CONSTRAINT "leave_ledger_entry_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_ledger_entry_employee_id_fkey') THEN
    ALTER TABLE "leave_ledger_entry"
      ADD CONSTRAINT "leave_ledger_entry_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_ledger_entry_leave_type_id_fkey') THEN
    ALTER TABLE "leave_ledger_entry"
      ADD CONSTRAINT "leave_ledger_entry_leave_type_id_fkey"
      FOREIGN KEY ("leave_type_id") REFERENCES "leave_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_request_tenant_id_fkey') THEN
    ALTER TABLE "leave_request"
      ADD CONSTRAINT "leave_request_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_request_employee_id_fkey') THEN
    ALTER TABLE "leave_request"
      ADD CONSTRAINT "leave_request_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_request_leave_type_id_fkey') THEN
    ALTER TABLE "leave_request"
      ADD CONSTRAINT "leave_request_leave_type_id_fkey"
      FOREIGN KEY ("leave_type_id") REFERENCES "leave_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_request_day_tenant_id_fkey') THEN
    ALTER TABLE "leave_request_day"
      ADD CONSTRAINT "leave_request_day_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_request_day_leave_request_id_fkey') THEN
    ALTER TABLE "leave_request_day"
      ADD CONSTRAINT "leave_request_day_leave_request_id_fkey"
      FOREIGN KEY ("leave_request_id") REFERENCES "leave_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslip_tenant_id_fkey') THEN
    ALTER TABLE "payslip"
      ADD CONSTRAINT "payslip_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslip_employee_id_fkey') THEN
    ALTER TABLE "payslip"
      ADD CONSTRAINT "payslip_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
