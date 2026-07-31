# ADR-010 — Expand-Contract Database Migration Pattern

**Status:** Accepted
**Date:** 2025 (recorded per TSA)
**Source:** TSA §6 ADR-010, TSA §40

---

## Context

The platform deploys with zero-downtime rolling updates on Kubernetes. Multiple API pod versions may run simultaneously during a rolling deploy. A destructive database migration (column rename, column drop, constraint change) during a rolling deploy breaks old pods that still reference the old schema.

## Decision

All database migrations use the Expand-Contract pattern:

**Expand phase (safe to deploy with old code running):**
1. Add new columns/tables (nullable or with defaults).
2. Write new code to write to both old and new columns simultaneously.
3. Backfill existing rows.

**Contract phase (after all old code is retired):**
1. Drop old columns/tables.
2. Remove dual-write code.
3. Add NOT NULL constraints (after verifying zero nulls).

Rules:
- Never rename a column in a single migration — add new, migrate data, drop old.
- Never add a NOT NULL column without a default or backfill in the same migration.
- Never drop a column that is still referenced by deployed application code.
- All migrations are SQL files with `-- up` and `-- down` sections.
- Migrations are idempotent (safe to run twice).
- Never run `ALTER TABLE ... LOCK` modes that block reads — use `pg_repack` or low-lock alternatives.

## Reason

- TSA ADR-010: "Database migrations use expand-contract."
- Multi-pod rolling deploys require old and new application code to coexist with the same schema simultaneously.
- PostgreSQL DDL locks can block production traffic if applied naively on large tables.

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|----------------|
| Downtime migrations | Violates zero-downtime deployment requirement |
| ORM auto-migration | Lacks fine-grained control over lock modes and backfill strategies |
| Schema-per-version | Extreme complexity; rejected in ADR-002 |

## Consequences

- **Positive:** Zero-downtime schema changes on large tables.
- **Positive:** Old code continues to work during the deploy window.
- **Negative:** Some changes require 2–3 deploy cycles to complete (add → backfill → drop).
- **Negative:** Requires discipline — developers must plan migrations in phases, not just write `ALTER TABLE`.
