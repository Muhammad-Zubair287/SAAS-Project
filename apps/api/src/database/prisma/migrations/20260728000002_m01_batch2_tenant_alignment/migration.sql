-- M01 Batch 2 — Tenant aggregate alignment
-- Expand-contract (ADR-010): new columns added, old columns retained in DB.
-- Old columns (currency, timeZone, primaryLocale, hostingRegion) are NOT dropped here
-- to allow zero-downtime rollback. They will be removed in a future cleanup migration.
-- Prisma now maps to the new column names via @map decorators.

-- ─── 1. Extend tenant_status enum (additive, safe) ────────────────────────────
-- ALTER TYPE … ADD VALUE must run outside a transaction on PostgreSQL < 12.
-- On PostgreSQL 12+ it is safe inside transactions.
ALTER TYPE tenant_status ADD VALUE IF NOT EXISTS 'TRIAL';
ALTER TYPE tenant_status ADD VALUE IF NOT EXISTS 'GRACE';
ALTER TYPE tenant_status ADD VALUE IF NOT EXISTS 'CLOSED';

-- ─── 2. Modify existing tenant table ─────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'tenant'
  ) THEN

    -- 2a. Drop old FK constraints defensively (Prisma may have created these).
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'tenant_planKey_fkey' AND table_name = 'tenant'
    ) THEN
      ALTER TABLE tenant DROP CONSTRAINT "tenant_planKey_fkey";
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'tenant_hostingRegion_fkey' AND table_name = 'tenant'
    ) THEN
      ALTER TABLE tenant DROP CONSTRAINT "tenant_hostingRegion_fkey";
    END IF;

    -- 2b. Extend column lengths per spec.
    ALTER TABLE tenant ALTER COLUMN "legalName" TYPE VARCHAR(200);
    ALTER TABLE tenant ALTER COLUMN "slug" TYPE VARCHAR(80);

    -- 2c. Add base_currency; populate from existing currency column.
    ALTER TABLE tenant ADD COLUMN IF NOT EXISTS base_currency CHAR(3);
    UPDATE tenant SET base_currency = currency WHERE base_currency IS NULL AND currency IS NOT NULL;
    ALTER TABLE tenant ALTER COLUMN base_currency SET NOT NULL;

    -- 2d. Add default_timezone; populate from existing timeZone column.
    ALTER TABLE tenant ADD COLUMN IF NOT EXISTS default_timezone VARCHAR(80);
    UPDATE tenant SET default_timezone = "timeZone" WHERE default_timezone IS NULL AND "timeZone" IS NOT NULL;
    ALTER TABLE tenant ALTER COLUMN default_timezone SET NOT NULL;

    -- 2e. Add default_locale; populate from existing primaryLocale column.
    ALTER TABLE tenant ADD COLUMN IF NOT EXISTS default_locale VARCHAR(20);
    UPDATE tenant SET default_locale = "primaryLocale" WHERE default_locale IS NULL AND "primaryLocale" IS NOT NULL;
    ALTER TABLE tenant ALTER COLUMN default_locale SET NOT NULL;

    -- 2f. Add deployment_region_id; populate via JOIN on hostingRegion code.
    ALTER TABLE tenant ADD COLUMN IF NOT EXISTS deployment_region_id UUID;
    UPDATE tenant t
    SET deployment_region_id = dr.id
    FROM deployment_region dr
    WHERE dr.code = t."hostingRegion"
      AND t.deployment_region_id IS NULL;
    ALTER TABLE tenant ALTER COLUMN deployment_region_id SET NOT NULL;

    -- 2g. Add plan_id (nullable); populate via JOIN on planKey code.
    ALTER TABLE tenant ADD COLUMN IF NOT EXISTS plan_id UUID;
    UPDATE tenant t
    SET plan_id = p.id
    FROM plan p
    WHERE p.code = t."planKey"
      AND t.plan_id IS NULL;

    -- 2h. Make compatibility columns nullable.
    ALTER TABLE tenant ALTER COLUMN "planKey" DROP NOT NULL;
    ALTER TABLE tenant ALTER COLUMN "seatLimit" DROP NOT NULL;
    ALTER TABLE tenant ALTER COLUMN "createdBy" DROP NOT NULL;
    ALTER TABLE tenant ALTER COLUMN "updatedBy" DROP NOT NULL;

  ELSE
    -- Fresh install: create tenant table with spec-aligned column names.
    -- (This path executes only if the table was never created by Phase 3.)
    CREATE TABLE tenant (
      id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      "displayName"       VARCHAR(160) NOT NULL,
      "legalName"         VARCHAR(200) NOT NULL,
      slug                VARCHAR(80)  NOT NULL UNIQUE,
      "countryCode"       CHAR(2)      NOT NULL,
      base_currency       CHAR(3)      NOT NULL,
      default_timezone    VARCHAR(80)  NOT NULL,
      default_locale      VARCHAR(20)  NOT NULL,
      deployment_region_id UUID        NOT NULL,
      plan_id             UUID,
      "planKey"           VARCHAR(80),
      "seatLimit"         INT,
      status              tenant_status NOT NULL DEFAULT 'DRAFT',
      "activatedAt"       TIMESTAMPTZ,
      "suspendedAt"       TIMESTAMPTZ,
      "suspendedReason"   TEXT,
      "suspendedBy"       UUID,
      "archivedAt"        TIMESTAMPTZ,
      "createdAt"         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      "createdBy"         VARCHAR(160),
      "updatedAt"         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      "updatedBy"         VARCHAR(160),
      "rowVersion"        BIGINT       NOT NULL DEFAULT 1
    );
  END IF;
