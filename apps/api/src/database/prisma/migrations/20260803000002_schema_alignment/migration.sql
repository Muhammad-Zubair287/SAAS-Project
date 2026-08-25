-- DropForeignKey
ALTER TABLE "attendance_exception" DROP CONSTRAINT "attendance_exception_attendance_record_id_fkey";

-- DropForeignKey
ALTER TABLE "attendance_exception" DROP CONSTRAINT "attendance_exception_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "attendance_exception" DROP CONSTRAINT "attendance_exception_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "attendance_policy" DROP CONSTRAINT "attendance_policy_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "attendance_policy" DROP CONSTRAINT "attendance_policy_legal_entity_id_fkey";

-- DropForeignKey
ALTER TABLE "attendance_policy" DROP CONSTRAINT "attendance_policy_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "attendance_raw_event" DROP CONSTRAINT "attendance_raw_event_corrects_event_id_fkey";

-- DropForeignKey
ALTER TABLE "attendance_raw_event" DROP CONSTRAINT "attendance_raw_event_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "attendance_raw_event" DROP CONSTRAINT "attendance_raw_event_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "attendance_record" DROP CONSTRAINT "attendance_record_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "attendance_record" DROP CONSTRAINT "attendance_record_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "document_expiry_alert" DROP CONSTRAINT "document_expiry_alert_document_template_id_fkey";

-- DropForeignKey
ALTER TABLE "document_expiry_alert" DROP CONSTRAINT "document_expiry_alert_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "document_request" DROP CONSTRAINT "document_request_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "document_request" DROP CONSTRAINT "document_request_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "document_request_item" DROP CONSTRAINT "document_request_item_document_request_id_fkey";

-- DropForeignKey
ALTER TABLE "document_request_item" DROP CONSTRAINT "document_request_item_document_template_id_fkey";

-- DropForeignKey
ALTER TABLE "document_request_item" DROP CONSTRAINT "document_request_item_employee_document_id_fkey";

-- DropForeignKey
ALTER TABLE "document_request_item" DROP CONSTRAINT "document_request_item_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "document_template" DROP CONSTRAINT "document_template_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "employee" DROP CONSTRAINT "employee_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "employee" DROP CONSTRAINT "employee_department_id_fkey";

-- DropForeignKey
ALTER TABLE "employee" DROP CONSTRAINT "employee_legal_entity_id_fkey";

-- DropForeignKey
ALTER TABLE "employee" DROP CONSTRAINT "employee_manager_id_fkey";

-- DropForeignKey
ALTER TABLE "employee" DROP CONSTRAINT "employee_position_id_fkey";

-- DropForeignKey
ALTER TABLE "employee" DROP CONSTRAINT "employee_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "employee_document" DROP CONSTRAINT "employee_document_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "employee_document" DROP CONSTRAINT "employee_document_template_id_fkey";

-- DropForeignKey
ALTER TABLE "employee_document" DROP CONSTRAINT "employee_document_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "employee_personal_detail" DROP CONSTRAINT "employee_personal_detail_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "employee_personal_detail" DROP CONSTRAINT "employee_personal_detail_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "esign_session" DROP CONSTRAINT "esign_session_employee_document_id_fkey";

-- DropForeignKey
ALTER TABLE "esign_session" DROP CONSTRAINT "esign_session_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "onboarding_instance" DROP CONSTRAINT "onboarding_instance_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "onboarding_instance" DROP CONSTRAINT "onboarding_instance_onboarding_template_id_fkey";

-- DropForeignKey
ALTER TABLE "onboarding_instance" DROP CONSTRAINT "onboarding_instance_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "onboarding_instance_task" DROP CONSTRAINT "onboarding_instance_task_onboarding_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "onboarding_instance_task" DROP CONSTRAINT "onboarding_instance_task_template_task_id_fkey";

-- DropForeignKey
ALTER TABLE "onboarding_instance_task" DROP CONSTRAINT "onboarding_instance_task_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "onboarding_template" DROP CONSTRAINT "onboarding_template_legal_entity_id_fkey";

