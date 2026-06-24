-- FinancesRecord — Sessions table for cookie-based auth (PR 3).
-- Run AFTER 01_schema.sql and 02_seed.sql.
-- Idempotent: safe to re-apply.

CREATE TABLE IF NOT EXISTS sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);

-- Index for "find valid sessions for a user" cleanup and revocation flows.
CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions(user_id);
-- Index for the common lookup path: "is this token still valid?"
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
-- Index for TTL sweeps (purge expired sessions).
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