END $$;

-- ─── 2b. Create tenant_branding and tenant_usage_snapshot (always idempotent) ──
CREATE TABLE IF NOT EXISTS tenant_branding (
  id            UUID         NOT NULL DEFAULT gen_random_uuid(),
  tenant_id     UUID         NOT NULL,
  logo_url      VARCHAR(500),
  primary_color VARCHAR(7),
  favicon_url   VARCHAR(500),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT tenant_branding_pkey      PRIMARY KEY (id),
  CONSTRAINT tenant_branding_tenant_id_key UNIQUE (tenant_id)
);

CREATE TABLE IF NOT EXISTS tenant_usage_snapshot (
  id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL,
  snapshot_date       DATE        NOT NULL,
  active_employees    INT         NOT NULL DEFAULT 0,
  total_employees     INT         NOT NULL DEFAULT 0,
  storage_used_bytes  BIGINT      NOT NULL DEFAULT 0,
  api_calls_month     INT         NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tenant_usage_snapshot_pkey                        PRIMARY KEY (id),
  CONSTRAINT tenant_usage_snapshot_tenant_id_snapshot_date_key UNIQUE (tenant_id, snapshot_date)
);

-- ─── 3. FK: deployment_region_id → deployment_region.id ──────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tenant_deployment_region_id_fkey' AND table_name = 'tenant'
  ) THEN
    ALTER TABLE tenant
      ADD CONSTRAINT tenant_deployment_region_id_fkey
      FOREIGN KEY (deployment_region_id) REFERENCES deployment_region(id);
  END IF;
END $$;

-- ─── 4. FK: plan_id → plan.id ────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tenant_plan_id_fkey' AND table_name = 'tenant'
  ) THEN
    ALTER TABLE tenant
      ADD CONSTRAINT tenant_plan_id_fkey
      FOREIGN KEY (plan_id) REFERENCES plan(id);
  END IF;
END $$;

-- ─── 5. FK: tenant_branding.tenant_id → tenant.id ────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tenant_branding_tenant_id_fkey' AND table_name = 'tenant_branding'
  ) THEN
    ALTER TABLE tenant_branding
      ADD CONSTRAINT tenant_branding_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES tenant(id);
  END IF;
END $$;

-- ─── 6. FK: tenant_usage_snapshot.tenant_id → tenant.id ──────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tenant_usage_snapshot_tenant_id_fkey' AND table_name = 'tenant_usage_snapshot'
  ) THEN
    ALTER TABLE tenant_usage_snapshot
      ADD CONSTRAINT tenant_usage_snapshot_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES tenant(id);
  END IF;
END $$;

-- ─── 7. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS tenant_deployment_region_id_idx ON tenant (deployment_region_id);
CREATE INDEX IF NOT EXISTS tenant_plan_id_idx            ON tenant (plan_id);
CREATE INDEX IF NOT EXISTS tenant_usage_snapshot_tenant_id_idx ON tenant_usage_snapshot (tenant_id, snapshot_date);
