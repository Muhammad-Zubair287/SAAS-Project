-- M01 Batch 6 — AppUser (Identity) alignment
-- Expand-contract (ADR-010): new spec columns added with snake_case names;
-- old camelCase columns retained as compatibility columns.
--
-- Compatibility columns retained because:
--   email: auth/sign-in code reads this column directly for sign-in lookup.
--   displayName: old camelCase DB column; populated for all existing rows.
--   platformRole: PlatformRoleGuard reads this column for authorization.
--   isActive: guards check this for user activation state.
--   createdAt, updatedAt: old camelCase cols become unmanaged DB artifacts;
--     Prisma now reads/writes created_at and updated_at via @map.
-- Compatibility columns will be removed in the cleanup batch after consumers are updated.
--
-- Spec source: ERD Data Dictionary July 2026, page 21.
-- Spec indexes: UNIQUE (email_normalised) WHERE user_type='HUMAN'; INDEX (status)
-- Spec user_type values: HUMAN, SERVICE, SUPPORT
-- Spec status values: INVITED, ACTIVE, LOCKED, DEACTIVATED (default: INVITED)

-- ─── 1. Modify existing app_user table ────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'app_user'
  ) THEN

    -- 1a. Add display_name varchar(160) NOT NULL; populate from existing displayName column.
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS display_name VARCHAR(160);
    UPDATE app_user SET display_name = "displayName" WHERE display_name IS NULL AND "displayName" IS NOT NULL;
    ALTER TABLE app_user ALTER COLUMN display_name SET NOT NULL;

    -- 1b. Add user_type varchar(20); populate existing rows as 'HUMAN'.
    --     Rationale: all existing rows were created in Phase 3 as platform staff accounts
    --     (SUPER_ADMIN, SUPPORT_ENGINEER, AUDITOR, OPERATIONS) — all are human users.
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS user_type VARCHAR(20);
    UPDATE app_user SET user_type = 'HUMAN' WHERE user_type IS NULL;
    ALTER TABLE app_user ALTER COLUMN user_type SET NOT NULL;

    -- 1c. Add status varchar(20) NOT NULL DEFAULT 'INVITED'.
    --     Derive from isActive: true → ACTIVE, false → DEACTIVATED.
    --     DEFAULT 'INVITED' handles future inserts from M02 invitation flow.
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'INVITED';
    UPDATE app_user SET status = 'ACTIVE'      WHERE "isActive" = true  AND status = 'INVITED';
    UPDATE app_user SET status = 'DEACTIVATED' WHERE "isActive" = false AND status = 'INVITED';

    -- 1d. Add email_normalised varchar(320); populate from existing email (lowercase).
    --     NOT NULL per spec; populated before enforcement.
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS email_normalised VARCHAR(320);
    UPDATE app_user SET email_normalised = LOWER(email) WHERE email_normalised IS NULL AND email IS NOT NULL;
    ALTER TABLE app_user ALTER COLUMN email_normalised SET NOT NULL;

    -- 1e. Add password_subject varchar(200) nullable (opaque IdP subject; no password hash).
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS password_subject VARCHAR(200);

    -- 1f. Add last_login_at timestamptz nullable.
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

    -- 1g. Add deactivated_at timestamptz nullable.
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

    -- 1h. Add created_at timestamptz; populate from existing createdAt column.
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE app_user SET created_at = "createdAt" WHERE "createdAt" IS NOT NULL;

    -- 1i. Add updated_at timestamptz; populate from existing updatedAt column.
    --     Prisma @updatedAt will manage this column going forward.
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE app_user SET updated_at = "updatedAt" WHERE "updatedAt" IS NOT NULL;

  ELSE
    -- Fresh install: create app_user with spec-aligned structure.
    -- Global platform reference — no tenant_id, no RLS.
    -- Compatibility columns included so Phase-3 code continues to work
    -- until PlatformRoleGuard and auth code are migrated (M02 scope).
    CREATE TABLE app_user (
      id               UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
      email_normalised VARCHAR(320) NOT NULL,
      display_name     VARCHAR(160) NOT NULL,
      user_type        VARCHAR(20)  NOT NULL,
      status           VARCHAR(20)  NOT NULL DEFAULT 'INVITED',
      password_subject VARCHAR(200),
      last_login_at    TIMESTAMPTZ,
      deactivated_at   TIMESTAMPTZ,
      created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      -- Compatibility columns (not in spec; removed in cleanup batch)
      email            VARCHAR(255) NOT NULL UNIQUE,
      "displayName"    VARCHAR(160) NOT NULL,
      "platformRole"   VARCHAR(80),
      "isActive"       BOOLEAN      NOT NULL DEFAULT true,
      "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      "updatedAt"      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- ─── 2. Spec indexes ──────────────────────────────────────────────────────────
-- Partial unique index: only one HUMAN account per normalised email address.
-- Prisma cannot express partial unique indexes; maintained via raw SQL only.
CREATE UNIQUE INDEX IF NOT EXISTS app_user_email_normalised_human_uidx
  ON app_user (email_normalised)
  WHERE user_type = 'HUMAN';

-- Non-unique lookup index on email_normalised (for SERVICE/SUPPORT lookups and Prisma queries).
CREATE INDEX IF NOT EXISTS app_user_email_normalised_idx
  ON app_user (email_normalised);

-- Index on status (spec: INDEX (status)).
CREATE INDEX IF NOT EXISTS app_user_status_idx
  ON app_user (status);

-- Retain existing index on platformRole (compat; used by PlatformRoleGuard).
-- Renamed to explicit name to avoid Prisma auto-generated name conflicts.
CREATE INDEX IF NOT EXISTS app_user_platform_role_idx
  ON app_user ("platformRole");

-- ─── 3. FK constraints: support_grant → app_user ─────────────────────────────
-- These were deferred from Batch 5 (AppUser not yet aligned).
-- Columns support_user_id, requested_by_user_id, approved_by_user_id were added
-- to support_grant in Batch 5 migration.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'support_grant_support_user_id_fkey'
      AND table_name = 'support_grant'
  ) THEN
    ALTER TABLE support_grant
      ADD CONSTRAINT support_grant_support_user_id_fkey
      FOREIGN KEY (support_user_id) REFERENCES app_user(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'support_grant_requested_by_user_id_fkey'
      AND table_name = 'support_grant'
  ) THEN
    ALTER TABLE support_grant
      ADD CONSTRAINT support_grant_requested_by_user_id_fkey
      FOREIGN KEY (requested_by_user_id) REFERENCES app_user(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'support_grant_approved_by_user_id_fkey'
      AND table_name = 'support_grant'
  ) THEN
    ALTER TABLE support_grant
      ADD CONSTRAINT support_grant_approved_by_user_id_fkey
      FOREIGN KEY (approved_by_user_id) REFERENCES app_user(id);
  END IF;
END $$;
