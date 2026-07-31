-- M01 Batch 3 — TenantSubscription alignment
-- Expand-contract (ADR-010): new spec columns added; old compatibility columns
-- retained in DB. Compatibility columns (billingCycle, seatLimit, planKey,
-- trialEndsAt, currentPeriodStart, currentPeriodEnd, cancelledAt) are NOT dropped
-- here. They will be removed in a future cleanup migration after all consumers
-- are updated and verified.

-- ─── 1. Extend subscription_status enum (additive, safe) ─────────────────────
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'TRIAL';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'GRACE';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'SUSPENDED';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'ENDED';
-- Compatibility values already present: TRIALING, ACTIVE, PAST_DUE, CANCELLED, EXPIRED.

-- ─── 2. Modify existing tenant_subscription table ─────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'tenant_subscription'
  ) THEN

    -- 2a. Drop old plan FK (planKey → plan.code) defensively before making planKey nullable.
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'tenant_subscription_planKey_fkey'
        AND table_name = 'tenant_subscription'
    ) THEN
      ALTER TABLE tenant_subscription DROP CONSTRAINT "tenant_subscription_planKey_fkey";
    END IF;

    -- 2b. Make compatibility columns nullable.
    --     planKey: was NOT NULL (FK); now loose compat varchar.
    ALTER TABLE tenant_subscription ALTER COLUMN "planKey" DROP NOT NULL;
    --     createdBy: spec says nullable.
    ALTER TABLE tenant_subscription ALTER COLUMN "createdBy" DROP NOT NULL;
    --     currentPeriodStart/End: not in spec; made nullable for clarity.
    ALTER TABLE tenant_subscription ALTER COLUMN "currentPeriodStart" DROP NOT NULL;
    ALTER TABLE tenant_subscription ALTER COLUMN "currentPeriodEnd"   DROP NOT NULL;

    -- 2c. Add plan_id (spec FK to plan.id); nullable for compat.
    ALTER TABLE tenant_subscription ADD COLUMN IF NOT EXISTS plan_id UUID;
    UPDATE tenant_subscription ts
    SET plan_id = p.id
    FROM plan p
    WHERE p.code = ts."planKey"
      AND ts.plan_id IS NULL;

    -- 2d. Add billing_cycle (spec rename of billingCycle).
    ALTER TABLE tenant_subscription ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20);
    UPDATE tenant_subscription
    SET billing_cycle = "billingCycle"
    WHERE billing_cycle IS NULL AND "billingCycle" IS NOT NULL;
    ALTER TABLE tenant_subscription ALTER COLUMN billing_cycle SET NOT NULL;

    -- 2e. Add seat_limit (spec rename of seatLimit).
    ALTER TABLE tenant_subscription ADD COLUMN IF NOT EXISTS seat_limit INTEGER;
    UPDATE tenant_subscription
    SET seat_limit = "seatLimit"
    WHERE seat_limit IS NULL AND "seatLimit" IS NOT NULL;
    ALTER TABLE tenant_subscription ALTER COLUMN seat_limit SET NOT NULL;

    -- 2f. Add starts_on date (spec field); nullable — tenant.service.ts does not write it yet.
    ALTER TABLE tenant_subscription ADD COLUMN IF NOT EXISTS starts_on DATE;

    -- 2g. Add ends_on date nullable (spec field; null = currently active).
    ALTER TABLE tenant_subscription ADD COLUMN IF NOT EXISTS ends_on DATE;

    -- 2h. Add external_billing_ref (spec field; nullable).
    ALTER TABLE tenant_subscription
      ADD COLUMN IF NOT EXISTS external_billing_ref VARCHAR(160);

    -- 2i. Add updated_by (spec field; nullable FK app_user.id).
    ALTER TABLE tenant_subscription ADD COLUMN IF NOT EXISTS updated_by UUID;

    -- 2j. Change status column DEFAULT from 'TRIALING' to 'ACTIVE' (per spec).
    ALTER TABLE tenant_subscription
      ALTER COLUMN status SET DEFAULT 'ACTIVE';

  ELSE
    -- Fresh install: create tenant_subscription with spec-aligned structure.
    -- Compatibility columns included so tenant.service.ts inserts succeed
    -- until that service is updated (outside Batch 3 scope).
    CREATE TABLE tenant_subscription (
      id                   UUID                NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
      "tenantId"           UUID                NOT NULL REFERENCES tenant(id),
      plan_id              UUID                REFERENCES plan(id),
      billing_cycle        VARCHAR(20)         NOT NULL,
      starts_on            DATE,
      ends_on              DATE,
      seat_limit           INTEGER             NOT NULL,
      status               subscription_status NOT NULL DEFAULT 'ACTIVE',
      external_billing_ref VARCHAR(160),
      "createdAt"          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
      "createdBy"          UUID,
      "updatedAt"          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
      updated_by           UUID,
      "rowVersion"         BIGINT              NOT NULL DEFAULT 1,
      -- Compatibility columns (not in spec; removed in cleanup batch)
      "planKey"            VARCHAR(80),
      "billingCycle"       VARCHAR(20),
      "seatLimit"          INTEGER,
      "trialEndsAt"        TIMESTAMPTZ,
      "currentPeriodStart" TIMESTAMPTZ,
      "currentPeriodEnd"   TIMESTAMPTZ,
      "cancelledAt"        TIMESTAMPTZ
    );
  END IF;
END $$;

-- ─── 3. FK: plan_id → plan.id ────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tenant_subscription_plan_id_fkey'
      AND table_name = 'tenant_subscription'
  ) THEN
    ALTER TABLE tenant_subscription
      ADD CONSTRAINT tenant_subscription_plan_id_fkey
      FOREIGN KEY (plan_id) REFERENCES plan(id);
  END IF;
END $$;

-- ─── 4. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS tenant_subscription_plan_id_idx
  ON tenant_subscription (plan_id);
