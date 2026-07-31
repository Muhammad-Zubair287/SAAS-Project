-- M02 Batch 5: Password Reset Token table
-- Stores one-time tokens for password reset flows.
-- tokenHash is SHA-256(token) hex — deterministic, indexed for lookup.

CREATE TABLE IF NOT EXISTS password_reset_token (
  id          UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  token_hash  VARCHAR(64) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT password_reset_token_pkey PRIMARY KEY (id),
  CONSTRAINT password_reset_token_user_fk
    FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'password_reset_token' AND indexname = 'password_reset_token_hash_idx'
  ) THEN
    CREATE INDEX password_reset_token_hash_idx ON password_reset_token (token_hash);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'password_reset_token' AND indexname = 'password_reset_token_user_id_idx'
  ) THEN
    CREATE INDEX password_reset_token_user_id_idx ON password_reset_token (user_id);
  END IF;
END $$;