-- DropForeignKey
ALTER TABLE "onboarding_template" DROP CONSTRAINT "onboarding_template_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "onboarding_template_task" DROP CONSTRAINT "onboarding_template_task_onboarding_template_id_fkey";

-- DropForeignKey
ALTER TABLE "onboarding_template_task" DROP CONSTRAINT "onboarding_template_task_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "plan_entitlement" DROP CONSTRAINT "plan_entitlement_entitlement_id_fkey";

-- DropForeignKey
ALTER TABLE "plan_entitlement" DROP CONSTRAINT "plan_entitlement_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "support_grant" DROP CONSTRAINT "support_grant_approved_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "support_grant" DROP CONSTRAINT "support_grant_requested_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "support_grant" DROP CONSTRAINT "support_grant_support_user_id_fkey";

-- DropForeignKey
ALTER TABLE "support_grant" DROP CONSTRAINT "support_grant_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant" DROP CONSTRAINT "tenant_deployment_region_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant" DROP CONSTRAINT "tenant_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_branding" DROP CONSTRAINT "tenant_branding_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_entitlement" DROP CONSTRAINT "tenant_entitlement_entitlement_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_entitlement" DROP CONSTRAINT "tenant_entitlement_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_feature_flag" DROP CONSTRAINT "tenant_feature_flag_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_subscription" DROP CONSTRAINT "tenant_subscription_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_subscription" DROP CONSTRAINT "tenant_subscription_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_usage_snapshot" DROP CONSTRAINT "tenant_usage_snapshot_tenant_id_fkey";

-- DropIndex
DROP INDEX "attendance_raw_event_event_time_brin";

-- DropIndex
DROP INDEX "audit_event_actor_id_idx";

-- DropIndex
DROP INDEX "audit_event_occurred_at_idx";

-- DropIndex
DROP INDEX "audit_event_resource_type_id_idx";

-- DropIndex
DROP INDEX "audit_event_tenant_id_occurred_at_idx";

-- DropIndex
DROP INDEX "idempotency_keys_expires_at_idx";

-- DropConstraint
ALTER TABLE "outbox_events" DROP CONSTRAINT "outbox_events_event_id_key";

-- DropIndex
DROP INDEX "outbox_events_status_created_at_idx";

-- DropIndex
DROP INDEX "outbox_events_tenant_id_idx";

-- DropConstraint
ALTER TABLE "tenant_branding" DROP CONSTRAINT "tenant_branding_tenant_id_key";

-- DropIndex
DROP INDEX "tenant_usage_snapshot_tenant_id_idx";

-- DropConstraint
ALTER TABLE "tenant_usage_snapshot" DROP CONSTRAINT "tenant_usage_snapshot_tenant_id_snapshot_date_key";

-- AlterTable
ALTER TABLE "app_user" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ALTER COLUMN "email_normalised" DROP NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "attendance_exception" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "attendance_policy" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "attendance_record" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "audit_event" DROP COLUMN "actor_email",
DROP COLUMN "actor_id",
DROP COLUMN "actor_type",
DROP COLUMN "correlation_id",
DROP COLUMN "ip_address",
DROP COLUMN "occurred_at",
DROP COLUMN "resource_id",
DROP COLUMN "resource_type",
DROP COLUMN "tenant_id",
DROP COLUMN "user_agent",
ADD COLUMN     "actorEmail" VARCHAR(255),
ADD COLUMN     "actorId" UUID NOT NULL,
ADD COLUMN     "actorType" VARCHAR(40) NOT NULL,
ADD COLUMN     "correlationId" UUID NOT NULL,
ADD COLUMN     "ipAddress" VARCHAR(45),
ADD COLUMN     "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "resourceId" VARCHAR(200),
ADD COLUMN     "resourceType" VARCHAR(80) NOT NULL,
ADD COLUMN     "tenantId" UUID,
ADD COLUMN     "userAgent" VARCHAR(500);

