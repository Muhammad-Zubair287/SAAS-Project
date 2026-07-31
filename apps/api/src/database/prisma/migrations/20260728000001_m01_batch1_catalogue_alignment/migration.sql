-- =============================================================================
-- M01 Batch 1: Platform Global Catalogues Alignment
-- Aligns deployment_region, plan, entitlement, plan_entitlement with specification.
--
-- Strategy: Expand → Populate → Switch → Cleanup (non-destructive per ADR-010).
-- Each section handles both: (a) fresh DB with no prior tables, and
-- (b) existing DB where tables were applied via `prisma db push` with old schema.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. deployment_region
-- Old structure: key varchar(60) PK, displayName varchar(120), cloudProvider varchar(40),
--                isActive boolean, countries text[], createdAt timestamptz, updatedAt timestamptz
-- New structure: id uuid PK, code varchar(40) UNIQUE, name varchar(100),
--                cloud_provider varchar(30), cloud_region varchar(60), country_code char(2),
--                status varchar(20) DEFAULT 'ACTIVE', created_at timestamptz, updated_at timestamptz
-- =============================================================================

DO $$
DECLARE
  v_table_exists boolean;
  v_has_old_key  boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'deployment_region'
  ) INTO v_table_exists;

  IF NOT v_table_exists THEN
    -- Fresh install: create with new spec-compliant structure
    CREATE TABLE deployment_region (
      id            UUID        NOT NULL DEFAULT gen_random_uuid(),
      code          VARCHAR(40) NOT NULL,
      name          VARCHAR(100) NOT NULL,
      cloud_provider VARCHAR(30) NOT NULL,
      cloud_region   VARCHAR(60) NOT NULL,
      country_code   CHAR(2)     NOT NULL,
      status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT deployment_region_pkey PRIMARY KEY (id),
      CONSTRAINT deployment_region_code_key UNIQUE (code)
    );

  ELSE
    -- Existing table: check if it has the old structure (column named 'key')
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'deployment_region' AND column_name = 'key'
    ) INTO v_has_old_key;

    IF v_has_old_key THEN
      -- EXPAND: add new columns alongside old ones

      -- Add id uuid (new PK candidate)
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deployment_region' AND column_name='id') THEN
        ALTER TABLE deployment_region ADD COLUMN id UUID DEFAULT gen_random_uuid();
        UPDATE deployment_region SET id = gen_random_uuid() WHERE id IS NULL;
        ALTER TABLE deployment_region ALTER COLUMN id SET NOT NULL;
      END IF;

      -- Add cloud_region
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deployment_region' AND column_name='cloud_region') THEN
        ALTER TABLE deployment_region ADD COLUMN cloud_region VARCHAR(60) NOT NULL DEFAULT '';
      END IF;

      -- Add country_code
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deployment_region' AND column_name='country_code') THEN
        ALTER TABLE deployment_region ADD COLUMN country_code CHAR(2) NOT NULL DEFAULT 'XX';
      END IF;

      -- Add status (derived from isActive if present)
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deployment_region' AND column_name='status') THEN
        ALTER TABLE deployment_region ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deployment_region' AND column_name='"isActive"') THEN
          UPDATE deployment_region SET status = CASE WHEN "isActive" THEN 'ACTIVE' ELSE 'INACTIVE' END;
        END IF;
      END IF;

      -- RENAME: key → code
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deployment_region' AND column_name='key')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deployment_region' AND column_name='code') THEN
        ALTER TABLE deployment_region RENAME COLUMN "key" TO code;
      END IF;

      -- RENAME: displayName → name
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deployment_region' AND column_name='displayName') THEN
        ALTER TABLE deployment_region RENAME COLUMN "displayName" TO name;
      END IF;

      -- RENAME: cloudProvider → cloud_provider
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deployment_region' AND column_name='cloudProvider') THEN
        ALTER TABLE deployment_region RENAME COLUMN "cloudProvider" TO cloud_provider;
      END IF;

      -- RENAME: createdAt → created_at
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deployment_region' AND column_name='createdAt') THEN
        ALTER TABLE deployment_region RENAME COLUMN "createdAt" TO created_at;
      END IF;

      -- RENAME: updatedAt → updated_at
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deployment_region' AND column_name='updatedAt') THEN
        ALTER TABLE deployment_region RENAME COLUMN "updatedAt" TO updated_at;
      END IF;

      -- ADJUST types to spec lengths
      ALTER TABLE deployment_region ALTER COLUMN code TYPE VARCHAR(40);
      ALTER TABLE deployment_region ALTER COLUMN name TYPE VARCHAR(100);
      ALTER TABLE deployment_region ALTER COLUMN cloud_provider TYPE VARCHAR(30);

      -- SWITCH: move PK from code to id
      -- Drop old PK (was on 'key', now renamed 'code')
      ALTER TABLE deployment_region DROP CONSTRAINT IF EXISTS deployment_region_pkey;
      -- Add UNIQUE on code (idempotent)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema='public' AND tc.table_name='deployment_region'
          AND tc.constraint_type='UNIQUE' AND kcu.column_name='code'
      ) THEN
        ALTER TABLE deployment_region ADD CONSTRAINT deployment_region_code_key UNIQUE (code);
      END IF;
      -- Add new PK on id
      ALTER TABLE deployment_region ADD CONSTRAINT deployment_region_pkey PRIMARY KEY (id);

      -- CLEANUP: drop obsolete columns
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deployment_region' AND column_name='isActive') THEN
        ALTER TABLE deployment_region DROP COLUMN "isActive";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deployment_region' AND column_name='countries') THEN
        ALTER TABLE deployment_region DROP COLUMN countries;
      END IF;
    END IF;
    -- If v_has_old_key is false: table already has new structure, nothing to do.
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS deployment_region_status_idx ON deployment_region (status);
CREATE INDEX IF NOT EXISTS deployment_region_code_idx   ON deployment_region (code);

