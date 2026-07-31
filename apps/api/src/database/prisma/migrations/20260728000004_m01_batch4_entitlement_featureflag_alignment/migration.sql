-- M01 Batch 4 — TenantEntitlement and TenantFeatureFlag alignment
-- Expand-contract (ADR-010): new spec columns added; old compatibility columns retained.
--
-- Compatibility columns retained because:
--   tenant_entitlement: tenant.service.ts writes entitlementKey, value, overriddenBy via
--     upsert and uses the tenantId_entitlementKey unique constraint as the upsert where key.
--   tenant_feature_flag: no active service writes rows; compat columns retained for existing data.
-- Compatibility columns will be removed in the cleanup batch after consumers are updated.

-- ─── 1. tenant_entitlement ─────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'tenant_entitlement'
  ) THEN

    -- 1a. Drop old FK: entitlementKey → entitlement.code.
    --     entitlementKey becomes a loose compat varchar (same pattern as planKey on tenant_subscription).
    --     New FK entitlement_id → entitlement.id is added in step 2.
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'tenant_entitlement_entitlementKey_fkey'
        AND table_name = 'tenant_entitlement'
    ) THEN
      ALTER TABLE tenant_entitlement DROP CONSTRAINT "tenant_entitlement_entitlementKey_fkey";
    END IF;

    -- 1b. Add entitlement_id (spec FK to entitlement.id); nullable for compatibility.
    ALTER TABLE tenant_entitlement ADD COLUMN IF NOT EXISTS entitlement_id UUID;

    -- 1c. Populate entitlement_id by joining on entitlementKey → entitlement.code.
    UPDATE tenant_entitlement te
    SET entitlement_id = e.id
    FROM entitlement e
    WHERE e.code = te."entitlementKey"
      AND te.entitlement_id IS NULL;

    -- 1d. Add value_json jsonb (spec value field); nullable for compatibility.
    --     Named value_json to avoid DB column name collision with the compat varchar 'value' column.
    ALTER TABLE tenant_entitlement ADD COLUMN IF NOT EXISTS value_json JSONB;

    -- 1e. Add effective_from timestamptz NOT NULL DEFAULT NOW().
    --     DEFAULT NOW() means existing rows receive the migration timestamp; new inserts
    --     need not supply it — Prisma @default(now()) uses the DB default.
    ALTER TABLE tenant_entitlement ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW();

    -- 1f. Add effective_to timestamptz nullable (null = currently active).
    ALTER TABLE tenant_entitlement ADD COLUMN IF NOT EXISTS effective_to TIMESTAMPTZ;

    -- 1g. Add source varchar(30) nullable (spec: NOT NULL; deferred because
    --     tenant.service.ts does not write source — enforce NOT NULL in cleanup batch).
    ALTER TABLE tenant_entitlement ADD COLUMN IF NOT EXISTS source VARCHAR(30);

    -- 1h. Add reason text nullable.
    ALTER TABLE tenant_entitlement ADD COLUMN IF NOT EXISTS reason TEXT;

    -- 1i. Add created_by uuid nullable (FK app_user.id per spec).
    ALTER TABLE tenant_entitlement ADD COLUMN IF NOT EXISTS created_by UUID;

    -- 1j. Add updated_by uuid nullable (FK app_user.id per spec).
    ALTER TABLE tenant_entitlement ADD COLUMN IF NOT EXISTS updated_by UUID;

    -- 1k. Add row_version bigint NOT NULL DEFAULT 1 (optimistic concurrency).
    ALTER TABLE tenant_entitlement ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

  ELSE
    -- Fresh install: create tenant_entitlement with spec-aligned structure.
    -- Compatibility columns included so tenant.service.ts inserts succeed
    -- until that service is updated (outside Batch 4 scope).
    CREATE TABLE tenant_entitlement (
      id               UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
      "tenantId"       UUID         NOT NULL REFERENCES tenant(id),
      entitlement_id   UUID,
      value_json       JSONB,
      effective_from   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      effective_to     TIMESTAMPTZ,
      source           VARCHAR(30),
      reason           TEXT,
      created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      created_by       UUID,
      updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_by       UUID,
      row_version      BIGINT       NOT NULL DEFAULT 1,
      -- Compatibility columns (not in spec; removed in cleanup batch)
      "entitlementKey" VARCHAR(80)  NOT NULL,
      value            VARCHAR(200) NOT NULL,
      "overriddenBy"   UUID,
      CONSTRAINT "tenant_entitlement_tenantId_entitlementKey_key"
        UNIQUE ("tenantId", "entitlementKey")
    );
  END IF;
END $$;