-- AlterTable
ALTER TABLE "branch" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cost_centre" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "department" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "deployment_region" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "document_expiry_alert" ALTER COLUMN "alert_days_before" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "document_request" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "document_request_item" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "document_template" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "employee" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "employee_document" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "employee_personal_detail" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "entitlement" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "esign_session" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "idempotency_keys" DROP COLUMN "created_at",
DROP COLUMN "expires_at",
DROP COLUMN "request_hash",
DROP COLUMN "response_body",
DROP COLUMN "status_code",
DROP COLUMN "tenant_id",
ADD COLUMN     "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expiresAt" TIMESTAMPTZ(6) NOT NULL,
ADD COLUMN     "requestHash" TEXT NOT NULL,
ADD COLUMN     "responseBody" JSONB,
ADD COLUMN     "statusCode" INTEGER,
ADD COLUMN     "tenantId" UUID;

-- AlterTable
ALTER TABLE "legal_entity" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "onboarding_instance" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "onboarding_instance_task" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "onboarding_template" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "onboarding_template_task" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "outbox_events" DROP COLUMN "created_at",
DROP COLUMN "event_id",
DROP COLUMN "event_type",
DROP COLUMN "last_error",
DROP COLUMN "published_at",
DROP COLUMN "tenant_id",
ADD COLUMN     "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "eventId" UUID NOT NULL,
ADD COLUMN     "eventType" TEXT NOT NULL,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMPTZ(6),
ADD COLUMN     "tenantId" UUID;

-- AlterTable
ALTER TABLE "plan" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "position" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "role" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "support_grant" DROP COLUMN "approvedByUserId",
DROP COLUMN "createdAt",
DROP COLUMN "endsAt",
DROP COLUMN "requestedByUserId",
DROP COLUMN "revokedAt",
DROP COLUMN "rowVersion",
DROP COLUMN "startsAt",
DROP COLUMN "supportUserId",
DROP COLUMN "tenantId",
DROP COLUMN "updatedAt",
ALTER COLUMN "scope" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_branding" DROP COLUMN "created_at",
DROP COLUMN "favicon_url",
DROP COLUMN "logo_url",
DROP COLUMN "primary_color",
DROP COLUMN "tenant_id",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "faviconUrl" VARCHAR(500),
ADD COLUMN     "logoUrl" VARCHAR(500),
ADD COLUMN     "primaryColor" VARCHAR(7),
ADD COLUMN     "tenantId" UUID NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(6) NOT NULL;

-- AlterTable
ALTER TABLE "tenant_entitlement" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(6) NOT NULL;

-- AlterTable
ALTER TABLE "tenant_feature_flag" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(6) NOT NULL;

-- AlterTable
ALTER TABLE "tenant_subscription" DROP COLUMN "billingCycle",
DROP COLUMN "seatLimit",
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_usage_snapshot" DROP COLUMN "active_employees",
DROP COLUMN "api_calls_month",
DROP COLUMN "created_at",
DROP COLUMN "snapshot_date",
DROP COLUMN "storage_used_bytes",
DROP COLUMN "tenant_id",
DROP COLUMN "total_employees",
ADD COLUMN     "activeEmployees" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "apiCallsMonth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "snapshotDate" DATE NOT NULL,
ADD COLUMN     "storageUsedBytes" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "tenantId" UUID NOT NULL,
ADD COLUMN     "totalEmployees" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "password_reset_token" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "password_reset_token_hash_idx" ON "password_reset_token"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_token_user_id_idx" ON "password_reset_token"("user_id");

-- CreateIndex
CREATE INDEX "attendance_policy_tenant_id_legal_entity_id_is_current_idx" ON "attendance_policy"("tenant_id", "legal_entity_id", "is_current");

-- CreateIndex
CREATE INDEX "attendance_policy_tenant_id_branch_id_is_current_idx" ON "attendance_policy"("tenant_id", "branch_id", "is_current");

-- CreateIndex
CREATE INDEX "audit_event_tenantId_occurredAt_idx" ON "audit_event"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_event_actorId_idx" ON "audit_event"("actorId");

-- CreateIndex
CREATE INDEX "audit_event_resourceType_resourceId_idx" ON "audit_event"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "audit_event_occurredAt_idx" ON "audit_event"("occurredAt");

-- CreateIndex
CREATE INDEX "idempotency_keys_expiresAt_idx" ON "idempotency_keys"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_events_eventId_key" ON "outbox_events"("eventId");

