-- M06 Batch 2: Attendance Policy
-- attendance_policy table with RLS

CREATE TABLE IF NOT EXISTS attendance_policy (
  id                              UUID        NOT NULL DEFAULT gen_random_uuid(),
  tenant_id                       UUID        NOT NULL,
  legal_entity_id                 UUID,
  branch_id                       UUID,
  name                            VARCHAR(160) NOT NULL,
  description                     TEXT,
  effective_from                  DATE        NOT NULL,
  effective_to                    DATE,
  version                         INT         NOT NULL DEFAULT 1,
  is_current                      BOOLEAN     NOT NULL DEFAULT true,
  working_minutes_per_day         INT         NOT NULL,
  work_start_time                 VARCHAR(5)  NOT NULL,
  work_end_time                   VARCHAR(5)  NOT NULL,
  grace_minutes                   INT         NOT NULL DEFAULT 0,
  late_tolerance_minutes          INT         NOT NULL DEFAULT 0,
  early_departure_tolerance_minutes INT       NOT NULL DEFAULT 0,
  half_day_minutes                INT         NOT NULL,
  minimum_working_minutes         INT         NOT NULL,
  overtime_threshold_minutes      INT         NOT NULL DEFAULT 0,
  rounding_strategy               VARCHAR(20) NOT NULL DEFAULT 'NONE',
  weekend_definition              JSONB       NOT NULL,
  timezone                        VARCHAR(80) NOT NULL DEFAULT 'UTC',
  allow_manual_attendance         BOOLEAN     NOT NULL DEFAULT true,
  allow_early_check_in            BOOLEAN     NOT NULL DEFAULT true,
  allow_late_check_out            BOOLEAN     NOT NULL DEFAULT true,
  allow_overtime                  BOOLEAN     NOT NULL DEFAULT false,
  allowed_ip_ranges               JSONB,
  created_by                      UUID        NOT NULL,
  updated_by                      UUID,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at                      TIMESTAMPTZ,
  row_version                     BIGINT      NOT NULL DEFAULT 1,
  CONSTRAINT attendance_policy_pkey PRIMARY KEY (id)
);

-- Foreign key constraints
ALTER TABLE attendance_policy
  ADD CONSTRAINT attendance_policy_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE RESTRICT;

ALTER TABLE attendance_policy
  ADD CONSTRAINT attendance_policy_legal_entity_id_fkey
  FOREIGN KEY (legal_entity_id) REFERENCES legal_entity(id) ON DELETE RESTRICT;

ALTER TABLE attendance_policy
  ADD CONSTRAINT attendance_policy_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE RESTRICT;

-- Indexes
CREATE INDEX IF NOT EXISTS attendance_policy_tenant_current_idx
  ON attendance_policy (tenant_id, is_current);

CREATE INDEX IF NOT EXISTS attendance_policy_tenant_entity_current_idx
  ON attendance_policy (tenant_id, legal_entity_id, is_current)
  WHERE legal_entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS attendance_policy_tenant_branch_current_idx
  ON attendance_policy (tenant_id, branch_id, is_current)
  WHERE branch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS attendance_policy_effective_from_idx
  ON attendance_policy (effective_from);

-- RLS
ALTER TABLE attendance_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_policy FORCE ROW LEVEL SECURITY;
CREATE POLICY attendance_policy_tenant_isolation ON attendance_policy
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
