-- M02 Batch 2 — RBAC & MFA Schema: MfaCredential, IdentityLink, Role,
--               Permission, RolePermission, RoleAssignment, ApiClient
-- Expand-contract (ADR-010): additive only; no existing columns removed.
--
-- Design decisions:
--   mfa_credential.backup_codes_encrypted  — TEXT[] (PostgreSQL native array);
--     each backup code stored as a separately encrypted element so codes can
--     be removed individually when consumed.
--   identity_link.row_version omitted      — append-only record; no mutation path.
--   permission                             — global catalogue (no tenant_id);
--     seeded by platform; tenant admins assign to roles, never create.
--   role_permission                        — composite PK (role_id, permission_id);
--     no surrogate id, no timestamps — pure join table.
--   role_assignment                        — early termination by record deletion,
--     not soft-revoke; expiresAt handles time-bounded delegations.
--
-- ON DELETE behaviour:
--   mfa_credential → tenant:          RESTRICT (security data; protect from cascade)
--   mfa_credential → app_user:        CASCADE  (account deletion clears MFA)
--   identity_link  → tenant:          RESTRICT (SSO data; protect from cascade)
--   identity_link  → app_user:        CASCADE  (account deletion clears SSO links)
--   role           → tenant:          RESTRICT (cannot delete tenant with roles)
--   role           → app_user:        SET NULL (keep role if creator is removed)
--   role_permission → role:           CASCADE  (role deletion removes its grants)
--   role_permission → permission:     RESTRICT (cannot delete in-use permission)
--   role_assignment → tenant:         RESTRICT (assignment data must not silently go)
--   role_assignment → app_user (user):CASCADE  (account deletion clears assignments)
--   role_assignment → role:           CASCADE  (role deletion removes assignments)
--   role_assignment → app_user (by):  SET NULL (keep assignment if granter removed)
--   api_client     → tenant:          RESTRICT (API token data must persist)
--   api_client     → app_user:        SET NULL (keep client if creator removed)
--
-- Spec source: M02 specification — Batch 2 scope.

-- ─── 1. mfa_credential ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "mfa_credential" (
  "id"                    UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"             UUID         NOT NULL,
  "user_id"               UUID         NOT NULL,
  "credential_type"       VARCHAR(20)  NOT NULL,
  "secret_encrypted"      TEXT         NOT NULL,
  "status"                VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  "verified_at"           TIMESTAMPTZ,
  "backup_codes_encrypted" TEXT[],
  "created_at"            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "row_version"           BIGINT       NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "mfa_credential_tenant_id_idx"
  ON "mfa_credential" ("tenant_id");

CREATE INDEX IF NOT EXISTS "mfa_credential_user_id_idx"
  ON "mfa_credential" ("user_id");

CREATE INDEX IF NOT EXISTS "mfa_credential_credential_type_idx"
  ON "mfa_credential" ("credential_type");

CREATE INDEX IF NOT EXISTS "mfa_credential_status_idx"
  ON "mfa_credential" ("status");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'mfa_credential_tenant_id_fkey' AND table_name = 'mfa_credential'
  ) THEN
    ALTER TABLE "mfa_credential"
      ADD CONSTRAINT "mfa_credential_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'mfa_credential_user_id_fkey' AND table_name = 'mfa_credential'
  ) THEN
    ALTER TABLE "mfa_credential"
      ADD CONSTRAINT "mfa_credential_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── 2. identity_link ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "identity_link" (
  "id"         UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"  UUID         NOT NULL,
  "user_id"    UUID         NOT NULL,
  "provider"   VARCHAR(40)  NOT NULL,
  "subject"    VARCHAR(200) NOT NULL,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Globally unique: one IdP account maps to exactly one app user.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'identity_link_provider_subject_uq' AND table_name = 'identity_link'
  ) THEN
    ALTER TABLE "identity_link"
      ADD CONSTRAINT "identity_link_provider_subject_uq" UNIQUE ("provider", "subject");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "identity_link_provider_idx"
  ON "identity_link" ("provider");

CREATE INDEX IF NOT EXISTS "identity_link_user_id_idx"
  ON "identity_link" ("user_id");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'identity_link_tenant_id_fkey' AND table_name = 'identity_link'
  ) THEN
    ALTER TABLE "identity_link"
      ADD CONSTRAINT "identity_link_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'identity_link_user_id_fkey' AND table_name = 'identity_link'
  ) THEN
    ALTER TABLE "identity_link"
      ADD CONSTRAINT "identity_link_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── 3. role ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "role" (
  "id"          UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "name"        VARCHAR(80)  NOT NULL,
  "description" TEXT,
  "is_system"   BOOLEAN      NOT NULL DEFAULT false,
  "created_by"  UUID,
  "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "row_version" BIGINT       NOT NULL DEFAULT 1
);

