-- M03 Batch 1 — Organisation Structure Schema:
--   LegalEntity, Branch, CostCentre, Department, Position
-- Expand-contract (ADR-010): additive only; no existing columns removed.
--
-- Creation order (FK dependencies):
--   legal_entity → cost_centre → branch → department → position
--
-- ON DELETE behaviour:
--   legal_entity → tenant:          RESTRICT (org data must not silently disappear)
--   branch       → tenant:          RESTRICT
--   branch       → legal_entity:    RESTRICT (branch belongs to a legal entity)
--   cost_centre  → tenant:          RESTRICT
--   cost_centre  → legal_entity:    RESTRICT
--   department   → tenant:          RESTRICT
--   department   → legal_entity:    RESTRICT
--   department   → branch:          SET NULL (branch removal does not destroy dept)
--   department   → cost_centre:     SET NULL (cost centre removal does not destroy dept)
--   department   → department:      SET NULL (parent removal orphans, not deletes)
--   position     → tenant:          RESTRICT
--   position     → legal_entity:    RESTRICT
--   position     → department:      SET NULL (dept removal does not destroy position)
--   position     → cost_centre:     SET NULL
--
-- RLS: every tenant-owned table gets ENABLE + FORCE + isolation POLICY.
-- Spec source: M03 specification — Batch 1 scope.

-- ─── 0. Extensions ────────────────────────────────────────────────────────────
-- btree_gist is required for effective-dating EXCLUDE constraints in M04+.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ─── 1. legal_entity ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "legal_entity" (
  "id"                  UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"           UUID         NOT NULL,
  "name"                VARCHAR(200) NOT NULL,
  "registration_number" VARCHAR(100),
  "country_code"        CHAR(2)      NOT NULL,
  "currency_code"       CHAR(3)      NOT NULL,
  "timezone"            VARCHAR(80)  NOT NULL,
  "address_line1"       VARCHAR(200),
  "address_line2"       VARCHAR(200),
  "city"                VARCHAR(100),
  "state_province"      VARCHAR(100),
  "postal_code"         VARCHAR(20),
  "is_primary"          BOOLEAN      NOT NULL DEFAULT FALSE,
  "status"              VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "created_by"          UUID,
  "updated_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_by"          UUID,
  "row_version"         BIGINT       NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "legal_entity_tenant_id_idx"
  ON "legal_entity" ("tenant_id");

CREATE INDEX IF NOT EXISTS "legal_entity_tenant_status_idx"
  ON "legal_entity" ("tenant_id", "status");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'legal_entity_tenant_name_uq' AND table_name = 'legal_entity'
  ) THEN
    ALTER TABLE "legal_entity"
      ADD CONSTRAINT "legal_entity_tenant_name_uq" UNIQUE ("tenant_id", "name");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'legal_entity_tenant_id_fkey' AND table_name = 'legal_entity'
  ) THEN
    ALTER TABLE "legal_entity"
      ADD CONSTRAINT "legal_entity_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "legal_entity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "legal_entity" FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'legal_entity' AND policyname = 'legal_entity_tenant_isolation'
  ) THEN
    CREATE POLICY "legal_entity_tenant_isolation" ON "legal_entity"
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