-- ─── 2. FK: entitlement_id → entitlement.id ────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tenant_entitlement_entitlement_id_fkey'
      AND table_name = 'tenant_entitlement'
  ) THEN
    ALTER TABLE tenant_entitlement
      ADD CONSTRAINT tenant_entitlement_entitlement_id_fkey
      FOREIGN KEY (entitlement_id) REFERENCES entitlement(id);
  END IF;
END $$;

-- ─── 3. Spec index on tenant_entitlement ───────────────────────────────────────
-- tenantId uses its camelCase DB column name (no @map on that field in original schema).
CREATE INDEX IF NOT EXISTS tenant_entitlement_eid_efrom_idx
  ON tenant_entitlement ("tenantId", entitlement_id, effective_from);

-- ─── 4. tenant_feature_flag ────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'tenant_feature_flag'
  ) THEN

    -- 4a. Add flag_key varchar(100) (spec field; replaces old camelCase 'flagKey' DB column).
    ALTER TABLE tenant_feature_flag ADD COLUMN IF NOT EXISTS flag_key VARCHAR(100);

    -- 4b. Populate flag_key from existing flagKey column for existing rows.
    UPDATE tenant_feature_flag
    SET flag_key = "flagKey"
    WHERE flag_key IS NULL AND "flagKey" IS NOT NULL;

    -- 4c. Enforce flag_key NOT NULL (spec requirement; all existing rows populated above).
    ALTER TABLE tenant_feature_flag ALTER COLUMN flag_key SET NOT NULL;

    -- 4d. Add enabled boolean NOT NULL DEFAULT false (spec rename of isEnabled).
    ALTER TABLE tenant_feature_flag ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT false;

    -- 4e. Copy isEnabled → enabled for existing rows that were enabled.
    UPDATE tenant_feature_flag
    SET enabled = true
    WHERE "isEnabled" = true AND enabled = false;

    -- 4f. Add configuration jsonb NOT NULL DEFAULT '{}' (spec field; no prior equivalent).
    ALTER TABLE tenant_feature_flag ADD COLUMN IF NOT EXISTS configuration JSONB NOT NULL DEFAULT '{}';

    -- 4g. Add effective_from timestamptz NOT NULL DEFAULT NOW().
    ALTER TABLE tenant_feature_flag ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW();

    -- 4h. Add effective_to timestamptz nullable.
    ALTER TABLE tenant_feature_flag ADD COLUMN IF NOT EXISTS effective_to TIMESTAMPTZ;

    -- 4i. Add created_by uuid nullable.
    ALTER TABLE tenant_feature_flag ADD COLUMN IF NOT EXISTS created_by UUID;

    -- 4j. Add updated_by uuid nullable.
    ALTER TABLE tenant_feature_flag ADD COLUMN IF NOT EXISTS updated_by UUID;

    -- 4k. Add row_version bigint NOT NULL DEFAULT 1.
    ALTER TABLE tenant_feature_flag ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;

  ELSE
    -- Fresh install: create tenant_feature_flag with spec-aligned structure.
    -- Compatibility columns included for data continuity (no active service writes rows).
    CREATE TABLE tenant_feature_flag (
      id             UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
      "tenantId"     UUID         NOT NULL REFERENCES tenant(id),
      flag_key       VARCHAR(100) NOT NULL,
      enabled        BOOLEAN      NOT NULL DEFAULT false,
      configuration  JSONB        NOT NULL DEFAULT '{}',
      effective_from TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      effective_to   TIMESTAMPTZ,
      created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      created_by     UUID,
      updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_by     UUID,
      row_version    BIGINT       NOT NULL DEFAULT 1,
      -- Compatibility columns (not in spec; removed in cleanup batch)
      "flagKey"    VARCHAR(80),
      "isEnabled"  BOOLEAN       NOT NULL DEFAULT false,
      "enabledBy"  UUID,
      "enabledAt"  TIMESTAMPTZ,
      CONSTRAINT "tenant_feature_flag_tenantId_flagKey_key"
        UNIQUE ("tenantId", "flagKey")
    );
  END IF;
END $$;

-- ─── 5. Spec unique constraint on tenant_feature_flag ──────────────────────────
-- (tenant_id, flag_key, effective_from) — using camelCase tenantId DB column.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tenant_feature_flag_tenantId_flagKey_effectiveFrom_key'
      AND table_name = 'tenant_feature_flag'
  ) THEN
    ALTER TABLE tenant_feature_flag
      ADD CONSTRAINT "tenant_feature_flag_tenantId_flagKey_effectiveFrom_key"
      UNIQUE ("tenantId", flag_key, effective_from);
  END IF;
END $$;

-- ─── 6. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS tenant_feature_flag_tenant_idx
  ON tenant_feature_flag ("tenantId");
