-- M11 Employee Self-Service Scope A
-- Link AppUser ↔ Employee; change requests; policy acknowledgements; notifications

-- 1) employee.user_id (optional unique FK to app_user)
ALTER TABLE "employee" ADD COLUMN IF NOT EXISTS "user_id" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "employee_user_id_key" ON "employee"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_user_id_fkey'
  ) THEN
    ALTER TABLE "employee"
      ADD CONSTRAINT "employee_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Best-effort backfill: match work email to app_user.email within same tenant via role_assignment.
-- PostgreSQL does not allow referencing the UPDATE target alias inside JOIN ON clauses of FROM.
UPDATE "employee" e
SET "user_id" = u.id
FROM "app_user" u
INNER JOIN "role_assignment" ra ON ra.user_id = u.id
INNER JOIN "role" r ON r.id = ra.role_id
WHERE e.user_id IS NULL
  AND r.tenant_id = e.tenant_id
  AND e.email_work IS NOT NULL
  AND lower(e.email_work) = lower(u.email)
  AND u.id NOT IN (SELECT user_id FROM "employee" WHERE user_id IS NOT NULL);

-- 2) employee_change_request
CREATE TABLE IF NOT EXISTS "employee_change_request" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "request_type" VARCHAR(40) NOT NULL,
  "section" VARCHAR(80),
  "field_path" VARCHAR(120),
  "current_value" TEXT,
  "requested_value" TEXT,
  "reason" TEXT,
  "evidence_file_key" VARCHAR(500),
  "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  "submitted_at" TIMESTAMPTZ(6),
  "decided_at" TIMESTAMPTZ(6),
  "decided_by" UUID,
  "decision_note" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" UUID,
  "row_version" BIGINT NOT NULL DEFAULT 1,
  CONSTRAINT "employee_change_request_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "employee_change_request_tenant_employee_idx"
  ON "employee_change_request"("tenant_id", "employee_id");
CREATE INDEX IF NOT EXISTS "employee_change_request_tenant_status_idx"
  ON "employee_change_request"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "employee_change_request_tenant_type_idx"
  ON "employee_change_request"("tenant_id", "request_type");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_change_request_tenant_id_fkey') THEN
    ALTER TABLE "employee_change_request"
      ADD CONSTRAINT "employee_change_request_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_change_request_employee_id_fkey') THEN
    ALTER TABLE "employee_change_request"
      ADD CONSTRAINT "employee_change_request_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 3) policy_acknowledgement
CREATE TABLE IF NOT EXISTS "policy_acknowledgement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "policy_key" VARCHAR(120) NOT NULL,
  "policy_title" VARCHAR(200) NOT NULL,
  "policy_version" VARCHAR(40) NOT NULL,
  "effective_date" DATE,
  "summary" TEXT,
  "employee_document_id" UUID,
  "acknowledged_at" TIMESTAMPTZ(6) NOT NULL,
  "acknowledged_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "policy_acknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "policy_acknowledgement_uq"
  ON "policy_acknowledgement"("tenant_id", "employee_id", "policy_key", "policy_version");
CREATE INDEX IF NOT EXISTS "policy_acknowledgement_tenant_employee_idx"
  ON "policy_acknowledgement"("tenant_id", "employee_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'policy_acknowledgement_tenant_id_fkey') THEN
    ALTER TABLE "policy_acknowledgement"
      ADD CONSTRAINT "policy_acknowledgement_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'policy_acknowledgement_employee_id_fkey') THEN
    ALTER TABLE "policy_acknowledgement"
      ADD CONSTRAINT "policy_acknowledgement_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 4) user_notification
CREATE TABLE IF NOT EXISTS "user_notification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "body" TEXT,
  "category" VARCHAR(40),
  "link_path" VARCHAR(500),
  "read_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "user_notification_tenant_user_created_idx"
  ON "user_notification"("tenant_id", "user_id", "created_at");
CREATE INDEX IF NOT EXISTS "user_notification_tenant_user_read_idx"
  ON "user_notification"("tenant_id", "user_id", "read_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_notification_tenant_id_fkey') THEN
    ALTER TABLE "user_notification"
      ADD CONSTRAINT "user_notification_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_notification_user_id_fkey') THEN
    ALTER TABLE "user_notification"
      ADD CONSTRAINT "user_notification_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
