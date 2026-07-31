# ADR-002 — Shared Database + Shared Schema + PostgreSQL RLS for Tenant Isolation

**Status:** Accepted
**Date:** 2025 (recorded per TSA)
**Source:** TSA §6 ADR-002, TSA §13, TSA §55 AC-3–5

---

## Context

Workforce Cloud OS is a multi-tenant SaaS platform. Tenant data must be strictly isolated — one tenant must never see, modify, or be affected by another tenant's data. The architecture must support thousands of tenants without per-tenant operational overhead.

## Decision

Use a single shared PostgreSQL database with a shared schema. Every tenant-owned table includes a `tenant_id uuid NOT NULL` column. Row-Level Security (RLS) is enabled and forced on every tenant-owned table. The application sets `SET LOCAL app.tenant_id = '<uuid>'` at the start of every database transaction.

The full defense-in-depth stack for tenant isolation:
1. JWT `tenant_id` claim verification (Auth Guard)
2. Application-layer RBAC + scope check (RBAC Guard)
3. `SET LOCAL app.tenant_id = '<uuid>'` (NestJS middleware, transaction start)
4. PostgreSQL RLS policy: `USING (tenant_id = current_setting('app.tenant_id', true)::uuid)`
5. Object storage tenant-prefixed paths (`s3://<bucket>/<tenant_id>/...`)
6. Automated tenant-isolation integration tests (CI mandatory, TSA Appendix B)

RLS template:
```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <table> FORCE ROW LEVEL SECURITY;
CREATE POLICY <table>_tenant_isolation ON <table>
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

## Reason

- Operational simplicity: one database to manage, back up, and migrate.
- Cost efficiency at MVP scale: per-tenant databases would multiply RDS costs.
- RLS provides a database-enforced safety net independent of application code.
- `FORCE ROW LEVEL SECURITY` ensures even superuser connections are bound by the policy.
- TSA §55 Acceptance Criteria explicitly require: "RLS enabled and tested for all tenant-owned tables."

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|----------------|
| Database-per-tenant | Prohibitive cost and operational complexity at scale |
| Schema-per-tenant | Schema proliferation creates migration and connection pool complexity |
| Application-only isolation (no RLS) | Single layer of defence — a bug in the application layer can expose cross-tenant data |

## Consequences

- **Positive:** Single database, simple migrations, operational efficiency.
- **Positive:** RLS is a database-enforced backstop independent of application code bugs.
- **Negative:** All queries must include `tenant_id` filter; missing `SET LOCAL` causes all queries to return empty (which is safe — errors loud rather than silently leaking data).
- **Negative:** Shared database means one noisy tenant can impact others — mitigated by connection pooling and query timeouts.

## Non-Negotiable Rules

- Every new tenant-owned table MUST add RLS before merging to main.
- Every new tenant-owned table MUST be covered by a tenant isolation integration test.
- NEVER query a tenant-owned table without `SET LOCAL app.tenant_id` being set in the transaction.
