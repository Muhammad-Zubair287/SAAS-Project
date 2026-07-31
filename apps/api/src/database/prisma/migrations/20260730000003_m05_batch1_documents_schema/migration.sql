-- M05 Batch 1 — Onboarding & Documents: Core Schema
--   Tables: document_template, employee_document, onboarding_template,
--           onboarding_template_task, onboarding_instance,
--           onboarding_instance_task, document_request, document_request_item,
--           document_expiry_alert, esign_session
-- Expand-contract (ADR-010): additive only; no existing columns removed.
--
-- Creation order (FK dependencies):
--   document_template → tenant
--   employee_document → tenant, employee, document_template
--   onboarding_template → tenant, legal_entity
--   onboarding_template_task → tenant, onboarding_template
--   onboarding_instance → tenant, employee, onboarding_template
--   onboarding_instance_task → tenant, onboarding_instance, onboarding_template_task
--   document_request → tenant, employee
--   document_request_item → tenant, document_request, document_template, employee_document
--   document_expiry_alert → tenant, document_template
--   esign_session → tenant, employee_document
--
-- ON DELETE behaviour:
--   document_template → tenant:                   RESTRICT
--   employee_document → tenant:                   RESTRICT
--   employee_document → employee:                 CASCADE
--   employee_document → document_template:        SET NULL
--   onboarding_template → tenant:                 RESTRICT
--   onboarding_template → legal_entity:           SET NULL
--   onboarding_template_task → tenant:            RESTRICT
--   onboarding_template_task → onboarding_template: CASCADE
--   onboarding_instance → tenant:                 RESTRICT
--   onboarding_instance → employee:               CASCADE
--   onboarding_instance → onboarding_template:    SET NULL
--   onboarding_instance_task → tenant:            RESTRICT
--   onboarding_instance_task → onboarding_instance: CASCADE
--   onboarding_instance_task → onboarding_template_task: SET NULL
--   document_request → tenant:                    RESTRICT
--   document_request → employee:                  CASCADE
--   document_request_item → tenant:               RESTRICT
--   document_request_item → document_request:     CASCADE
--   document_request_item → document_template:    SET NULL
--   document_request_item → employee_document:    SET NULL
--   document_expiry_alert → tenant:               RESTRICT
--   document_expiry_alert → document_template:    CASCADE
--   esign_session → tenant:                       RESTRICT
--   esign_session → employee_document:            CASCADE
--
-- RLS: every tenant-owned table gets ENABLE + FORCE + isolation POLICY.
-- Data classification: Confidential (document metadata, file keys, signer info).
-- Spec source: M05 specification — Batch 1 scope.

-- ─── 1. document_template ─────────────────────────────────────────────────────
-- RLS enabled

CREATE TABLE IF NOT EXISTS "document_template" (
  "id"            UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"     UUID         NOT NULL,
  "type"          VARCHAR(50)  NOT NULL,
  "name"          VARCHAR(200) NOT NULL,
  "description"   TEXT,
  "is_required"   BOOLEAN      NOT NULL DEFAULT false,
  "expiry_months" INTEGER,
  "is_active"     BOOLEAN      NOT NULL DEFAULT true,
  "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "created_by"    UUID,
  "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_by"    UUID,
  "row_version"   BIGINT       NOT NULL DEFAULT 1
);

ALTER TABLE "document_template"
  ADD CONSTRAINT "document_template_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS "document_template_tenant_id_idx"
  ON "document_template" ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_template_tenant_type_idx"
  ON "document_template" ("tenant_id", "type");
CREATE INDEX IF NOT EXISTS "document_template_tenant_active_idx"
  ON "document_template" ("tenant_id", "is_active");

ALTER TABLE "document_template" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_template" FORCE ROW LEVEL SECURITY;
CREATE POLICY "document_template_tenant_isolation" ON "document_template"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ─── 2. employee_document ─────────────────────────────────────────────────────
-- RLS enabled

