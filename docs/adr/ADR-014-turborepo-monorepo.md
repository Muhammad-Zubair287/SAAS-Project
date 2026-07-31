# ADR-014 — Turborepo as Monorepo Build Orchestration Tool

**Status:** Accepted
**Date:** 2025 (architectural decision)
**Source:** TSA Appendix B (monorepo structure defined; no build tool named)

---

## Context

TSA Appendix B specifies the monorepo structure (`apps/`, `packages/`), but does not name a build orchestration tool. The monorepo contains: NestJS backend, Next.js frontend, shared packages (ui, types, constants, localization, utils, contracts, domain-events, validation, observability, test-fixtures). A build tool is required to orchestrate builds, tests, and lint across workspace packages in the correct dependency order with caching.

## Decision

Use **Turborepo** as the monorepo build orchestration system with npm workspaces.

## Reason

- Turborepo is the leading build orchestrator for Next.js + Node.js monorepos (built by Vercel, the Next.js maintainer).
- Turborepo provides: remote caching (drastically reduces CI build times), parallel task execution, topological task ordering (build dependencies before dependents).
- Integrates natively with npm/yarn/pnpm workspaces — no lock-in to a proprietary package manager.
- `turbo.json` pipeline configuration is simple and readable.
- First-class support for Next.js App Router build caching.

## Workspace Structure

```
workforce-cloud-os/
├── apps/
│   ├── api/           (depends on packages/*)
│   └── web/           (depends on packages/ui, packages/types, ...)
├── packages/
│   ├── shared/
│   ├── ui/
│   ├── types/
│   ├── constants/
│   ├── localization/
│   ├── utils/
│   ├── contracts/
│   ├── domain-events/
│   ├── validation/
│   ├── observability/
│   └── test-fixtures/
```

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|----------------|
| Nx | Heavier configuration; more opinionated project structure; Turborepo is simpler for this use case |
| Lerna | Legacy project; superseded by Turborepo for build orchestration |
| Rush | Microsoft-ecosystem focused; less Next.js community adoption |
| Plain npm workspaces (no orchestrator) | No remote caching; no topological task ordering; slow CI |

## Consequences

- **Positive:** Remote cache in CI dramatically reduces build times after first run.
- **Positive:** `turbo run build test lint` runs all tasks in parallel with correct ordering automatically.
- **Negative:** Turborepo remote cache requires either Vercel account or self-hosted cache server — must configure before CI is set up.
- **Negative:** Turborepo versioning must be kept in sync across all developers — enforced via `engines` field in root `package.json`.
