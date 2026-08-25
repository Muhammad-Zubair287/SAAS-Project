-- Super Admin epic: usage snapshot extensions + platform settings/notifications/integrations

ALTER TABLE "tenant_usage_snapshot"
  ADD COLUMN IF NOT EXISTS "estimated_mrr" DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS "module_adoption_json" JSONB;

CREATE TABLE IF NOT EXISTS "platform_setting" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "domain" VARCHAR(40) NOT NULL,
  "value" JSONB NOT NULL,
  "row_version" BIGINT NOT NULL DEFAULT 1,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_setting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_setting_domain_key" ON "platform_setting"("domain");

CREATE TABLE IF NOT EXISTS "platform_notification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "body" TEXT,
  "category" VARCHAR(40),
  "link_path" VARCHAR(500),
  "severity" VARCHAR(20) NOT NULL DEFAULT 'INFO',
  "read_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "platform_notification_user_created_idx" ON "platform_notification"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "platform_notification_user_read_idx" ON "platform_notification"("user_id", "read_at");

CREATE TABLE IF NOT EXISTS "user_preference" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "locale" VARCHAR(16) NOT NULL DEFAULT 'en',
  "notification_email" BOOLEAN NOT NULL DEFAULT true,
  "notification_in_app" BOOLEAN NOT NULL DEFAULT true,
  "notification_security" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_preference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_preference_user_id_key" ON "user_preference"("user_id");

CREATE TABLE IF NOT EXISTS "integration_connection" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "category" VARCHAR(40) NOT NULL,
  "provider" VARCHAR(80),
  "status" VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "last_sync_at" TIMESTAMPTZ(6),
  "last_success_at" TIMESTAMPTZ(6),
  "last_failure_at" TIMESTAMPTZ(6),
  "error_count_24h" INTEGER NOT NULL DEFAULT 0,
  "items_processed" INTEGER NOT NULL DEFAULT 0,
  "success_rate_pct" DECIMAL(5, 2),
  "config_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "integration_connection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "integration_connection_code_key" ON "integration_connection"("code");
CREATE INDEX IF NOT EXISTS "integration_connection_category_status_idx" ON "integration_connection"("category", "status");

CREATE TABLE IF NOT EXISTS "integration_health_check" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "connection_id" UUID NOT NULL,
  "status" VARCHAR(20) NOT NULL,
  "latency_ms" INTEGER,
  "message" TEXT,
  "checked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "integration_health_check_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "integration_health_check_connection_id_checked_at_idx"
  ON "integration_health_check"("connection_id", "checked_at");

CREATE TABLE IF NOT EXISTS "integration_sync_run" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "connection_id" UUID NOT NULL,
  "status" VARCHAR(20) NOT NULL,
  "items_processed" INTEGER NOT NULL DEFAULT 0,
  "error_count" INTEGER NOT NULL DEFAULT 0,
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMPTZ(6),
  "duration_ms" INTEGER,
  "message" TEXT,
  CONSTRAINT "integration_sync_run_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "integration_sync_run_connection_id_started_at_idx"
  ON "integration_sync_run"("connection_id", "started_at");

CREATE TABLE IF NOT EXISTS "integration_reconciliation_item" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "connection_id" UUID NOT NULL,
  "external_id" VARCHAR(200) NOT NULL,
  "item_type" VARCHAR(40) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'UNMAPPED',
  "payload" JSONB,
  "resolved_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "integration_reconciliation_item_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "integration_reconciliation_item_connection_id_status_idx"
  ON "integration_reconciliation_item"("connection_id", "status");

CREATE TABLE IF NOT EXISTS "audit_export_job" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requested_by" UUID NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "format" VARCHAR(20) NOT NULL DEFAULT 'CSV',
  "filters_json" JSONB,
  "reason" TEXT,
  "file_path" VARCHAR(500),
  "row_count" INTEGER,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(6),
  CONSTRAINT "audit_export_job_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_export_job_requested_by_created_at_idx"
  ON "audit_export_job"("requested_by", "created_at");