CREATE TABLE IF NOT EXISTS "employee_document" (
  "id"            UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"     UUID         NOT NULL,
  "employee_id"   UUID         NOT NULL,
  "template_id"   UUID,
  "document_type" VARCHAR(50)  NOT NULL,
  "title"         VARCHAR(200) NOT NULL,
  "file_key"      VARCHAR(500),
  "file_size"     INTEGER,
  "mime_type"     VARCHAR(100),
  "expiry_date"   DATE,
  "issued_date"   DATE,
  "issued_by"     VARCHAR(200),
  "status"        VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  "notes"         TEXT,
  "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "created_by"    UUID,
  "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_by"    UUID,
  "row_version"   BIGINT       NOT NULL DEFAULT 1
);

ALTER TABLE "employee_document"
  ADD CONSTRAINT "employee_document_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "employee_document_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "employee_document_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "document_template"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "employee_document_tenant_id_idx"
  ON "employee_document" ("tenant_id");
CREATE INDEX IF NOT EXISTS "employee_document_tenant_employee_idx"
  ON "employee_document" ("tenant_id", "employee_id");
CREATE INDEX IF NOT EXISTS "employee_document_tenant_status_idx"
  ON "employee_document" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "employee_document_tenant_type_idx"
  ON "employee_document" ("tenant_id", "document_type");
CREATE INDEX IF NOT EXISTS "employee_document_tenant_expiry_idx"
  ON "employee_document" ("tenant_id", "expiry_date");

ALTER TABLE "employee_document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employee_document" FORCE ROW LEVEL SECURITY;
CREATE POLICY "employee_document_tenant_isolation" ON "employee_document"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ─── 3. onboarding_template ───────────────────────────────────────────────────
-- RLS enabled

CREATE TABLE IF NOT EXISTS "onboarding_template" (
  "id"              UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"       UUID         NOT NULL,
  "legal_entity_id" UUID,
  "name"            VARCHAR(200) NOT NULL,
  "description"     TEXT,
  "is_active"       BOOLEAN      NOT NULL DEFAULT true,
  "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "created_by"      UUID,
  "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_by"      UUID,
  "row_version"     BIGINT       NOT NULL DEFAULT 1
);

ALTER TABLE "onboarding_template"
  ADD CONSTRAINT "onboarding_template_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "onboarding_template_legal_entity_id_fkey"
    FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entity"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "onboarding_template_tenant_id_idx"
  ON "onboarding_template" ("tenant_id");
CREATE INDEX IF NOT EXISTS "onboarding_template_tenant_legal_entity_idx"
  ON "onboarding_template" ("tenant_id", "legal_entity_id");
CREATE INDEX IF NOT EXISTS "onboarding_template_tenant_active_idx"
  ON "onboarding_template" ("tenant_id", "is_active");

ALTER TABLE "onboarding_template" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "onboarding_template" FORCE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_template_tenant_isolation" ON "onboarding_template"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ─── 4. onboarding_template_task ─────────────────────────────────────────────
-- RLS enabled

