-- M01 Batch 5 — SupportGrant alignment
-- Expand-contract (ADR-010): new spec columns added with snake_case names;
-- old camelCase columns retained as compatibility columns.
--
-- Compatibility columns retained because:
--   support_grant: SupportGrantRepository.revoke() writes revokedBy and revokedReason;
--     all service/repository code references camelCase Prisma field names.
--     Prisma @map decorators switch the DB column names transparently.
--   Old camelCase DB columns (tenantId, supportUserId, etc.) remain as DB artifacts;
--     Prisma now reads/writes only the snake_case columns via @map.
-- Compatibility columns will be removed in the cleanup batch after consumers are updated.

-- ─── 1. Modify existing support_grant table ────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'support_grant'
  ) THEN

    -- 1a. Add tenant_id (spec rename of tenantId); nullable for populate-then-enforce.
    ALTER TABLE support_grant ADD COLUMN IF NOT EXISTS tenant_id UUID;

    -- 1b. Populate tenant_id from existing tenantId column.
    UPDATE support_grant SET tenant_id = "tenantId" WHERE tenant_id IS NULL AND "tenantId" IS NOT NULL;

    -- 1c. Enforce tenant_id NOT NULL.
    ALTER TABLE support_grant ALTER COLUMN tenant_id SET NOT NULL;

    -- 1d. Add support_user_id (spec rename of supportUserId).
    ALTER TABLE support_grant ADD COLUMN IF NOT EXISTS support_user_id UUID;
    UPDATE support_grant SET support_user_id = "supportUserId" WHERE support_user_id IS NULL AND "supportUserId" IS NOT NULL;
    ALTER TABLE support_grant ALTER COLUMN support_user_id SET NOT NULL;

    -- 1e. Add requested_by_user_id (spec rename of requestedByUserId).
    ALTER TABLE support_grant ADD COLUMN IF NOT EXISTS requested_by_user_id UUID;
    UPDATE support_grant SET requested_by_user_id = "requestedByUserId" WHERE requested_by_user_id IS NULL AND "requestedByUserId" IS NOT NULL;
    ALTER TABLE support_grant ALTER COLUMN requested_by_user_id SET NOT NULL;

    -- 1f. Add approved_by_user_id (spec rename of approvedByUserId); nullable.
    ALTER TABLE support_grant ADD COLUMN IF NOT EXISTS approved_by_user_id UUID;
    UPDATE support_grant SET approved_by_user_id = "approvedByUserId" WHERE approved_by_user_id IS NULL AND "approvedByUserId" IS NOT NULL;

    -- 1g. Add starts_at (spec rename of startsAt).
    ALTER TABLE support_grant ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
    UPDATE support_grant SET starts_at = "startsAt" WHERE starts_at IS NULL AND "startsAt" IS NOT NULL;
    ALTER TABLE support_grant ALTER COLUMN starts_at SET NOT NULL;

    -- 1h. Add ends_at (spec rename of endsAt).
    ALTER TABLE support_grant ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
    UPDATE support_grant SET ends_at = "endsAt" WHERE ends_at IS NULL AND "endsAt" IS NOT NULL;
    ALTER TABLE support_grant ALTER COLUMN ends_at SET NOT NULL;

    -- 1i. Add revoked_at (spec rename of revokedAt); nullable.
    ALTER TABLE support_grant ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
    UPDATE support_grant SET revoked_at = "revokedAt" WHERE revoked_at IS NULL AND "revokedAt" IS NOT NULL;

    -- 1j. Add created_at (spec rename of createdAt).
    ALTER TABLE support_grant ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE support_grant SET created_at = "createdAt" WHERE "createdAt" IS NOT NULL;

    -- 1k. Add updated_at (spec rename of updatedAt); Prisma @updatedAt manages this.
    ALTER TABLE support_grant ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE support_grant SET updated_at = "updatedAt" WHERE "updatedAt" IS NOT NULL;

    -- 1l. Add row_version (spec rename of rowVersion).
    ALTER TABLE support_grant ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 1;
    UPDATE support_grant SET row_version = "rowVersion" WHERE "rowVersion" IS NOT NULL;

    -- 1m. Add created_by (spec field; no prior equivalent in table).
    --     Nullable — no existing service writes this. Promoted to NOT NULL in cleanup batch.
    ALTER TABLE support_grant ADD COLUMN IF NOT EXISTS created_by UUID;

    -- 1n. Add updated_by (spec field; no prior equivalent in table).
    --     Nullable — no existing service writes this. Promoted to NOT NULL in cleanup batch.
    ALTER TABLE support_grant ADD COLUMN IF NOT EXISTS updated_by UUID;

    -- 1o. Drop old FK on tenantId (camelCase DB column) if present.
    --     Prisma may have named it support_grant_tenantId_fkey.
    --     New FK on tenant_id (snake_case) is added in step 2.
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'support_grant_tenantId_fkey'
        AND table_name = 'support_grant'
    ) THEN
      ALTER TABLE support_grant DROP CONSTRAINT "support_grant_tenantId_fkey";
    END IF;

  ELSE
    -- Fresh install: create support_grant with spec-aligned snake_case columns.
    -- Compatibility columns included so existing repository code continues to work
    -- until SupportGrantRepository is updated (outside Batch 5 scope).
    CREATE TABLE support_grant (
      id                    UUID                NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id             UUID                NOT NULL,
      support_user_id       UUID                NOT NULL,
      requested_by_user_id  UUID                NOT NULL,
      approved_by_user_id   UUID,
      scope                 JSONB               NOT NULL DEFAULT '[]',
      reason                TEXT                NOT NULL,
      starts_at             TIMESTAMPTZ         NOT NULL,
      ends_at               TIMESTAMPTZ         NOT NULL,
      revoked_at            TIMESTAMPTZ,
      status                support_grant_status NOT NULL DEFAULT 'PENDING',
      created_at            TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
      created_by            UUID,
      updated_at            TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
      updated_by            UUID,
      row_version           BIGINT              NOT NULL DEFAULT 1,
      -- Compatibility columns (not in spec ERD; retained for SupportGrantRepository.revoke())
      "tenantId"            UUID,
      "supportUserId"       UUID,
      "requestedByUserId"   UUID,
      "approvedByUserId"    UUID,
      "startsAt"            TIMESTAMPTZ,
      "endsAt"              TIMESTAMPTZ,
      "revokedAt"           TIMESTAMPTZ,
      "createdAt"           TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
      "updatedAt"           TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
      "rowVersion"          BIGINT              NOT NULL DEFAULT 1,
      "revokedBy"           UUID,
      "revokedReason"       TEXT
    );
  END IF;
END $$;

-- ─── 2. FK: tenant_id → tenant.id ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'support_grant_tenant_id_fkey'
      AND table_name = 'support_grant'
  ) THEN
    ALTER TABLE support_grant
      ADD CONSTRAINT support_grant_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES tenant(id);
  END IF;
END $$;

-- ─── 3. Spec indexes (snake_case columns) ──────────────────────────────────────
-- Old camelCase-column indexes remain as DB artifacts; Prisma no longer declares them.
CREATE INDEX IF NOT EXISTS support_grant_tenant_id_status_idx
  ON support_grant (tenant_id, status);

CREATE INDEX IF NOT EXISTS support_grant_support_user_id_status_idx
  ON support_grant (support_user_id, status);

CREATE INDEX IF NOT EXISTS support_grant_ends_at_status_idx
  ON support_grant (ends_at, status);

-- Spec composite index: tenant_id, support_user_id, starts_at, ends_at
CREATE INDEX IF NOT EXISTS support_grant_tid_suid_sat_eat_idx
  ON support_grant (tenant_id, support_user_id, starts_at, ends_at);