-- =============================================================================
-- 2. plan
-- Old structure: key varchar(80) PK, displayName varchar(120), description text,
--                isActive boolean, sortOrder int, createdAt timestamptz, updatedAt timestamptz
-- New structure: id uuid PK, code varchar(40) UNIQUE, name varchar(100),
--                description text, billing_model varchar(30) DEFAULT 'PER_SEAT',
--                status varchar(20) DEFAULT 'ACTIVE', created_at timestamptz, updated_at timestamptz
-- =============================================================================

DO $$
DECLARE
  v_table_exists boolean;
  v_has_old_key  boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'plan'
  ) INTO v_table_exists;

  IF NOT v_table_exists THEN
    CREATE TABLE plan (
      id            UUID        NOT NULL DEFAULT gen_random_uuid(),
      code          VARCHAR(40) NOT NULL,
      name          VARCHAR(100) NOT NULL,
      description   TEXT,
      billing_model VARCHAR(30) NOT NULL DEFAULT 'PER_SEAT',
      status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT plan_pkey PRIMARY KEY (id),
      CONSTRAINT plan_code_key UNIQUE (code)
    );

  ELSE
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'plan' AND column_name = 'key'
    ) INTO v_has_old_key;

    IF v_has_old_key THEN
      -- EXPAND: add new columns

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan' AND column_name='id') THEN
        ALTER TABLE plan ADD COLUMN id UUID DEFAULT gen_random_uuid();
        UPDATE plan SET id = gen_random_uuid() WHERE id IS NULL;
        ALTER TABLE plan ALTER COLUMN id SET NOT NULL;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan' AND column_name='billing_model') THEN
        ALTER TABLE plan ADD COLUMN billing_model VARCHAR(30) NOT NULL DEFAULT 'PER_SEAT';
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan' AND column_name='status') THEN
        ALTER TABLE plan ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan' AND column_name='isActive') THEN
          UPDATE plan SET status = CASE WHEN "isActive" THEN 'ACTIVE' ELSE 'INACTIVE' END;
        END IF;
      END IF;

      -- RENAME: key → code
      -- Note: PostgreSQL automatically updates all FK constraints that reference this column.
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan' AND column_name='key')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan' AND column_name='code') THEN
        ALTER TABLE plan RENAME COLUMN "key" TO code;
      END IF;

      -- RENAME: displayName → name
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan' AND column_name='displayName') THEN
        ALTER TABLE plan RENAME COLUMN "displayName" TO name;
      END IF;

      -- RENAME: createdAt → created_at
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan' AND column_name='createdAt') THEN
        ALTER TABLE plan RENAME COLUMN "createdAt" TO created_at;
      END IF;

      -- RENAME: updatedAt → updated_at
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan' AND column_name='updatedAt') THEN
        ALTER TABLE plan RENAME COLUMN "updatedAt" TO updated_at;
      END IF;

      -- ADJUST types
      ALTER TABLE plan ALTER COLUMN code TYPE VARCHAR(40);
      ALTER TABLE plan ALTER COLUMN name TYPE VARCHAR(100);

      -- SWITCH PK: code → id
      ALTER TABLE plan DROP CONSTRAINT IF EXISTS plan_pkey;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema='public' AND tc.table_name='plan'
          AND tc.constraint_type='UNIQUE' AND kcu.column_name='code'
      ) THEN
        ALTER TABLE plan ADD CONSTRAINT plan_code_key UNIQUE (code);
      END IF;
      ALTER TABLE plan ADD CONSTRAINT plan_pkey PRIMARY KEY (id);

      -- CLEANUP
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan' AND column_name='isActive') THEN
        ALTER TABLE plan DROP COLUMN "isActive";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan' AND column_name='sortOrder') THEN
        ALTER TABLE plan DROP COLUMN "sortOrder";
      END IF;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS plan_status_idx ON plan (status);