-- CreateIndex
CREATE INDEX "outbox_events_status_createdAt_idx" ON "outbox_events"("status", "createdAt");

-- CreateIndex
CREATE INDEX "outbox_events_tenantId_idx" ON "outbox_events"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_status_idx" ON "tenant"("status");

-- CreateIndex
CREATE INDEX "tenant_planKey_idx" ON "tenant"("planKey");

-- CreateIndex
CREATE INDEX "tenant_countryCode_idx" ON "tenant"("countryCode");

-- CreateIndex
CREATE INDEX "tenant_createdAt_idx" ON "tenant"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_branding_tenantId_key" ON "tenant_branding"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_subscription_tenantId_status_idx" ON "tenant_subscription"("tenantId", "status");

-- CreateIndex
CREATE INDEX "tenant_subscription_trialEndsAt_idx" ON "tenant_subscription"("trialEndsAt");

-- CreateIndex
CREATE INDEX "tenant_usage_snapshot_tenantId_snapshotDate_idx" ON "tenant_usage_snapshot"("tenantId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_usage_snapshot_tenantId_snapshotDate_key" ON "tenant_usage_snapshot"("tenantId", "snapshotDate");

-- AddForeignKey
ALTER TABLE "plan_entitlement" ADD CONSTRAINT "plan_entitlement_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_entitlement" ADD CONSTRAINT "plan_entitlement_entitlement_id_fkey" FOREIGN KEY ("entitlement_id") REFERENCES "entitlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant" ADD CONSTRAINT "tenant_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant" ADD CONSTRAINT "tenant_deployment_region_id_fkey" FOREIGN KEY ("deployment_region_id") REFERENCES "deployment_region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_branding" ADD CONSTRAINT "tenant_branding_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscription" ADD CONSTRAINT "tenant_subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscription" ADD CONSTRAINT "tenant_subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_entitlement" ADD CONSTRAINT "tenant_entitlement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_entitlement" ADD CONSTRAINT "tenant_entitlement_entitlement_id_fkey" FOREIGN KEY ("entitlement_id") REFERENCES "entitlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_feature_flag" ADD CONSTRAINT "tenant_feature_flag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_usage_snapshot" ADD CONSTRAINT "tenant_usage_snapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_grant" ADD CONSTRAINT "support_grant_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_personal_detail" ADD CONSTRAINT "employee_personal_detail_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_personal_detail" ADD CONSTRAINT "employee_personal_detail_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_template" ADD CONSTRAINT "document_template_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_document" ADD CONSTRAINT "employee_document_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_document" ADD CONSTRAINT "employee_document_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_document" ADD CONSTRAINT "employee_document_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "document_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_template" ADD CONSTRAINT "onboarding_template_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_template" ADD CONSTRAINT "onboarding_template_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_template_task" ADD CONSTRAINT "onboarding_template_task_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_template_task" ADD CONSTRAINT "onboarding_template_task_onboarding_template_id_fkey" FOREIGN KEY ("onboarding_template_id") REFERENCES "onboarding_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_instance" ADD CONSTRAINT "onboarding_instance_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_instance" ADD CONSTRAINT "onboarding_instance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_instance" ADD CONSTRAINT "onboarding_instance_onboarding_template_id_fkey" FOREIGN KEY ("onboarding_template_id") REFERENCES "onboarding_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_instance_task" ADD CONSTRAINT "onboarding_instance_task_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_instance_task" ADD CONSTRAINT "onboarding_instance_task_onboarding_instance_id_fkey" FOREIGN KEY ("onboarding_instance_id") REFERENCES "onboarding_instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_instance_task" ADD CONSTRAINT "onboarding_instance_task_template_task_id_fkey" FOREIGN KEY ("template_task_id") REFERENCES "onboarding_template_task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_request" ADD CONSTRAINT "document_request_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_request" ADD CONSTRAINT "document_request_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_request_item" ADD CONSTRAINT "document_request_item_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_request_item" ADD CONSTRAINT "document_request_item_document_request_id_fkey" FOREIGN KEY ("document_request_id") REFERENCES "document_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_request_item" ADD CONSTRAINT "document_request_item_document_template_id_fkey" FOREIGN KEY ("document_template_id") REFERENCES "document_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_request_item" ADD CONSTRAINT "document_request_item_employee_document_id_fkey" FOREIGN KEY ("employee_document_id") REFERENCES "employee_document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_expiry_alert" ADD CONSTRAINT "document_expiry_alert_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_expiry_alert" ADD CONSTRAINT "document_expiry_alert_document_template_id_fkey" FOREIGN KEY ("document_template_id") REFERENCES "document_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esign_session" ADD CONSTRAINT "esign_session_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esign_session" ADD CONSTRAINT "esign_session_employee_document_id_fkey" FOREIGN KEY ("employee_document_id") REFERENCES "employee_document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_raw_event" ADD CONSTRAINT "attendance_raw_event_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_raw_event" ADD CONSTRAINT "attendance_raw_event_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_raw_event" ADD CONSTRAINT "attendance_raw_event_corrects_event_id_fkey" FOREIGN KEY ("corrects_event_id") REFERENCES "attendance_raw_event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_exception" ADD CONSTRAINT "attendance_exception_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_exception" ADD CONSTRAINT "attendance_exception_attendance_record_id_fkey" FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_exception" ADD CONSTRAINT "attendance_exception_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_policy" ADD CONSTRAINT "attendance_policy_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_policy" ADD CONSTRAINT "attendance_policy_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_policy" ADD CONSTRAINT "attendance_policy_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "attendance_exception_tenant_date_idx" RENAME TO "attendance_exception_tenant_id_exception_date_idx";

-- RenameIndex
ALTER INDEX "attendance_exception_tenant_employee_idx" RENAME TO "attendance_exception_tenant_id_employee_id_idx";

-- RenameIndex
ALTER INDEX "attendance_exception_tenant_record_idx" RENAME TO "attendance_exception_tenant_id_attendance_record_id_idx";

-- RenameIndex
ALTER INDEX "attendance_exception_tenant_resolved_idx" RENAME TO "attendance_exception_tenant_id_is_resolved_idx";

-- RenameIndex
ALTER INDEX "attendance_policy_tenant_current_idx" RENAME TO "attendance_policy_tenant_id_is_current_idx";

-- RenameIndex
ALTER INDEX "attendance_raw_event_idempotency_key_uq" RENAME TO "attendance_raw_event_idempotency_key_key";

-- RenameIndex
ALTER INDEX "attendance_raw_event_tenant_employee_idx" RENAME TO "attendance_raw_event_tenant_id_employee_id_idx";

-- RenameIndex
ALTER INDEX "attendance_raw_event_tenant_event_time_idx" RENAME TO "attendance_raw_event_tenant_id_event_time_idx";

-- RenameIndex
ALTER INDEX "attendance_raw_event_tenant_status_idx" RENAME TO "attendance_raw_event_tenant_id_status_idx";

-- RenameIndex
ALTER INDEX "attendance_record_tenant_date_idx" RENAME TO "attendance_record_tenant_id_attendance_date_idx";

-- RenameIndex
ALTER INDEX "attendance_record_tenant_employee_idx" RENAME TO "attendance_record_tenant_id_employee_id_idx";

-- RenameIndex
ALTER INDEX "attendance_record_tenant_status_idx" RENAME TO "attendance_record_tenant_id_status_idx";

-- RenameIndex
ALTER INDEX "employee_personal_detail_employee_id_uq" RENAME TO "employee_personal_detail_employee_id_key";

-- RenameIndex
ALTER INDEX "tenant_entitlement_eid_efrom_idx" RENAME TO "tenant_entitlement_tenantId_entitlement_id_effective_from_idx";

-- RenameIndex
ALTER INDEX "tenant_feature_flag_tenantId_flagKey_effectiveFrom_key" RENAME TO "tenant_feature_flag_tenantId_flag_key_effective_from_key";

-- RenameIndex
ALTER INDEX "tenant_feature_flag_tenant_idx" RENAME TO "tenant_feature_flag_tenantId_idx";