-- ─── 2. cost_centre ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "cost_centre" (
  "id"            UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"     UUID         NOT NULL,
  "legal_entity_id" UUID       NOT NULL,
  "code"          VARCHAR(40)  NOT NULL,
  "name"          VARCHAR(200) NOT NULL,
  "description"   TEXT,
  "status"        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "created_by"    UUID,
  "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_by"    UUID,
  "row_version"   BIGINT       NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "cost_centre_tenant_id_idx"
  ON "cost_centre" ("tenant_id");

CREATE INDEX IF NOT EXISTS "cost_centre_tenant_legal_entity_idx"
  ON "cost_centre" ("tenant_id", "legal_entity_id");

CREATE INDEX IF NOT EXISTS "cost_centre_tenant_status_idx"
  ON "cost_centre" ("tenant_id", "status");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'cost_centre_tenant_code_uq' AND table_name = 'cost_centre'
  ) THEN
    ALTER TABLE "cost_centre"
      ADD CONSTRAINT "cost_centre_tenant_code_uq" UNIQUE ("tenant_id", "code");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'cost_centre_tenant_legal_entity_name_uq' AND table_name = 'cost_centre'
  ) THEN
    ALTER TABLE "cost_centre"
      ADD CONSTRAINT "cost_centre_tenant_legal_entity_name_uq" UNIQUE ("tenant_id", "legal_entity_id", "name");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'cost_centre_tenant_id_fkey' AND table_name = 'cost_centre'
  ) THEN
    ALTER TABLE "cost_centre"
      ADD CONSTRAINT "cost_centre_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'cost_centre_legal_entity_id_fkey' AND table_name = 'cost_centre'
  ) THEN
    ALTER TABLE "cost_centre"
      ADD CONSTRAINT "cost_centre_legal_entity_id_fkey"
      FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "cost_centre" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cost_centre" FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cost_centre' AND policyname = 'cost_centre_tenant_isolation'
  ) THEN
    CREATE POLICY "cost_centre_tenant_isolation" ON "cost_centre"
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

-- ─── 3. branch ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "branch" (
  "id"              UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"       UUID         NOT NULL,
  "legal_entity_id" UUID         NOT NULL,
  "name"            VARCHAR(200) NOT NULL,
  "code"            VARCHAR(40)  NOT NULL,
  "address_line1"   VARCHAR(200),
  "address_line2"   VARCHAR(200),
  "city"            VARCHAR(100),
  "state_province"  VARCHAR(100),
  "postal_code"     VARCHAR(20),
  "country_code"    CHAR(2)      NOT NULL,
  "timezone"        VARCHAR(80)  NOT NULL,
  "is_head_office"  BOOLEAN      NOT NULL DEFAULT FALSE,
  "status"          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "created_by"      UUID,
  "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_by"      UUID,
  "row_version"     BIGINT       NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "branch_tenant_id_idx"
  ON "branch" ("tenant_id");

CREATE INDEX IF NOT EXISTS "branch_tenant_legal_entity_idx"
  ON "branch" ("tenant_id", "legal_entity_id");

CREATE INDEX IF NOT EXISTS "branch_tenant_status_idx"
  ON "branch" ("tenant_id", "status");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'branch_tenant_legal_entity_name_uq' AND table_name = 'branch'
  ) THEN
    ALTER TABLE "branch"
      ADD CONSTRAINT "branch_tenant_legal_entity_name_uq" UNIQUE ("tenant_id", "legal_entity_id", "name");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'branch_tenant_code_uq' AND table_name = 'branch'
  ) THEN
    ALTER TABLE "branch"
      ADD CONSTRAINT "branch_tenant_code_uq" UNIQUE ("tenant_id", "code");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'branch_tenant_id_fkey' AND table_name = 'branch'
  ) THEN
    ALTER TABLE "branch"
      ADD CONSTRAINT "branch_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'branch_legal_entity_id_fkey' AND table_name = 'branch'
  ) THEN
    ALTER TABLE "branch"
      ADD CONSTRAINT "branch_legal_entity_id_fkey"
      FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "branch" FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'branch' AND policyname = 'branch_tenant_isolation'
  ) THEN
    CREATE POLICY "branch_tenant_isolation" ON "branch"
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