-- =============================================================================
-- 3. entitlement
-- Old structure: key varchar(80) PK, displayName varchar(120), description text,
--                dataType varchar(20), defaultValue varchar(200), createdAt, updatedAt
-- New structure: id uuid PK, code varchar(80) UNIQUE, label varchar(120),
--                description text, data_type varchar(20), default_value jsonb,
--                unit varchar(40), status varchar(20) DEFAULT 'ACTIVE',
--                created_at timestamptz, updated_at timestamptz
-- =============================================================================

DO $$
DECLARE
  v_table_exists boolean;
  v_has_old_key  boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'entitlement'
  ) INTO v_table_exists;

  IF NOT v_table_exists THEN
    CREATE TABLE entitlement (
      id            UUID         NOT NULL DEFAULT gen_random_uuid(),
      code          VARCHAR(80)  NOT NULL,
      label         VARCHAR(120) NOT NULL,
      description   TEXT,
      data_type     VARCHAR(20)  NOT NULL,
      default_value JSONB        NOT NULL,
      unit          VARCHAR(40),
      status        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      CONSTRAINT entitlement_pkey PRIMARY KEY (id),
      CONSTRAINT entitlement_code_key UNIQUE (code)
    );

  ELSE
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'entitlement' AND column_name = 'key'
    ) INTO v_has_old_key;

    IF v_has_old_key THEN
      -- EXPAND

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='entitlement' AND column_name='id') THEN
        ALTER TABLE entitlement ADD COLUMN id UUID DEFAULT gen_random_uuid();
        UPDATE entitlement SET id = gen_random_uuid() WHERE id IS NULL;
        ALTER TABLE entitlement ALTER COLUMN id SET NOT NULL;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='entitlement' AND column_name='unit') THEN
        ALTER TABLE entitlement ADD COLUMN unit VARCHAR(40);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='entitlement' AND column_name='status') THEN
        ALTER TABLE entitlement ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
      END IF;

      -- Add data_type column if missing (old schema had it as dataType)
      -- handled via rename below

      -- RENAME: key → code
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='entitlement' AND column_name='key')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='entitlement' AND column_name='code') THEN
        ALTER TABLE entitlement RENAME COLUMN "key" TO code;
      END IF;

      -- RENAME: displayName → label
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='entitlement' AND column_name='displayName') THEN
        ALTER TABLE entitlement RENAME COLUMN "displayName" TO label;
      END IF;

      -- RENAME: dataType → data_type
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='entitlement' AND column_name='dataType') THEN
        ALTER TABLE entitlement RENAME COLUMN "dataType" TO data_type;
      END IF;

      -- RENAME: defaultValue → default_value AND change type from varchar to jsonb
      -- Step 1: rename column
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='entitlement' AND column_name='defaultValue') THEN
        ALTER TABLE entitlement RENAME COLUMN "defaultValue" TO default_value;
      END IF;
      -- Step 2: convert varchar → jsonb (wrap existing string values in JSON quotes)
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='entitlement' AND column_name='default_value'
          AND data_type NOT IN ('jsonb', 'json')
      ) THEN
        ALTER TABLE entitlement
          ALTER COLUMN default_value TYPE JSONB
          USING to_jsonb(default_value::text);
      END IF;

      -- RENAME: createdAt → created_at
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='entitlement' AND column_name='createdAt') THEN
        ALTER TABLE entitlement RENAME COLUMN "createdAt" TO created_at;
      END IF;

      -- RENAME: updatedAt → updated_at
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='entitlement' AND column_name='updatedAt') THEN
        ALTER TABLE entitlement RENAME COLUMN "updatedAt" TO updated_at;
      END IF;

      -- SWITCH PK
      ALTER TABLE entitlement DROP CONSTRAINT IF EXISTS entitlement_pkey;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema='public' AND tc.table_name='entitlement'
          AND tc.constraint_type='UNIQUE' AND kcu.column_name='code'
      ) THEN
        ALTER TABLE entitlement ADD CONSTRAINT entitlement_code_key UNIQUE (code);
      END IF;
      ALTER TABLE entitlement ADD CONSTRAINT entitlement_pkey PRIMARY KEY (id);

      -- No old-only columns to drop (all were meaningful, just renamed/retyped)
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS entitlement_status_idx ON entitlement (status);

