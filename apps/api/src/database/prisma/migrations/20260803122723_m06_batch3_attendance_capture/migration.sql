-- CreateEnum
CREATE TYPE "device_status" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "capture_source" AS ENUM ('BIOMETRIC', 'MOBILE', 'OFFLINE', 'GATEWAY');

-- CreateEnum
CREATE TYPE "validation_status" AS ENUM ('PENDING', 'VALIDATED', 'REJECTED', 'PENDING_REVIEW');

-- CreateEnum
CREATE TYPE "geofence_shape" AS ENUM ('CIRCLE', 'POLYGON');

-- CreateTable
CREATE TABLE "attendance_device" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "deviceType" VARCHAR(64) NOT NULL,
    "vendor" VARCHAR(128),
    "model" VARCHAR(128),
    "serialNumber" VARCHAR(128),
    "deviceFingerprint" VARCHAR(128),
    "publicKeyFingerprint" VARCHAR(128),
    "timezone" VARCHAR(50),
    "ip_whitelist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_seen_at" TIMESTAMPTZ(6),
    "status" "device_status" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "attendance_device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_device_token" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "rotated_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_by" UUID,

    CONSTRAINT "attendance_device_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_device_heartbeat" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "ip_address" VARCHAR(45),
    "cpu" INTEGER,
    "memory" INTEGER,
    "disk" INTEGER,
    "queue_length" INTEGER,
    "firmware_version" VARCHAR(128),
    "clock_offset_ms" INTEGER,
    "last_sync_at" TIMESTAMPTZ(6),
    "metrics" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_device_heartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_capture_session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "device_id" UUID,
    "mobile_device_id" UUID,
    "session_token_hash" VARCHAR(255),
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "client_timezone" VARCHAR(50),
    "ip_address" VARCHAR(45),
    "status" VARCHAR(32),
    "metadata" JSONB,

    CONSTRAINT "attendance_capture_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_mobile_device" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "device_identifier" VARCHAR(255) NOT NULL,
    "platform" VARCHAR(32) NOT NULL,
    "push_token_hash" VARCHAR(255),
    "last_seen_at" TIMESTAMPTZ(6),
    "client_app_version" VARCHAR(64),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_mobile_device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_geofence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "legal_entity_id" UUID,
    "branch_id" UUID,
    "shape" "geofence_shape" NOT NULL DEFAULT 'CIRCLE',
    "center_lat" DOUBLE PRECISION,
    "center_lng" DOUBLE PRECISION,
    "radius_meters" INTEGER,
    "polygon" JSONB,
    "active_from" DATE,
    "active_to" DATE,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "attendance_geofence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_offline_queue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "session_id" UUID,
    "source" VARCHAR(32) NOT NULL,
    "payload" JSONB NOT NULL,
    "sequence_number" BIGINT NOT NULL,
    "payload_hash" VARCHAR(128) NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replayed_at" TIMESTAMPTZ(6),
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "attendance_offline_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_device_event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "capture_session_id" UUID,
    "source" "capture_source" NOT NULL,
    "source_event_id" VARCHAR(255) NOT NULL,
    "idempotency_key" VARCHAR(255),
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employee_id" UUID,
    "device_id" UUID,
    "mobile_device_id" UUID,
    "event_type" VARCHAR(64) NOT NULL,
    "geo_lat" DOUBLE PRECISION,
    "geo_lng" DOUBLE PRECISION,
    "geo_accuracy_m" INTEGER,
    "ip_address" VARCHAR(45),
    "validation_status" "validation_status" NOT NULL DEFAULT 'PENDING',
    "validation_reason" TEXT,
    "payload" JSONB NOT NULL,
    "checksum" VARCHAR(128) NOT NULL,

    CONSTRAINT "attendance_device_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_capture_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "device_event_id" UUID,
    "actor" VARCHAR(160),
    "action" VARCHAR(80) NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_capture_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_capture_audit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "actor_id" UUID,
    "audit_type" VARCHAR(80) NOT NULL,
    "target_id" VARCHAR(128),
    "details" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_capture_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_device_tenant_status_idx" ON "attendance_device"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "attendance_device_tenant_serial_idx" ON "attendance_device"("tenant_id", "serialNumber");

-- CreateIndex
CREATE INDEX "attendance_device_token_device_idx" ON "attendance_device_token"("device_id");

-- CreateIndex
CREATE INDEX "attendance_device_token_expires_idx" ON "attendance_device_token"("expires_at");

-- CreateIndex
CREATE INDEX "attendance_device_heartbeat_device_time_idx" ON "attendance_device_heartbeat"("device_id", "occurred_at");

-- CreateIndex
CREATE INDEX "attendance_capture_session_tenant_device_idx" ON "attendance_capture_session"("tenant_id", "device_id");

-- CreateIndex
CREATE INDEX "attendance_mobile_device_tenant_user_idx" ON "attendance_mobile_device"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "attendance_mobile_device_tenant_identifier_idx" ON "attendance_mobile_device"("tenant_id", "device_identifier");

-- CreateIndex
CREATE INDEX "attendance_geofence_tenant_idx" ON "attendance_geofence"("tenant_id");

-- CreateIndex
CREATE INDEX "attendance_geofence_tenant_branch_idx" ON "attendance_geofence"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "attendance_offline_queue_tenant_status_idx" ON "attendance_offline_queue"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "attendance_offline_queue_session_sequence_idx" ON "attendance_offline_queue"("session_id", "sequence_number");

-- CreateIndex
CREATE INDEX "attendance_device_event_tenant_received_idx" ON "attendance_device_event"("tenant_id", "received_at");

-- CreateIndex
CREATE INDEX "attendance_device_event_tenant_checksum_idx" ON "attendance_device_event"("tenant_id", "checksum");

-- CreateIndex
CREATE INDEX "attendance_device_event_idempotency_idx" ON "attendance_device_event"("idempotency_key");

-- CreateIndex
CREATE INDEX "attendance_capture_log_tenant_event_idx" ON "attendance_capture_log"("tenant_id", "device_event_id");

-- CreateIndex
CREATE INDEX "attendance_capture_audit_tenant_created_idx" ON "attendance_capture_audit"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "attendance_device" ADD CONSTRAINT "attendance_device_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_device_token" ADD CONSTRAINT "attendance_device_token_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "attendance_device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_device_token" ADD CONSTRAINT "attendance_device_token_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_device_heartbeat" ADD CONSTRAINT "attendance_device_heartbeat_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "attendance_device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_device_heartbeat" ADD CONSTRAINT "attendance_device_heartbeat_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_capture_session" ADD CONSTRAINT "attendance_capture_session_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_mobile_device" ADD CONSTRAINT "attendance_mobile_device_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_geofence" ADD CONSTRAINT "attendance_geofence_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_offline_queue" ADD CONSTRAINT "attendance_offline_queue_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_device_event" ADD CONSTRAINT "attendance_device_event_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_device_event" ADD CONSTRAINT "attendance_device_event_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "attendance_device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_capture_log" ADD CONSTRAINT "attendance_capture_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_capture_audit" ADD CONSTRAINT "attendance_capture_audit_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
