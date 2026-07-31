-- Workforce Cloud OS — PostgreSQL initialization
-- Run once on first container start.

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Tenant context function (used by RLS policies)
-- Every tenant-owned table policy: USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
-- Application sets: SET LOCAL app.tenant_id = '<uuid>' at transaction start (ADR-002)
