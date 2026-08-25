-- M07 Phase 1 — Shift Foundation
-- Versioned working-time definitions with tenant RLS.

CREATE TABLE "shift" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "start_local_time" VARCHAR(5) NOT NULL,
    "end_local_time" VARCHAR(5) NOT NULL,
    "crosses_midnight" BOOLEAN NOT NULL DEFAULT false,
    "required_minutes" INTEGER NOT NULL,
    "break_minutes" INTEGER NOT NULL DEFAULT 0,
    "break_paid" BOOLEAN NOT NULL DEFAULT false,
    "check_in_window_before" INTEGER NOT NULL DEFAULT 0,
    "check_in_window_after" INTEGER NOT NULL DEFAULT 0,
    "check_out_window_after" INTEGER NOT NULL DEFAULT 0,
    "attendance_policy_id" UUID NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "row_version" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "shift_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shift_tenant_code_version_key" ON "shift"("tenant_id", "code", "version");
CREATE INDEX "shift_tenant_status_effective_idx" ON "shift"("tenant_id", "status", "effective_from");
CREATE INDEX "shift_tenant_code_idx" ON "shift"("tenant_id", "code");
CREATE INDEX "shift_tenant_policy_idx" ON "shift"("tenant_id", "attendance_policy_id");

ALTER TABLE "shift" ADD CONSTRAINT "shift_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shift" ADD CONSTRAINT "shift_attendance_policy_id_fkey"
  FOREIGN KEY ("attendance_policy_id") REFERENCES "attendance_policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shift" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shift" FORCE ROW LEVEL SECURITY;
CREATE POLICY shift_tenant_isolation ON "shift"
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