DO $$ BEGIN
  ALTER TABLE "platform_notification"
    ADD CONSTRAINT "platform_notification_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "user_preference"
    ADD CONSTRAINT "user_preference_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "integration_health_check"
    ADD CONSTRAINT "integration_health_check_connection_id_fkey"
    FOREIGN KEY ("connection_id") REFERENCES "integration_connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "integration_sync_run"
    ADD CONSTRAINT "integration_sync_run_connection_id_fkey"
    FOREIGN KEY ("connection_id") REFERENCES "integration_connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "integration_reconciliation_item"
    ADD CONSTRAINT "integration_reconciliation_item_connection_id_fkey"
    FOREIGN KEY ("connection_id") REFERENCES "integration_connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed default integration catalogue
INSERT INTO "integration_connection" ("code", "name", "category", "provider", "status", "enabled")
VALUES
  ('email-primary', 'Email Provider', 'email', 'smtp', 'UNKNOWN', true),
  ('sms-primary', 'SMS Provider', 'sms', 'twilio', 'UNKNOWN', true),
  ('sso-entra', 'Identity Provider (Entra ID)', 'identity', 'entra', 'UNKNOWN', true),
  ('webhooks-platform', 'Webhook Endpoints', 'webhook', 'internal', 'UNKNOWN', true),
  ('api-clients', 'API Clients', 'api', 'internal', 'UNKNOWN', true),
  ('biometric-default', 'Biometric Connections', 'biometric', 'generic', 'UNKNOWN', false)
ON CONFLICT ("code") DO NOTHING;

-- Default platform settings domains
INSERT INTO "platform_setting" ("domain", "value")
VALUES
  ('general', '{"platformName":"Workforce Cloud OS","contactEmail":"support@workforcecloudos.com","defaultTimezone":"Asia/Karachi","defaultCurrency":"PKR","defaultLanguage":"en","supportUrl":"https://support.workforcecloudos.com","helpCenterUrl":"https://help.workforcecloudos.com","docsUrl":"https://docs.workforcecloudos.com","statusPageUrl":"https://status.workforcecloudos.com"}'::jsonb),
  ('security', '{"passwordMinLength":10,"requireUppercase":true,"requireLowercase":true,"requireNumbers":true,"requireSpecial":true,"passwordExpiryDays":0,"passwordHistory":5,"failedAttemptsBeforeLockout":5,"lockoutDurationMinutes":30,"sessionTimeoutMinutes":60,"concurrentSessionsAllowed":true,"maxConcurrentSessions":5,"requireMfaPlatformAdmin":true,"requireMfaTenantAdmins":false,"requireMfaPayrollApproval":true,"requireMfaDataExport":true,"allowedMfaMethods":["TOTP","WebAuthn","RecoveryCodes"],"enableSupportAccessApproval":false,"supportAccessDurationLimitDays":7,"requireSupportAccessReason":true,"enableSensitiveDataMasking":true,"requireMfaSensitiveExport":true,"exportExpiryDays":7}'::jsonb),
  ('retention', '{"employeeCoreMonths":84,"payrollMonths":84,"attendanceMonths":36,"auditMonths":24,"sessionDays":90,"integrationPayloadDays":30,"generatedExportsDays":7,"autoCleanup":false,"cleanupCron":"0 3 * * 0","legalHold":false}'::jsonb),
  ('notifications', '{"emailProvider":"SMTP","fromEmail":"noreply@workforcecloudos.com","fromName":"Workforce Cloud OS","enableTls":true,"smsProvider":"Twilio","pushProvider":"Firebase","maxRetryAttempts":3,"retryDelayMinutes":5,"deadLetterQueue":true}'::jsonb),
  ('integrations', '{"defaultSyncCron":"*/15 * * * *","duplicateWindowSeconds":30,"locationRequired":false,"webhookMaxPayloadKb":256,"webhookRateLimitPerMinute":120,"enableSignatureVerification":true,"apiRateLimitPerTenant":1000,"apiRateLimitPerUser":120,"enableThrottling":true}'::jsonb),
  ('audit', '{"retentionMonths":24,"requiredEvents":["tenant.created","tenant.suspended","support.granted","config.updated"],"enableSecurityAlerts":true,"alertChannels":["Email"],"failedLoginThreshold":5}'::jsonb)
ON CONFLICT ("domain") DO NOTHING;
