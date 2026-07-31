-- =============================================================================
-- Baseline Infrastructure Migration
-- Creates all enums and tables that were assumed to exist from the initial
-- prisma db push before migration history started. Fully idempotent.
-- =============================================================================

-- ─── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outbox_event_status') THEN
    CREATE TYPE outbox_event_status AS ENUM ('PENDING', 'PUBLISHED', 'FAILED', 'DEAD_LETTERED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_status') THEN
    -- Base values only; M01 Batch 2 migration adds TRIAL, GRACE, CLOSED.
    CREATE TYPE tenant_status AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    -- Compatibility values only; M01 Batch 3 migration adds TRIAL, GRACE, SUSPENDED, ENDED.
    CREATE TYPE subscription_status AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_grant_status') THEN
    CREATE TYPE support_grant_status AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED', 'REJECTED');
  END IF;
END $$;

-- ─── Transactional Outbox ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS outbox_events (
  id           UUID                NOT NULL DEFAULT gen_random_uuid(),
  tenant_id    UUID,
  event_id     UUID                NOT NULL,
  event_type   TEXT                NOT NULL,
  payload      JSONB               NOT NULL,
  status       outbox_event_status NOT NULL DEFAULT 'PENDING',
  attempts     INT                 NOT NULL DEFAULT 0,
  last_error   TEXT,
  created_at   TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  CONSTRAINT outbox_events_pkey      PRIMARY KEY (id),
  CONSTRAINT outbox_events_event_id_key UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS outbox_events_status_created_at_idx ON outbox_events (status, created_at);
CREATE INDEX IF NOT EXISTS outbox_events_tenant_id_idx         ON outbox_events (tenant_id);

-- ─── Idempotency Keys ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id            UUID        NOT NULL DEFAULT gen_random_uuid(),
  tenant_id     UUID,
  key           TEXT        NOT NULL,
  request_hash  TEXT        NOT NULL,
  response_body JSONB,
  status_code   INT,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT idempotency_keys_pkey    PRIMARY KEY (id),
  CONSTRAINT idempotency_keys_key_key UNIQUE (key)
);

CREATE INDEX IF NOT EXISTS idempotency_keys_expires_at_idx ON idempotency_keys (expires_at);

-- ─── Audit Events (append-only) ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_event (
  id             UUID         NOT NULL DEFAULT gen_random_uuid(),
  tenant_id      UUID,
  actor_id       UUID         NOT NULL,
  actor_type     VARCHAR(40)  NOT NULL,
  actor_email    VARCHAR(255),
  module         VARCHAR(80)  NOT NULL,
  action         VARCHAR(120) NOT NULL,
  resource_type  VARCHAR(80)  NOT NULL,
  resource_id    VARCHAR(200),
  before         JSONB,
  after          JSONB,
  metadata       JSONB,
  ip_address     VARCHAR(45),
  user_agent     VARCHAR(500),
  correlation_id UUID         NOT NULL,
  severity       VARCHAR(20)  NOT NULL,
  occurred_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT audit_event_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS audit_event_tenant_id_occurred_at_idx ON audit_event (tenant_id, occurred_at);
CREATE INDEX IF NOT EXISTS audit_event_actor_id_idx              ON audit_event (actor_id);
CREATE INDEX IF NOT EXISTS audit_event_module_action_idx         ON audit_event (module, action);
CREATE INDEX IF NOT EXISTS audit_event_resource_type_id_idx      ON audit_event (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS audit_event_occurred_at_idx           ON audit_event (occurred_at);
