# Workforce Cloud OS

Multi-tenant SaaS Workforce Management Platform — unifying Core HR, Attendance, Shifts, Leave, Payroll, ESS/MSS, and Compliance into one modular product.

## Repository Structure

```
workforce-cloud-os/
├── apps/
│   ├── api/          NestJS backend (modular monolith, TypeScript)
│   └── web/          Next.js frontend (App Router, TypeScript)
├── packages/
│   ├── shared/       Shared utilities
│   ├── ui/           React component library (Radix-based)
│   ├── types/        Shared TypeScript types & Zod schemas
│   ├── constants/    Shared constants and enums
│   ├── localization/ Translation catalogues (en, ur)
│   └── utils/        Pure utility functions
├── infrastructure/   Docker, Kubernetes, Nginx, monitoring, scripts
├── docs/             ADRs, API specs, runbooks, architecture diagrams
└── .github/          CI/CD workflows, PR/issue templates
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS + TypeScript + Prisma |
| Frontend | Next.js 14+ (App Router) + React + Tailwind CSS |
| Database | PostgreSQL (RLS-enforced multi-tenancy) + Redis |
| Queue | BullMQ |
| Events | Transactional Outbox → Kafka / SNS+SQS |
| Auth | JWT / OAuth 2.0 / OIDC + MFA |
| Infra | Kubernetes (EKS reference) + Terraform + GitHub Actions |

## Modules

M01 Platform & Tenant Management · M02 Authentication & IAM · M03 Organisation Structure ·
M04 Employee Core HR · M05 Onboarding & Documents · M06 Attendance · M07 Shifts & Rosters ·
M08 Leave · M09 Workflow / Approval Engine · M10 Payroll · M11 ESS · M12 MSS ·
M13 Notifications · M14 Reports & Dashboards · M15 Data Migration & Integrations ·
M16 Subscription & Entitlements · M17 Audit, Security & Compliance

## Key Principles

- Multi-tenancy enforced at JWT → RBAC → `SET LOCAL` → PostgreSQL RLS → storage prefix (5 layers)
- Money always `numeric(19,4)` — no floats
- Payroll runs are immutable and versioned; approval requires MFA + SoD
- All events via transactional outbox — no direct broker writes from request handlers
- Expand-contract migrations only — zero destructive schema changes

## Engineering Reference

See **CLAUDE.md** for the complete engineering reference: business rules, coding standards, naming conventions, architecture decisions, security rules, and development workflow.