-- =============================================================================
-- 4. plan_entitlement
-- Old structure: planKey varchar(80), entitlementKey varchar(80), value varchar(200)
--                Composite PK (planKey, entitlementKey)
--                FK: planKey → plan.key, entitlementKey → entitlement.key
-- New structure: id uuid PK, plan_id uuid FK → plan.id,
--                entitlement_id uuid FK → entitlement.id,
--                default_value jsonb, created_at timestamptz
--                UNIQUE (plan_id, entitlement_id)
-- =============================================================================

DO $$
DECLARE
  v_table_exists    boolean;
  v_has_old_pk      boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'plan_entitlement'
  ) INTO v_table_exists;

  IF NOT v_table_exists THEN
    CREATE TABLE plan_entitlement (
      id             UUID        NOT NULL DEFAULT gen_random_uuid(),
      plan_id        UUID        NOT NULL,
      entitlement_id UUID        NOT NULL,
      default_value  JSONB       NOT NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT plan_entitlement_pkey PRIMARY KEY (id),
      CONSTRAINT plan_entitlement_plan_id_entitlement_id_key UNIQUE (plan_id, entitlement_id),
      CONSTRAINT plan_entitlement_plan_id_fkey
        FOREIGN KEY (plan_id) REFERENCES plan (id) ON DELETE RESTRICT,
      CONSTRAINT plan_entitlement_entitlement_id_fkey
        FOREIGN KEY (entitlement_id) REFERENCES entitlement (id) ON DELETE RESTRICT
    );

  ELSE
    -- Check for old composite PK structure (has planKey column)
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'plan_entitlement'
        AND column_name IN ('planKey', 'plankey')
    ) INTO v_has_old_pk;

    IF v_has_old_pk THEN
      -- EXPAND: add new uuid columns
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan_entitlement' AND column_name='id') THEN
        ALTER TABLE plan_entitlement ADD COLUMN id UUID DEFAULT gen_random_uuid();
        UPDATE plan_entitlement SET id = gen_random_uuid() WHERE id IS NULL;
        ALTER TABLE plan_entitlement ALTER COLUMN id SET NOT NULL;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan_entitlement' AND column_name='plan_id') THEN
        ALTER TABLE plan_entitlement ADD COLUMN plan_id UUID;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan_entitlement' AND column_name='entitlement_id') THEN
        ALTER TABLE plan_entitlement ADD COLUMN entitlement_id UUID;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan_entitlement' AND column_name='default_value') THEN
        ALTER TABLE plan_entitlement ADD COLUMN default_value JSONB;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan_entitlement' AND column_name='created_at') THEN
        ALTER TABLE plan_entitlement ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
      END IF;

      -- POPULATE: derive plan_id and entitlement_id from existing varchar keys → new uuid PKs
      -- plan.code (renamed from plan.key) and entitlement.code (renamed from entitlement.key)
      UPDATE plan_entitlement pe
      SET plan_id = p.id
      FROM plan p
      WHERE p.code = pe."planKey"
        AND pe.plan_id IS NULL;

      UPDATE plan_entitlement pe
      SET entitlement_id = e.id
      FROM entitlement e
      WHERE e.code = pe."entitlementKey"
        AND pe.entitlement_id IS NULL;

      -- Convert value → default_value as jsonb (if value column exists)
      UPDATE plan_entitlement
      SET default_value = to_jsonb(value::text)
      WHERE default_value IS NULL
        AND value IS NOT NULL;

      -- Fallback: set empty jsonb for any remaining nulls
      UPDATE plan_entitlement SET default_value = '""'::jsonb WHERE default_value IS NULL;

      -- Make new FK columns NOT NULL before adding constraints
      ALTER TABLE plan_entitlement ALTER COLUMN plan_id SET NOT NULL;
      ALTER TABLE plan_entitlement ALTER COLUMN entitlement_id SET NOT NULL;
      ALTER TABLE plan_entitlement ALTER COLUMN default_value SET NOT NULL;

      -- SWITCH: drop old constraints and add new ones
      ALTER TABLE plan_entitlement DROP CONSTRAINT IF EXISTS plan_entitlement_pkey;
      ALTER TABLE plan_entitlement DROP CONSTRAINT IF EXISTS "plan_entitlement_planKey_fkey";
      ALTER TABLE plan_entitlement DROP CONSTRAINT IF EXISTS "plan_entitlement_entitlementKey_fkey";

      -- Add new PK
      ALTER TABLE plan_entitlement ADD CONSTRAINT plan_entitlement_pkey PRIMARY KEY (id);

      -- Add unique constraint on (plan_id, entitlement_id)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema='public' AND table_name='plan_entitlement'
          AND constraint_name='plan_entitlement_plan_id_entitlement_id_key'
      ) THEN
        ALTER TABLE plan_entitlement
          ADD CONSTRAINT plan_entitlement_plan_id_entitlement_id_key
          UNIQUE (plan_id, entitlement_id);
      END IF;

      -- Add new FK constraints
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema='public' AND table_name='plan_entitlement'
          AND constraint_name='plan_entitlement_plan_id_fkey'
      ) THEN
        ALTER TABLE plan_entitlement
          ADD CONSTRAINT plan_entitlement_plan_id_fkey
          FOREIGN KEY (plan_id) REFERENCES plan (id) ON DELETE RESTRICT;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema='public' AND table_name='plan_entitlement'
          AND constraint_name='plan_entitlement_entitlement_id_fkey'
      ) THEN
        ALTER TABLE plan_entitlement
          ADD CONSTRAINT plan_entitlement_entitlement_id_fkey
          FOREIGN KEY (entitlement_id) REFERENCES entitlement (id) ON DELETE RESTRICT;
      END IF;

      -- CLEANUP: drop old varchar columns
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan_entitlement' AND column_name='planKey') THEN
        ALTER TABLE plan_entitlement DROP COLUMN "planKey";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan_entitlement' AND column_name='entitlementKey') THEN
        ALTER TABLE plan_entitlement DROP COLUMN "entitlementKey";
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plan_entitlement' AND column_name='value') THEN
        ALTER TABLE plan_entitlement DROP COLUMN value;
      END IF;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS plan_entitlement_plan_id_idx        ON plan_entitlement (plan_id);
CREATE INDEX IF NOT EXISTS plan_entitlement_entitlement_id_idx ON plan_entitlement (entitlement_id);

COMMIT;