-- ─── 4. department ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "department" (
  "id"              UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"       UUID         NOT NULL,
  "legal_entity_id" UUID         NOT NULL,
  "branch_id"       UUID,
  "parent_id"       UUID,
  "cost_centre_id"  UUID,
  "name"            VARCHAR(200) NOT NULL,
  "code"            VARCHAR(40)  NOT NULL,
  "status"          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "created_by"      UUID,
  "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_by"      UUID,
  "row_version"     BIGINT       NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "department_tenant_id_idx"
  ON "department" ("tenant_id");

CREATE INDEX IF NOT EXISTS "department_tenant_legal_entity_idx"
  ON "department" ("tenant_id", "legal_entity_id");

CREATE INDEX IF NOT EXISTS "department_tenant_parent_idx"
  ON "department" ("tenant_id", "parent_id");

CREATE INDEX IF NOT EXISTS "department_tenant_status_idx"
  ON "department" ("tenant_id", "status");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'department_tenant_legal_entity_name_uq' AND table_name = 'department'
  ) THEN
    ALTER TABLE "department"
      ADD CONSTRAINT "department_tenant_legal_entity_name_uq" UNIQUE ("tenant_id", "legal_entity_id", "name");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'department_tenant_code_uq' AND table_name = 'department'
  ) THEN
    ALTER TABLE "department"
      ADD CONSTRAINT "department_tenant_code_uq" UNIQUE ("tenant_id", "code");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'department_tenant_id_fkey' AND table_name = 'department'
  ) THEN
    ALTER TABLE "department"
      ADD CONSTRAINT "department_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'department_legal_entity_id_fkey' AND table_name = 'department'
  ) THEN
    ALTER TABLE "department"
      ADD CONSTRAINT "department_legal_entity_id_fkey"
      FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'department_branch_id_fkey' AND table_name = 'department'
  ) THEN
    ALTER TABLE "department"
      ADD CONSTRAINT "department_branch_id_fkey"
      FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'department_cost_centre_id_fkey' AND table_name = 'department'
  ) THEN
    ALTER TABLE "department"
      ADD CONSTRAINT "department_cost_centre_id_fkey"
      FOREIGN KEY ("cost_centre_id") REFERENCES "cost_centre"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'department_parent_id_fkey' AND table_name = 'department'
  ) THEN
    ALTER TABLE "department"
      ADD CONSTRAINT "department_parent_id_fkey"
      FOREIGN KEY ("parent_id") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "department" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "department" FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'department' AND policyname = 'department_tenant_isolation'
  ) THEN
    CREATE POLICY "department_tenant_isolation" ON "department"
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

-- ─── 5. position ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "position" (
  "id"              UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"       UUID         NOT NULL,
  "legal_entity_id" UUID         NOT NULL,
  "department_id"   UUID,
  "cost_centre_id"  UUID,
  "title"           VARCHAR(200) NOT NULL,
  "code"            VARCHAR(40)  NOT NULL,
  "grade"           VARCHAR(40),
  "description"     TEXT,
  "is_manager"      BOOLEAN      NOT NULL DEFAULT FALSE,
  "status"          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "created_by"      UUID,
  "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_by"      UUID,
  "row_version"     BIGINT       NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "position_tenant_id_idx"
  ON "position" ("tenant_id");

CREATE INDEX IF NOT EXISTS "position_tenant_legal_entity_idx"
  ON "position" ("tenant_id", "legal_entity_id");

CREATE INDEX IF NOT EXISTS "position_tenant_department_idx"
  ON "position" ("tenant_id", "department_id");

CREATE INDEX IF NOT EXISTS "position_tenant_status_idx"
  ON "position" ("tenant_id", "status");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'position_tenant_code_uq' AND table_name = 'position'
  ) THEN
    ALTER TABLE "position"
      ADD CONSTRAINT "position_tenant_code_uq" UNIQUE ("tenant_id", "code");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'position_tenant_legal_entity_title_uq' AND table_name = 'position'
  ) THEN
    ALTER TABLE "position"
      ADD CONSTRAINT "position_tenant_legal_entity_title_uq" UNIQUE ("tenant_id", "legal_entity_id", "title");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'position_tenant_id_fkey' AND table_name = 'position'
  ) THEN
    ALTER TABLE "position"
      ADD CONSTRAINT "position_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'position_legal_entity_id_fkey' AND table_name = 'position'
  ) THEN
    ALTER TABLE "position"
      ADD CONSTRAINT "position_legal_entity_id_fkey"
      FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'position_department_id_fkey' AND table_name = 'position'
  ) THEN
    ALTER TABLE "position"
      ADD CONSTRAINT "position_department_id_fkey"
      FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'position_cost_centre_id_fkey' AND table_name = 'position'
  ) THEN
    ALTER TABLE "position"
      ADD CONSTRAINT "position_cost_centre_id_fkey"
      FOREIGN KEY ("cost_centre_id") REFERENCES "cost_centre"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "position" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "position" FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'position' AND policyname = 'position_tenant_isolation'
  ) THEN
    CREATE POLICY "position_tenant_isolation" ON "position"
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
