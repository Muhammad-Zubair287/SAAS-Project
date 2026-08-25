-- Tenant Admin Console (Scope A): branding extensions, settings, security policy,
-- upgrade requests, AppUser admin flags.

-- ─── tenant_branding extensions ───────────────────────────────────────────────
ALTER TABLE "tenant_branding"
  ADD COLUMN IF NOT EXISTS "login_logo_url" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "secondary_colour" VARCHAR(7),
  ADD COLUMN IF NOT EXISTS "application_name" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "email_sender_name" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "settings" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "created_by" UUID,
  ADD COLUMN IF NOT EXISTS "updated_by" UUID,
  ADD COLUMN IF NOT EXISTS "row_version" BIGINT NOT NULL DEFAULT 1;

-- ─── tenant_settings ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "tenant_settings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "registration_number" VARCHAR(120),
  "industry" VARCHAR(120),
  "employee_size_band" VARCHAR(40),
  "address_line1" VARCHAR(200),
  "address_line2" VARCHAR(200),
  "city" VARCHAR(100),
  "state_province" VARCHAR(100),
  "postal_code" VARCHAR(30),
  "contact_email" VARCHAR(320),
  "contact_phone" VARCHAR(40),
  "financial_year_start" VARCHAR(10),
  "payroll_month_config" VARCHAR(40),
  "date_format" VARCHAR(40),
  "number_format" VARCHAR(40),
  "currency_display" VARCHAR(40),
  "week_start" INTEGER,
  "working_week_pattern" JSONB,
  "enabled_locales" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" UUID,
  "row_version" BIGINT NOT NULL DEFAULT 1,
  CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_settings_tenant_id_key" ON "tenant_settings"("tenant_id");

DO $$ BEGIN
  ALTER TABLE "tenant_settings"
    ADD CONSTRAINT "tenant_settings_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── tenant_security_policy ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "tenant_security_policy" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "password_min_length" INTEGER NOT NULL DEFAULT 10,
  "password_require_upper" BOOLEAN NOT NULL DEFAULT true,
  "password_require_lower" BOOLEAN NOT NULL DEFAULT true,
  "password_require_digit" BOOLEAN NOT NULL DEFAULT true,
  "password_require_symbol" BOOLEAN NOT NULL DEFAULT false,
  "mfa_required_for_admins" BOOLEAN NOT NULL DEFAULT false,
  "session_ttl_hours" INTEGER NOT NULL DEFAULT 8,
  "max_login_attempts" INTEGER NOT NULL DEFAULT 5,
  "trusted_email_domains" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" UUID,
  "row_version" BIGINT NOT NULL DEFAULT 1,
  CONSTRAINT "tenant_security_policy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_security_policy_tenant_id_key" ON "tenant_security_policy"("tenant_id");

DO $$ BEGIN
  ALTER TABLE "tenant_security_policy"
    ADD CONSTRAINT "tenant_security_policy_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── tenant_upgrade_request ───────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "tenant_upgrade_request_status" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "tenant_upgrade_request" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "requested_plan_id" UUID,
  "requested_plan_key" VARCHAR(80),
  "note" TEXT,
  "billing_contact_email" VARCHAR(320),
  "status" "tenant_upgrade_request_status" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" UUID,
  CONSTRAINT "tenant_upgrade_request_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "tenant_upgrade_request_tenant_id_status_idx"
  ON "tenant_upgrade_request"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "tenant_upgrade_request_tenant_id_created_at_idx"
  ON "tenant_upgrade_request"("tenant_id", "created_at");

DO $$ BEGIN
  ALTER TABLE "tenant_upgrade_request"
    ADD CONSTRAINT "tenant_upgrade_request_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "tenant_upgrade_request"
    ADD CONSTRAINT "tenant_upgrade_request_requested_plan_id_fkey"
    FOREIGN KEY ("requested_plan_id") REFERENCES "plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── app_user admin flags ─────────────────────────────────────────────────────
ALTER TABLE "app_user"
  ADD COLUMN IF NOT EXISTS "require_password_reset" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "require_mfa" BOOLEAN NOT NULL DEFAULT false;
