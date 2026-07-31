-- M02 Batch 1 — Authentication Foundation: Session, PasswordCredential,
--               UserInvitation, PlatformRoleAssignment
-- Expand-contract (ADR-010): new tables only; no existing columns removed.
--
-- Design decisions:
--   session.tenant_id    — nullable (platform-staff sessions have no tenant context)
--   password_credential  — separate table (not a column on app_user); enforces
--                          separation of identity from credential lifecycle
--   @@unique([user_id])  — enforces one-active-credential-per-user at DB level
--   platform_role_assignment — prepares to replace app_user.platformRole compat
--                              column (guard migration deferred to M02 Batch 10)
--
-- ON DELETE behaviour chosen:
--   session → tenant:              SET NULL  (preserve audit history)
--   session → app_user (user):     CASCADE   (account deletion clears sessions)
--   session → app_user (imp_by):   SET NULL  (preserve impersonation audit trail)
--   password_credential → user:    CASCADE   (account deletion clears credentials)
--   user_invitation → tenant:      RESTRICT  (cannot delete tenant with pending invites)
--   user_invitation → app_user:    SET NULL  (invitation survives inviter removal)
--   platform_role_assignment → user (assignee): CASCADE  (user deletion clears grants)
--   platform_role_assignment → user (grantor):  SET NULL (keep grant if granter removed)
--
-- Spec source: M02 specification — Batch 1 scope.

-- ─── 1. session ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "session" (
  "id"                      UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"               UUID,
  "user_id"                 UUID         NOT NULL,
  "refresh_token_hash"      VARCHAR(255) NOT NULL,
  "refresh_token_family"    UUID         NOT NULL,
  "user_agent"              VARCHAR(500),
  "ip_address"              VARCHAR(45),
  "expires_at"              TIMESTAMPTZ  NOT NULL,
  "idle_expires_at"         TIMESTAMPTZ  NOT NULL,
  "revoked_at"              TIMESTAMPTZ,
  "impersonated_by_user_id" UUID,
  "created_at"              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "row_version"             BIGINT       NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX IF NOT EXISTS "session_user_id_idx"
  ON "session" ("user_id");

CREATE INDEX IF NOT EXISTS "session_tenant_id_idx"
  ON "session" ("tenant_id");

CREATE INDEX IF NOT EXISTS "session_refresh_token_family_idx"
  ON "session" ("refresh_token_family");

CREATE INDEX IF NOT EXISTS "session_expires_at_idx"
  ON "session" ("expires_at");

-- Foreign keys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'session_tenant_id_fkey' AND table_name = 'session'
  ) THEN
    ALTER TABLE "session"
      ADD CONSTRAINT "session_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'session_user_id_fkey' AND table_name = 'session'
  ) THEN
    ALTER TABLE "session"
      ADD CONSTRAINT "session_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'session_impersonated_by_user_id_fkey' AND table_name = 'session'
  ) THEN
    ALTER TABLE "session"
      ADD CONSTRAINT "session_impersonated_by_user_id_fkey"
      FOREIGN KEY ("impersonated_by_user_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── 2. password_credential ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "password_credential" (
  "id"            UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"       UUID         NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "expires_at"    TIMESTAMPTZ,
  "row_version"   BIGINT       NOT NULL DEFAULT 1
);

-- Unique constraint: exactly one credential record per user (one-active-per-user rule).
-- Service rotates by deleting existing row and inserting replacement in one transaction.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'password_credential_user_id_uq' AND table_name = 'password_credential'
  ) THEN
    ALTER TABLE "password_credential"
      ADD CONSTRAINT "password_credential_user_id_uq" UNIQUE ("user_id");
  END IF;
END $$;

-- Foreign key
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'password_credential_user_id_fkey' AND table_name = 'password_credential'
  ) THEN
    ALTER TABLE "password_credential"
      ADD CONSTRAINT "password_credential_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── 3. user_invitation ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "user_invitation" (
  "id"          UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"   UUID         NOT NULL,
  "email"       VARCHAR(320) NOT NULL,
  "role_ids"    JSONB        NOT NULL,
  "token_hash"  VARCHAR(255) NOT NULL,
  "invited_by"  UUID,
  "expires_at"  TIMESTAMPTZ  NOT NULL,
  "accepted_at" TIMESTAMPTZ,
  "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "row_version" BIGINT       NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX IF NOT EXISTS "user_invitation_tenant_id_idx"
  ON "user_invitation" ("tenant_id");

CREATE INDEX IF NOT EXISTS "user_invitation_email_idx"
  ON "user_invitation" ("email");

CREATE INDEX IF NOT EXISTS "user_invitation_token_hash_idx"
  ON "user_invitation" ("token_hash");

CREATE INDEX IF NOT EXISTS "user_invitation_expires_at_idx"
  ON "user_invitation" ("expires_at");

-- Foreign keys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_invitation_tenant_id_fkey' AND table_name = 'user_invitation'
  ) THEN
    ALTER TABLE "user_invitation"
      ADD CONSTRAINT "user_invitation_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_invitation_invited_by_fkey' AND table_name = 'user_invitation'
  ) THEN
    ALTER TABLE "user_invitation"
      ADD CONSTRAINT "user_invitation_invited_by_fkey"
      FOREIGN KEY ("invited_by") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── 4. platform_role_assignment ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "platform_role_assignment" (
  "id"            UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"       UUID        NOT NULL,
  "platform_role" VARCHAR(80) NOT NULL,
  "granted_by"    UUID,
  "granted_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "revoked_at"    TIMESTAMPTZ,
  "row_version"   BIGINT      NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX IF NOT EXISTS "platform_role_assignment_user_id_idx"
  ON "platform_role_assignment" ("user_id");

CREATE INDEX IF NOT EXISTS "platform_role_assignment_platform_role_idx"
  ON "platform_role_assignment" ("platform_role");

-- Foreign keys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'platform_role_assignment_user_id_fkey' AND table_name = 'platform_role_assignment'
  ) THEN
    ALTER TABLE "platform_role_assignment"
      ADD CONSTRAINT "platform_role_assignment_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'platform_role_assignment_granted_by_fkey' AND table_name = 'platform_role_assignment'
  ) THEN
    ALTER TABLE "platform_role_assignment"
      ADD CONSTRAINT "platform_role_assignment_granted_by_fkey"
      FOREIGN KEY ("granted_by") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