CREATE TABLE IF NOT EXISTS "onboarding_template_task" (
  "id"                    UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"             UUID         NOT NULL,
  "onboarding_template_id" UUID        NOT NULL,
  "title"                 VARCHAR(200) NOT NULL,
  "description"           TEXT,
  "task_type"             VARCHAR(30)  NOT NULL,
  "sort_order"            INTEGER      NOT NULL DEFAULT 0,
  "is_required"           BOOLEAN      NOT NULL DEFAULT true,
  "due_days"              INTEGER,
  "created_at"            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE "onboarding_template_task"
  ADD CONSTRAINT "onboarding_template_task_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "onboarding_template_task_onboarding_template_id_fkey"
    FOREIGN KEY ("onboarding_template_id") REFERENCES "onboarding_template"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "onboarding_template_task_tenant_id_idx"
  ON "onboarding_template_task" ("tenant_id");
CREATE INDEX IF NOT EXISTS "onboarding_template_task_tenant_template_idx"
  ON "onboarding_template_task" ("tenant_id", "onboarding_template_id");

ALTER TABLE "onboarding_template_task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "onboarding_template_task" FORCE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_template_task_tenant_isolation" ON "onboarding_template_task"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ─── 5. onboarding_instance ───────────────────────────────────────────────────
-- RLS enabled

CREATE TABLE IF NOT EXISTS "onboarding_instance" (
  "id"                    UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"             UUID         NOT NULL,
  "employee_id"           UUID         NOT NULL,
  "onboarding_template_id" UUID,
  "title"                 VARCHAR(200) NOT NULL,
  "status"                VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  "started_at"            TIMESTAMPTZ,
  "completed_at"          TIMESTAMPTZ,
  "due_date"              DATE,
  "created_at"            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "created_by"            UUID,
  "updated_at"            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_by"            UUID,
  "row_version"           BIGINT       NOT NULL DEFAULT 1
);

ALTER TABLE "onboarding_instance"
  ADD CONSTRAINT "onboarding_instance_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "onboarding_instance_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "onboarding_instance_onboarding_template_id_fkey"
    FOREIGN KEY ("onboarding_template_id") REFERENCES "onboarding_template"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "onboarding_instance_tenant_id_idx"
  ON "onboarding_instance" ("tenant_id");
CREATE INDEX IF NOT EXISTS "onboarding_instance_tenant_employee_idx"
  ON "onboarding_instance" ("tenant_id", "employee_id");
CREATE INDEX IF NOT EXISTS "onboarding_instance_tenant_status_idx"
  ON "onboarding_instance" ("tenant_id", "status");

ALTER TABLE "onboarding_instance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "onboarding_instance" FORCE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_instance_tenant_isolation" ON "onboarding_instance"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ─── 6. onboarding_instance_task ─────────────────────────────────────────────
-- RLS enabled

CREATE TABLE IF NOT EXISTS "onboarding_instance_task" (
  "id"                    UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"             UUID         NOT NULL,
  "onboarding_instance_id" UUID        NOT NULL,
  "template_task_id"      UUID,
  "title"                 VARCHAR(200) NOT NULL,
  "task_type"             VARCHAR(30)  NOT NULL,
  "is_required"           BOOLEAN      NOT NULL DEFAULT true,
  "status"                VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  "due_date"              DATE,
  "completed_at"          TIMESTAMPTZ,
  "completed_by"          UUID,
  "notes"                 TEXT,
  "created_at"            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "row_version"           BIGINT       NOT NULL DEFAULT 1
);

ALTER TABLE "onboarding_instance_task"
  ADD CONSTRAINT "onboarding_instance_task_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "onboarding_instance_task_onboarding_instance_id_fkey"
    FOREIGN KEY ("onboarding_instance_id") REFERENCES "onboarding_instance"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "onboarding_instance_task_template_task_id_fkey"
    FOREIGN KEY ("template_task_id") REFERENCES "onboarding_template_task"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "onboarding_instance_task_tenant_id_idx"
  ON "onboarding_instance_task" ("tenant_id");
CREATE INDEX IF NOT EXISTS "onboarding_instance_task_tenant_instance_idx"
  ON "onboarding_instance_task" ("tenant_id", "onboarding_instance_id");
CREATE INDEX IF NOT EXISTS "onboarding_instance_task_tenant_status_idx"
  ON "onboarding_instance_task" ("tenant_id", "status");

ALTER TABLE "onboarding_instance_task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "onboarding_instance_task" FORCE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_instance_task_tenant_isolation" ON "onboarding_instance_task"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ─── 7. document_request ─────────────────────────────────────────────────────
-- RLS enabled

CREATE TABLE IF NOT EXISTS "document_request" (
  "id"            UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"     UUID         NOT NULL,
  "employee_id"   UUID         NOT NULL,
  "requested_by"  UUID         NOT NULL,
  "title"         VARCHAR(200) NOT NULL,
  "message"       TEXT,
  "due_date"      DATE,
  "status"        VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "row_version"   BIGINT       NOT NULL DEFAULT 1
);

ALTER TABLE "document_request"
  ADD CONSTRAINT "document_request_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "document_request_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "document_request_tenant_id_idx"
  ON "document_request" ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_request_tenant_employee_idx"
  ON "document_request" ("tenant_id", "employee_id");
CREATE INDEX IF NOT EXISTS "document_request_tenant_status_idx"
  ON "document_request" ("tenant_id", "status");

ALTER TABLE "document_request" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_request" FORCE ROW LEVEL SECURITY;
CREATE POLICY "document_request_tenant_isolation" ON "document_request"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ─── 8. document_request_item ────────────────────────────────────────────────
-- RLS enabled

CREATE TABLE IF NOT EXISTS "document_request_item" (
  "id"                   UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"            UUID         NOT NULL,
  "document_request_id"  UUID         NOT NULL,
  "document_template_id" UUID,
  "title"                VARCHAR(200) NOT NULL,
  "is_required"          BOOLEAN      NOT NULL DEFAULT true,
  "employee_document_id" UUID,
  "status"               VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  "created_at"           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE "document_request_item"
  ADD CONSTRAINT "document_request_item_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "document_request_item_document_request_id_fkey"
    FOREIGN KEY ("document_request_id") REFERENCES "document_request"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "document_request_item_document_template_id_fkey"
    FOREIGN KEY ("document_template_id") REFERENCES "document_template"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "document_request_item_employee_document_id_fkey"
    FOREIGN KEY ("employee_document_id") REFERENCES "employee_document"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "document_request_item_tenant_id_idx"
  ON "document_request_item" ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_request_item_tenant_request_idx"
  ON "document_request_item" ("tenant_id", "document_request_id");
CREATE INDEX IF NOT EXISTS "document_request_item_tenant_status_idx"
  ON "document_request_item" ("tenant_id", "status");

ALTER TABLE "document_request_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_request_item" FORCE ROW LEVEL SECURITY;
CREATE POLICY "document_request_item_tenant_isolation" ON "document_request_item"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ─── 9. document_expiry_alert ─────────────────────────────────────────────────
-- RLS enabled

CREATE TABLE IF NOT EXISTS "document_expiry_alert" (
  "id"                   UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"            UUID        NOT NULL,
  "document_template_id" UUID,
  "document_type"        VARCHAR(50),
  "alert_days_before"    INTEGER[]   NOT NULL DEFAULT '{}',
  "is_active"            BOOLEAN     NOT NULL DEFAULT true,
  "created_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "document_expiry_alert"
  ADD CONSTRAINT "document_expiry_alert_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "document_expiry_alert_document_template_id_fkey"
    FOREIGN KEY ("document_template_id") REFERENCES "document_template"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "document_expiry_alert_tenant_id_idx"
  ON "document_expiry_alert" ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_expiry_alert_tenant_template_idx"
  ON "document_expiry_alert" ("tenant_id", "document_template_id");

ALTER TABLE "document_expiry_alert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_expiry_alert" FORCE ROW LEVEL SECURITY;
CREATE POLICY "document_expiry_alert_tenant_isolation" ON "document_expiry_alert"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ─── 10. esign_session ───────────────────────────────────────────────────────
-- RLS enabled

CREATE TABLE IF NOT EXISTS "esign_session" (
  "id"                   UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"            UUID         NOT NULL,
  "employee_document_id" UUID         NOT NULL,
  "provider"             VARCHAR(50)  NOT NULL,
  "provider_session_id"  VARCHAR(200),
  "signer_email"         VARCHAR(254) NOT NULL,
  "status"               VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  "initiated_at"         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "completed_at"         TIMESTAMPTZ,
  "created_at"           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE "esign_session"
  ADD CONSTRAINT "esign_session_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "esign_session_employee_document_id_fkey"
    FOREIGN KEY ("employee_document_id") REFERENCES "employee_document"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "esign_session_tenant_id_idx"
  ON "esign_session" ("tenant_id");
CREATE INDEX IF NOT EXISTS "esign_session_tenant_document_idx"
  ON "esign_session" ("tenant_id", "employee_document_id");
CREATE INDEX IF NOT EXISTS "esign_session_tenant_status_idx"
  ON "esign_session" ("tenant_id", "status");

ALTER TABLE "esign_session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "esign_session" FORCE ROW LEVEL SECURITY;
CREATE POLICY "esign_session_tenant_isolation" ON "esign_session"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