-- Role names are unique within a tenant.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'role_tenant_id_name_uq' AND table_name = 'role'
  ) THEN
    ALTER TABLE "role"
      ADD CONSTRAINT "role_tenant_id_name_uq" UNIQUE ("tenant_id", "name");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "role_tenant_id_idx"
  ON "role" ("tenant_id");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'role_tenant_id_fkey' AND table_name = 'role'
  ) THEN
    ALTER TABLE "role"
      ADD CONSTRAINT "role_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'role_created_by_fkey' AND table_name = 'role'
  ) THEN
    ALTER TABLE "role"
      ADD CONSTRAINT "role_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── 4. permission ────────────────────────────────────────────────────────────
-- Global permission catalogue — no tenant_id.
-- Seeded by platform; tenant admins assign permissions to roles, never create.

CREATE TABLE IF NOT EXISTS "permission" (
  "id"          UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "action"      VARCHAR(80) NOT NULL,
  "resource"    VARCHAR(80) NOT NULL,
  "scope"       VARCHAR(40) NOT NULL,
  "description" TEXT,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No duplicate permission definitions.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'permission_action_resource_scope_uq' AND table_name = 'permission'
  ) THEN
    ALTER TABLE "permission"
      ADD CONSTRAINT "permission_action_resource_scope_uq" UNIQUE ("action", "resource", "scope");
  END IF;
END $$;

-- ─── 5. role_permission ───────────────────────────────────────────────────────
-- Pure join table — composite PK; no surrogate id, no timestamps.

CREATE TABLE IF NOT EXISTS "role_permission" (
  "role_id"       UUID NOT NULL,
  "permission_id" UUID NOT NULL,
  CONSTRAINT "role_permission_pkey" PRIMARY KEY ("role_id", "permission_id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'role_permission_role_id_fkey' AND table_name = 'role_permission'
  ) THEN
    ALTER TABLE "role_permission"
      ADD CONSTRAINT "role_permission_role_id_fkey"
      FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'role_permission_permission_id_fkey' AND table_name = 'role_permission'
  ) THEN
    ALTER TABLE "role_permission"
      ADD CONSTRAINT "role_permission_permission_id_fkey"
      FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── 6. role_assignment ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "role_assignment" (
  "id"          UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"   UUID        NOT NULL,
  "user_id"     UUID        NOT NULL,
  "role_id"     UUID        NOT NULL,
  "granted_by"  UUID,
  "granted_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expires_at"  TIMESTAMPTZ,
  "row_version" BIGINT      NOT NULL DEFAULT 1
);

-- A user holds each role at most once per tenant.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'role_assignment_user_role_tenant_uq' AND table_name = 'role_assignment'
  ) THEN
    ALTER TABLE "role_assignment"
      ADD CONSTRAINT "role_assignment_user_role_tenant_uq" UNIQUE ("user_id", "role_id", "tenant_id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "role_assignment_tenant_id_idx"
  ON "role_assignment" ("tenant_id");

CREATE INDEX IF NOT EXISTS "role_assignment_user_id_idx"
  ON "role_assignment" ("user_id");

CREATE INDEX IF NOT EXISTS "role_assignment_role_id_idx"
  ON "role_assignment" ("role_id");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'role_assignment_tenant_id_fkey' AND table_name = 'role_assignment'
  ) THEN
    ALTER TABLE "role_assignment"
      ADD CONSTRAINT "role_assignment_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'role_assignment_user_id_fkey' AND table_name = 'role_assignment'
  ) THEN
    ALTER TABLE "role_assignment"
      ADD CONSTRAINT "role_assignment_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'role_assignment_role_id_fkey' AND table_name = 'role_assignment'
  ) THEN
    ALTER TABLE "role_assignment"
      ADD CONSTRAINT "role_assignment_role_id_fkey"
      FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'role_assignment_granted_by_fkey' AND table_name = 'role_assignment'
  ) THEN
    ALTER TABLE "role_assignment"
      ADD CONSTRAINT "role_assignment_granted_by_fkey"
      FOREIGN KEY ("granted_by") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── 7. api_client ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "api_client" (
  "id"           UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"    UUID         NOT NULL,
  "name"         VARCHAR(160) NOT NULL,
  "token_hash"   VARCHAR(255) NOT NULL,
  "scopes"       JSONB        NOT NULL,
  "created_by"   UUID,
  "expires_at"   TIMESTAMPTZ,
  "last_used_at" TIMESTAMPTZ,
  "revoked_at"   TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "row_version"  BIGINT       NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "api_client_tenant_id_idx"
  ON "api_client" ("tenant_id");

CREATE INDEX IF NOT EXISTS "api_client_token_hash_idx"
  ON "api_client" ("token_hash");

CREATE INDEX IF NOT EXISTS "api_client_expires_at_idx"
  ON "api_client" ("expires_at");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'api_client_tenant_id_fkey' AND table_name = 'api_client'
  ) THEN
    ALTER TABLE "api_client"
      ADD CONSTRAINT "api_client_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'api_client_created_by_fkey' AND table_name = 'api_client'
  ) THEN
    ALTER TABLE "api_client"
      ADD CONSTRAINT "api_client_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
