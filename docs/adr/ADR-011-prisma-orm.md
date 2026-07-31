# ADR-011 — Prisma as the TypeScript ORM

**Status:** Accepted
**Date:** 2025 (architectural decision)
**Source:** TSA §11 (repository pattern requirement; no specific ORM named)

---

## Context

The backend (NestJS) requires a type-safe data access layer for PostgreSQL. TSA §11 specifies the repository pattern and tenant-safe persistence but does not name a specific ORM. An ORM must be selected before Phase 2 implementation.

## Decision

Use **Prisma** as the TypeScript ORM for all database access in the NestJS backend.

Prisma is used for:
- Schema definition (`schema.prisma`)
- Migration generation (raw SQL migrations reviewed and committed)
- Type-safe query client in repositories

**Note:** Prisma Client generates TypeScript types from the schema — no manual entity interface duplication needed.

## Reason

- First-class TypeScript support with fully inferred query result types.
- Excellent PostgreSQL support including `jsonb`, `uuid`, `timestamptz`, `numeric`.
- Prisma Migrate produces SQL migration files that can be reviewed, edited, and version-controlled.
- Native NestJS integration via `@prisma/client` and a shared PrismaService.
- Active community; largest TypeScript ORM by adoption in 2024–2025.

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|----------------|
| TypeORM | Decorator-heavy; TypeScript inference is weaker; decorator-based approach has known issues with complex types |
| Drizzle ORM | Strong TypeScript inference but smaller community; fewer enterprise references at time of decision |
| Raw `pg` client | No type safety; requires manual typing of every query result |
| MikroORM | Good alternative; Prisma chosen for wider community adoption and NestJS integration quality |

## Consequences

- **Positive:** Fully typed database access — no `any` on query results.
- **Positive:** Migration files are plain SQL — can be reviewed, manually edited, and audited.
- **Positive:** Prisma Studio provides visual database browser for development.
- **Negative:** Prisma Client does not support all PostgreSQL features natively (e.g., advisory locks, complex CTEs) — use `$queryRaw` for these.
- **Negative:** Prisma schema language is proprietary — if Prisma is replaced, schema must be rewritten.

## RLS Integration Note

Prisma does not natively support `SET LOCAL` per-transaction. The pattern is:
```typescript
await prisma.$transaction(async (tx) => {
  await tx.$executeRaw`SET LOCAL app.tenant_id = ${tenantId}`;
  return tx.employee.findMany({ ... });
});
```
This is wrapped in a `TenantAwarePrismaService` that enforces `SET LOCAL` on every transaction automatically.
