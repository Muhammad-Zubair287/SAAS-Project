# Workforce Cloud OS — Permanent Engineering Reference

> **Source of truth:** The nine specification PDFs in the project root always override this file.
> This file is a structured synthesis for fast day-to-day reference.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Modules](#3-modules)
4. [Technology Stack](#4-technology-stack)
5. [Architecture](#5-architecture)
6. [Database](#6-database)
7. [API Contracts](#7-api-contracts)
8. [UX & Design System](#8-ux--design-system)
9. [Business Rules](#9-business-rules)
10. [Security](#10-security)
11. [Localization](#11-localization)
12. [Non-Negotiable Constraints](#12-non-negotiable-constraints)
13. [Coding Standards](#13-coding-standards)
14. [Folder Structure Philosophy](#14-folder-structure-philosophy)
15. [Development Rules](#15-development-rules)

---

## 1. Product Overview

**Product Name:** Workforce Cloud OS
**Category:** Multi-tenant SaaS Workforce Management Platform

### Vision
A single modular platform that unifies Core HR, Attendance, Shifts, Leave, Workflow/Approvals, Payroll, ESS/MSS, Notifications, Reports, Integrations, Subscriptions and Audit/Compliance — removing the fragmented tool sprawl that plagues mid-market and enterprise employers.

### 4C Strategy
| Pillar | Meaning |
|--------|---------|
| Consolidate | Replace 5–8 disparate tools with one platform |
| Comply | Built-in local labour/tax compliance (Pakistan first, then GCC/UK/EU) |
| Connect | Open API + event/webhook ecosystem |
| Compound | Analytics, reporting, and future AI copilot layer |

### Target Market
- **Primary:** Pakistan formal-sector employers (TAM ~33.6M employees)
- **Expansion:** GCC, UK, Europe
- **Segments:** SMB 50–200 employees, Mid-market 200–2 000, Enterprise 2 000+

### Pricing Tiers
| Tier | Pakistan (PKR/seat/mo) | International (USD/seat/mo) |
|------|------------------------|------------------------------|
| Essential | 250 | $3 |
| Growth | 450 | $6 |
| Enterprise | 700+ | $10–15 |

### MVP Scope
17 modules (M01–M17), English + Urdu, PKR-first, Pakistan statutory rules, full attendance → payroll pipeline.

---

## 2. User Roles & Permissions

### Platform-Level Roles (Workforce Cloud OS staff)
| Role | Capabilities |
|------|-------------|
| Platform Super Admin | Tenant provisioning, plan control, global config, cross-tenant support, key rotation |
| Platform Support Engineer | Scoped read, JIT impersonation, subscription changes, incident handling |
| Platform Auditor | Read-only cross-tenant for compliance |

### Tenant-Level Roles
| Role | Capabilities |
|------|-------------|
| Tenant Owner / Admin | Legal entities, branches, departments, roles, policies, billing, feature flags |
| HR Manager / HR Ops | Employee lifecycle, contracts, documents, onboarding, leave policies, attendance policies |
| Payroll Manager / Payroll Officer | Payroll structures, runs, approvals (MFA-gated), exports, statutory filings |
| Attendance / Time Officer | Device management, exceptions, corrections, period locks |
| Line Manager / Team Lead | Approvals, team schedules, exceptions, team dashboards |
| Employee (ESS) | Profile, attendance actions, leave requests, payslips, documents |
| Contractor / External Worker | Scoped ESS with limited data access |
| Tenant Auditor | Read-only + audit exports within tenant |
| Integrator / Developer | API tokens, webhook configuration |

### RBAC + Scope Model
Permission = **action** + **resource** + **scope**

Scopes: `tenant | legal_entity | branch | department | manager_hierarchy | self | record | support`

### MFA-Mandatory Actions
- Payroll Approval
- Break-Glass access
- Data Export of Restricted/Secret data
- Platform impersonation

### Segregation of Duties (SoD)
- Payroll run initiator ≠ approver
- On Enterprise: approver cannot lock without secondary check

---

## 3. Modules

| ID | Module | Purpose |
|----|--------|---------|
| M01 | Platform & Tenant Management | Tenant lifecycle, plans, feature flags, regions, provisioning |
| M02 | Authentication, Identity & Access | Password/OTP/SSO, MFA, sessions, RBAC, delegations, break-glass |
| M03 | Organisation Structure | Legal entities, branches, departments, cost centres, positions, effective-dated hierarchies |
| M04 | Employee Core HR | Employees, employment contracts, compensation, personal/bank/tax records, transfers |
| M05 | Onboarding & Documents | Onboarding journeys, checklists, document requests, e-sign hooks, expiry alerts |
| M06 | Attendance | Device/mobile/web ingestion, geofencing, IP/subnet rules, exceptions, corrections, period locks |
| M07 | Shifts & Rosters | Shift templates, rotation patterns, roster publishing, swaps, coverage |
| M08 | Leave | Policy accruals, calendars, balances, requests, cancellations, encashment |
| M09 | Workflow / Approval Engine | Reusable engine for approvals, delegations, escalations, SoD, MFA-gated actions |
| M10 | Payroll | Calendars, structures, formula packs, immutable snapshots, versioned runs, variance analysis, payslips, bank/tax exports |
| M11 | Employee Self-Service (ESS) | Profile, attendance, leave, payslips, documents, requests |
| M12 | Manager Self-Service (MSS) | Team dashboards, approvals, schedules, coverage, exceptions |
| M13 | Notifications | In-app, email, SMS, push, WhatsApp (roadmap); templated + localized |
| M14 | Reports / Dashboards / Exports | Canned + custom reports, scheduled exports, dashboards per role |
| M15 | Data Migration & Integrations | CSV templates, staging + validation, connectors (HRIS/ERP/bank/tax), API + webhook consumers |
| M16 | Subscription & Feature Entitlements | Plans, seats, usage metering, feature flags, invoicing hooks |
| M17 | Audit, Security, Privacy & Compliance | Audit trail, DSR handling, retention, legal holds, encryption, key rotation |

---

## 4. Technology Stack

### Backend
| Concern | Technology |
|---------|-----------|
| Runtime | Node.js (LTS) |
| Framework | NestJS (TypeScript) |
| Architecture | Modular monolith with clean domain boundaries |
| Job workers | BullMQ (backed by Redis) |
| ORM | Prisma |
| Validation | class-validator + class-transformer |
| API docs | OpenAPI 3.1 (swagger-ui-express) |

### Frontend
| Concern | Technology |
|---------|-----------|
| Framework | Next.js (App Router, TypeScript) |
| UI library | React 18+ |
| Component library | Internal (packages/ui) built on Radix UI primitives |
| Styling | Tailwind CSS + CSS variables (design tokens) |
| State management | Zustand (client state) + TanStack Query (server state) |
| Forms | React Hook Form + Zod |
| i18n | next-intl (ICU MessageFormat) |
| Charts | Recharts / Nivo |

### Mobile
| Concern | Technology |
|---------|-----------|
| Framework | React Native (iOS + Android) |
| Navigation | React Navigation |
| Offline | WatermelonDB or MMKV for local attendance cache |

### Data
| Concern | Technology |
|---------|-----------|
| Primary DB | PostgreSQL (shared DB, shared schema, RLS) |
| Caching | Redis (ElastiCache on AWS) |
| Queue | Redis + BullMQ |
| Search / Reporting | OpenSearch (optional, Enterprise tier) |
| Object storage | S3-compatible (AWS S3 reference) |
| Secrets | AWS Secrets Manager |

### Events & Messaging
| Concern | Technology |
|---------|-----------|
| Outbox | Transactional outbox in PostgreSQL |
| Broker | Kafka (Enterprise); SNS/SQS (AWS standard); Azure Service Bus; GCP Pub/Sub |
| Event schema | AsyncAPI 3.0 |
| Webhook signing | HMAC-SHA256 |

### Infrastructure
| Concern | Technology |
|---------|-----------|
| Containers | Docker |
| Orchestration | Kubernetes (EKS reference, AKS/GKE mapped) |
| IaC | Terraform |
| CI/CD | GitHub Actions |
| Observability | OpenTelemetry → Prometheus/Grafana + Loki/Elastic |
| CDN / Edge | CloudFront + WAF |
| Auth | OAuth 2.0 / OIDC / JWT; enterprise SSO (Microsoft Entra ID, Google Workspace) |
| MFA | TOTP, SMS/email OTP; WebAuthn (roadmap) |

---

## 5. Architecture

### Pattern
**Modular Monolith** deployed on Kubernetes — clean domain boundaries enforced at code level, not service boundaries. Workers (payroll, exports, ingestion) run as separate Kubernetes Deployments.

### Key Architecture Decision Records (ADRs)
| ADR | Decision |
|-----|---------|
| ADR-001 | Modular monolith over microservices for MVP; bounded contexts enforced via module boundaries |
| ADR-002 | Defense-in-depth tenant isolation: JWT claim → app RBAC → SET LOCAL → RLS → storage prefix → automated tests |
| ADR-004 | Transactional outbox for all published events; no direct broker writes from request handlers |
| ADR-009 | Multi-cloud portable design; AWS is reference; Azure and GCP mappings maintained |

### Multi-Tenancy Defense-in-Depth
```
1. JWT contains tenant_id claim (verified on every request)
2. App-layer RBAC + scope check
3. SET LOCAL app.tenant_id = '<uuid>' at transaction start
4. PostgreSQL Row-Level Security enforces tenant_id match
5. Object storage uses tenant-prefixed paths
6. Automated tenant-isolation integration tests
```

### Attendance Pipeline
```
Ingest → raw_event (append-only) → map (employee/device)
→ normalise (timezone/policy) → calculate (shift match, OT, breaks)
→ exception detect → correction flow → period lock
→ events: AttendanceEventIngested, AttendanceCalculated,
          AttendanceExceptionRaised, AttendancePeriodLocked
```

### Payroll Pipeline
```
Calendar → Structure → Immutable Snapshot (people, contracts, comp,
attendance, leave, formulas) → Engine Run (versioned formula pack)
→ Validation → Variance Analysis vs prior → Review
→ MFA-gated Approval (SoD enforced) → Lock
→ Payslips → Bank/Tax Exports (statutory)

Every run is versioned, reproducible, and immutable once approved.
```

### SLO Targets
| Metric | MVP | Enterprise |
|--------|-----|-----------|
| Availability | 99.9% | 99.9% |
| API p95 latency | 800ms | 800ms |
| Attendance ack | 2s | 2s |
| RPO | 15 min | 5 min |
| RTO | 4 hr | 1 hr |

### Event Canonical Envelope
```json
{
  "specVersion": "1.0",
  "eventId": "<UUIDv7>",
  "eventType": "<Aggregate><Action>.v<N>",
  "source": "<service>",
  "occurredAt": "<ISO-8601 UTC>",
  "tenantId": "<uuid>",
  "correlationId": "<uuid>",
  "causationId": "<uuid>",
  "actor": { "id": "<uuid>", "type": "user|system" },
  "subject": { "id": "<uuid>", "type": "<resource>" },
  "partitionKey": "<tenantId>",
  "dataClassification": "public|internal|confidential|restricted|secret",
  "data": { ... }
}
```

Event naming: `<Aggregate><Action>.v<version>` e.g. `EmployeeActivated.v1`

---

## 6. Database

### Core Conventions (MUST follow)
```
- snake_case singular table names
- UUID primary keys: gen_random_uuid()
- tenant_id uuid NOT NULL on EVERY tenant-owned table
- timestamptz stored as UTC (never local time)
- numeric(19,4) for ALL money — NO floats in financial data
- jsonb columns: always validated by check constraint or Postgres domain
- row_version bigint for optimistic concurrency
- Standard audit columns: created_at, created_by, updated_at, updated_by
```

### Row-Level Security (applied to EVERY tenant-owned table)
```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <table> FORCE ROW LEVEL SECURITY;
CREATE POLICY <table>_tenant_isolation ON <table>
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
```
Transaction start: `SET LOCAL app.tenant_id = '<uuid>'`

### Effective-Dating Pattern
```sql
EXCLUDE USING gist (
  tenant_id WITH =,
  employee_id WITH =,
  daterange(effective_from, effective_to, '[)') WITH &&
)
```

### Indexing Standards
- All indexes lead with `tenant_id`
- Unique constraints always include `tenant_id`
- Partial indexes for status filters
- BRIN indexes for time-series tables (attendance_event, outbox_event)
- Partition `attendance_event` and `outbox_event` by month

### Domain Table Groups (~85 tables)
| Domain | Table Count |
|--------|------------|
| Platform / Tenant | 10 |
| Identity & Access | 11 |
| Organisation & People | 16 |
| Onboarding & Documents | 10 |
| Attendance & Shifts | 11 |
| Leave | 9 |
| Workflow | 8 |
| Payroll | 16 |
| Notifications | 4 |
| Integrations | 8 |
| Reporting & Audit | 8 |

### Data Classification Tiers
| Level | Examples | Controls |
|-------|---------|---------|
| Public | Product names | None beyond TLS |
| Internal | Org charts | Auth required |
| Confidential | Employee names, addresses | RBAC + audit |
| Restricted | PII, compensation, bank data | Encryption + MFA + audit |
| Secret | Payroll snapshots, audit records | Envelope encryption + strict audit |

### Retention Baselines
| Data type | Minimum retention |
|-----------|------------------|
| Payroll records | 7+ years |
| Attendance | 3–7 years |
| Sessions | 90–365 days |
| Audit trail | 2–10 years |
| DSR / legal hold | Overrides any baseline |

---

## 7. API Contracts

### Base
- **REST at `/api/v1`** — OpenAPI 3.1 is source of truth
- GraphQL optional façade (Enterprise, read-heavy views only)
- All contracts versioned; deprecation policy maintains dual-support windows

### Standard Headers
```
Authorization: Bearer <JWT>
X-Tenant-Id: <uuid>
Idempotency-Key: <uuid>          # Required on all POST/PUT mutations
X-Correlation-ID: <uuid>
ETag / If-Match                  # Optimistic concurrency (row_version)
X-WCOS-Signature / X-WCOS-Timestamp  # Webhooks only
```

### Reusable Schemas
```
ResourceMetadata   - id, createdAt, updatedAt, version
Money              - { amount: numeric(19,4), currency: ISO-4217 }
DateRange          - { from: date, to: date }
PageInfo           - cursor-based pagination
ProblemDetails     - RFC 7807 error format
```

### Error Codes
```
AUTHENTICATION_REQUIRED    PERMISSION_DENIED          VALIDATION_FAILED
CONFLICT                   VERSION_CONFLICT           IDEMPOTENCY_KEY_REUSED
RATE_LIMITED               SEGREGATION_OF_DUTIES      MFA_REQUIRED
TENANT_SUSPENDED           PAYROLL_PERIOD_LOCKED
```

### High-Risk API Contracts (19 defined)
```
API-TEN-001  Create Tenant
API-IAM-002  Invite User
API-PEO-003  Create Employee
API-PEO-004  Schedule Transfer
API-DOC-005  Upload Session
API-ATT-006  Ingest Attendance Event
API-ATT-007  Submit Correction
API-ATT-008  Lock Attendance Period
API-LVE-009  Submit Leave
API-WFL-010  Act on Approval
+ 9 Payroll APIs (create run, snapshot, calculate, approve-MFA, lock,
                  generate payslips, export bank, export tax, variance)
```

### Webhook Delivery
```
Signing: HMAC-SHA256
signed_payload = X-WCOS-Timestamp + "." + raw_body
Header: X-WCOS-Signature: v1=<hex>
Timestamp tolerance: ±5 minutes
Retry schedule: 1m → 5m → 30m → 2h → 8h → 24h (with jitter)
Dead-letter after final retry; delivery log retained.
```

### Events (AsyncAPI 3.0 — 101 event types)
Naming pattern: `<Aggregate><Action>.v<version>`
Examples: `EmployeeActivated.v1`, `AttendanceCalculated.v1`,
          `LeaveRequestApproved.v1`, `PayrollApproved.v1`, `PayrollExportReady.v1`

---

## 8. UX & Design System

### Color Tokens
```
brand.navy.950   #0B1F3A    (primary text / nav background)
brand.navy.800   #16365F
brand.blue.600   #2563EB    (primary CTA)
brand.blue.500   #3B82F6
brand.teal.500   #14B8A6    (accent)
surface.canvas   #F4F7FB    (page background)
semantic.success #16A34A
semantic.warning #D97706
semantic.danger  #DC2626
semantic.info    #0284C7
semantic.ai      #7C3AED
```

### Typography
```
Font stack: Inter (Latin / LTR), Noto Sans Arabic (Urdu / RTL)
Scale: display.lg 40/48 → display.md 32/40 → h1 24/32 →
       h2 20/28 → h3 16/24 → body.lg 16/24 → body.md 14/20 →
       body.sm 13/18 → caption 11/16
```

### Spacing & Radii
```
Spacing: space.1 4px → space.2 8px → space.3 12px → space.4 16px
         space.6 24px → space.8 32px → space.10 40px → space.12 48px
Radii:   sm 6px / md 9px / lg 12px / xl 16px
Elevation: 0–3 (shadow scale)
```

### Breakpoints
```
Mobile     390×844
Tablet     768–1024px
Desktop    1280×800
Desktop XL 1440×900
```

### Screen Inventory (prefix reference)
```
SCR-AUTH   SCR-PLT    SCR-TEN    SCR-ORG    SCR-EMP
SCR-ONB    SCR-DOC    SCR-ATT    SCR-SHF    SCR-LVE
SCR-WFL    SCR-PAY    SCR-ESS    SCR-MGR    SCR-NTF
SCR-RPT    SCR-INT    SCR-SUB    SCR-AUD    SCR-SET
```

### Figma Architecture
```
00 Cover → 10 Foundations → 20 Components → 30 Patterns
→ 40 Web Screens (by module) → 50 Mobile Screens
→ 60 Prototypes → 70 Handoff → 80 Research → 90 Archive
```
Frame naming: `[Device]-[ScreenID]-[State]-[Version]`

### Accessibility
- WCAG 2.1 AA target
- Visible focus states on all interactive elements
- 44px minimum touch targets (mobile)
- Keyboard-first navigation throughout
- ARIA live regions for approvals, attendance state changes

### Route Groups (Next.js App Router)
```
(platform)  — Platform Super Admin views
(tenant)    — HR/Payroll/Manager admin views
(employee)  — ESS views
```

---

## 9. Business Rules

### Tenancy & Subscription
- Tenant must have ≥1 active legal entity and ≥1 branch before payroll/attendance can be enabled.
- Suspended tenants: writes blocked, reads + exports allowed during grace period.
- Feature availability strictly gated by plan entitlements (checked via feature flag service).

### Identity & Access
- MFA mandatory for: Payroll Approval, Break-Glass, Restricted data export, Impersonation.
- SoD: run initiator ≠ approver; Enterprise adds secondary lock check.
- Session lifetimes: idle 30m, absolute 12h; refresh tokens rotated on use.
- Impersonation sessions capped at 60 minutes and produce full audit records.

### Employees & Organisation
- Employee number unique per `(tenant_id, legal_entity_id)`.
- Transfers are effective-dated; overlapping assignments blocked by exclusion constraint.
- Contract changes create new immutable versions; previous versions never altered.

### Attendance
- Raw events are append-only and immutable — corrections create new records referencing originals.
- Geofence + IP/subnet checks enforced per policy; failures create exceptions.
- Period lock blocks ALL edits; unlock requires elevated role + mandatory audit reason.

### Leave
- Accruals computed per policy; balances reconciled nightly.
- Requests validated against balance, blackout dates, and shift coverage.
- Cancellation before start: balance automatically restored.
- Cancellation after start: requires HR review workflow.

### Workflow Engine
- Single reusable engine shared by: leave, attendance corrections, payroll, transfers, document requests.
- Delegations are time-boxed; SLA breach triggers escalation; every step is audited.

### Payroll
- Each run has an immutable input snapshot; formula pack version is pinned at creation.
- Money = `numeric(19,4)` always; rounding rules defined per country.
- MFA + SoD required for approval; approved runs are locked and version-stamped.
- Statutory exports (bank file, EOBI/PESSI, income tax) generated from locked runs only.
- Re-runs create new versions; never overwrite approved runs.

### Notifications
- Templated, localized (en, ur); channel preference per user.
- Duplicate suppression within configurable time window.

### Audit & Privacy
- All Restricted/Secret data actions produce audit records with actor, tenant, scope, correlationId.
- DSR workflows support access, export, and erasure.
- Legal holds override retention schedules.

---

## 10. Security

### Identity & Session
- OAuth 2.0 / OIDC / JWT; enterprise SSO via Microsoft Entra ID and Google Workspace.
- Configurable password policy; TOTP + SMS/email OTP; WebAuthn on roadmap.
- Short-lived access tokens; rotating refresh tokens.

### Authorization
- RBAC + scope model; permissions checked on every request at middleware level.
- Just-in-time impersonation with mandatory reason, time cap (60m), and full audit.

### Tenant Isolation (5 layers)
1. JWT `tenant_id` claim validation
2. App-layer RBAC + scope check
3. `SET LOCAL app.tenant_id` at transaction start
4. PostgreSQL RLS policies
5. Object storage tenant-prefixed paths + automated isolation tests

### Cryptography
- TLS 1.2+ in transit; AES-256 at rest.
- KMS-managed keys with rotation schedule.
- Envelope encryption for document blobs and payroll exports.
- Separate encryption keys per data classification tier.

### Secrets Management
- All secrets via AWS Secrets Manager (or cloud-equivalent).
- No secrets in source code, Docker images, or CI environment variables without masking.
- Short-lived credentials in CI/CD pipelines.

### Security Operations
- WAF at edge; per-tenant + per-token rate limiting.
- Anomaly detection on login and impersonation.
- Secure SDLC: SAST, DAST, dependency scanning, container scanning, annual pen tests.
- Alignment path to SOC 2 Type II and ISO 27001.

---

## 11. Localization

### MVP Languages
| Code | Language | Direction |
|------|---------|---------|
| en | English | LTR |
| ur | Urdu | RTL |

### Fonts
- LTR: Inter
- RTL: Noto Sans Arabic

### i18n Pipeline
- Message catalogues per module/screen
- ICU MessageFormat for plurals and interpolation
- Translation keys: `module.screen.key`
- Pseudo-locale in QA builds

### Formats
- Dates: locale-aware display; all persistence in UTC timestamptz
- Numbers: locale-aware grouping/decimals
- Currency: PKR primary for Pakistan tenants; multi-currency comp records supported; single functional currency per tenant at MVP

### Timezone Handling
- All persistence in UTC
- Display in user or branch timezone
- Attendance calculations use branch/shift timezone rules (DST-safe)

### Statutory (Pakistan first)
- Income tax slabs, EOBI/PESSI, provident fund, gratuity, minimum wage
- Expandable via country packs and versioned formula packs for GCC/UK/EU

### RTL Considerations
- Mirrored layouts, iconography, chart axis direction
- Form flow direction reversed
- All components tested in both LTR and RTL

---

## 12. Non-Negotiable Constraints

```
✗ NEVER: floating-point arithmetic for money — always numeric(19,4)
✗ NEVER: query tenant-owned tables without SET LOCAL app.tenant_id
✗ NEVER: write events directly to broker from request handlers — use outbox
✗ NEVER: modify an approved payroll run — create a new version
✗ NEVER: overwrite attendance raw events — corrections reference originals
✗ NEVER: destructive schema migrations — use expand-contract only
✗ NEVER: skip RLS on any new tenant-owned table
✗ NEVER: commit secrets to source control

✓ ALWAYS: include Idempotency-Key on all POST/PUT mutations
✓ ALWAYS: use ETag/If-Match + row_version for optimistic concurrency
✓ ALWAYS: propagate correlationId and causationId through all layers
✓ ALWAYS: use UUIDv7 for new event IDs
✓ ALWAYS: lead composite indexes with tenant_id
✓ ALWAYS: test both LTR and RTL for any UI component
✓ ALWAYS: validate feature flag entitlement before serving any plan-gated feature
```

---

## 13. Coding Standards

### General
- TypeScript strict mode enabled (`"strict": true`)
- No `any` types — use `unknown` + type narrowing or proper interfaces
- Zod for all external input validation (API request bodies, env vars, events)
- class-validator + class-transformer for NestJS DTOs

### Naming Conventions
| Context | Convention | Example |
|---------|-----------|---------|
| Files (TS) | kebab-case | `employee.service.ts` |
| Classes | PascalCase | `EmployeeService` |
| Interfaces | PascalCase + I prefix (optional) | `IEmployeeRepository` |
| Variables / functions | camelCase | `getEmployeeById` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| Database tables | snake_case singular | `employee`, `attendance_event` |
| Database columns | snake_case | `tenant_id`, `created_at` |
| API routes | kebab-case plural | `/employees`, `/attendance-events` |
| Event types | PascalCase + `.v<N>` | `EmployeeActivated.v1` |
| CSS classes | Tailwind utilities + BEM for custom | `.card__header` |
| i18n keys | dot-separated namespaced | `attendance.correction.submitted` |

### Backend (NestJS)
- One module per business domain; no cross-module direct DB access
- Communicate cross-domain via domain events or internal API calls only
- Repository pattern: one repository class per aggregate root
- DTOs are plain classes decorated with class-validator; never expose entities directly
- Use NestJS `@Injectable()` + DI for all services
- All service methods return typed results, never raw DB objects

### Frontend (Next.js)
- Server Components by default; Client Components only when needed (interactivity, hooks)
- Route groups: `(platform)`, `(tenant)`, `(employee)`
- Data fetching via TanStack Query; mutations with optimistic updates where UX warrants
- Forms: React Hook Form + Zod schema validation
- No inline styles; design tokens via CSS custom properties + Tailwind
- All text through i18n translation function — no hardcoded strings

### Database
- Migrations are SQL files with `up` and `down` scripts
- Expand-contract pattern: add columns/tables before removing old ones
- Seed scripts live in `database/seed/` and are idempotent

### Testing
- Unit tests: Jest; co-located with source (`*.spec.ts`)
- Integration tests: Supertest against real DB (no mocks for DB layer)
- E2E: Playwright for critical user journeys
- Mandatory: tenant isolation tests for every new table
- CI blocks merge on failing tests or coverage drop below threshold

---

## 14. Folder Structure Philosophy

### Monorepo (Turborepo)
```
workforce-cloud-os/
├── apps/
│   ├── api/          NestJS backend (modular monolith)
│   └── web/          Next.js frontend
├── packages/
│   ├── shared/       Shared utilities (used by both api and web)
│   ├── ui/           React component library (Radix-based)
│   ├── types/        Shared TypeScript types & Zod schemas
│   ├── constants/    Shared constants (error codes, enums, etc.)
│   ├── localization/ Translation catalogues (en, ur)
│   └── utils/        Pure utility functions
├── infrastructure/   Docker, K8s, Nginx, monitoring, scripts
├── docs/             Architecture decisions, API specs, runbooks
└── .github/          CI/CD workflows, PR templates, issue templates
```

### Module Colocation Rule
Every feature lives inside its domain module folder. No feature logic lives in `common/` or `shared/`. Common utilities are only infrastructure/cross-cutting concerns (logging, auth guards, error filters, etc.).

### Frontend Module Structure
Each module under `src/modules/<module>/` contains:
```
components/    Module-specific React components
hooks/         Module-specific custom hooks
api/           API call functions (TanStack Query keys + fetchers)
types/         Module-specific types
utils/         Module-specific utilities
constants/     Module-specific constants
```

### Backend Module Structure
Each module under `src/modules/<module>/` contains:
```
controllers/   NestJS route handlers
services/      Business logic
repositories/  Data access layer
dto/           Request/Response DTOs
entities/      TypeScript interfaces for DB rows
validators/    Custom validation logic
interfaces/    Service contracts / ports
```

---

## 15. Development Rules

1. **Read the specs first.** Before implementing any feature, re-read the relevant section of the source PDFs and this file.
2. **No undocumented features.** Do not add business logic, APIs, or DB tables that are not in the specification documents.
3. **Module-by-module delivery.** One module at a time; each must be fully implemented and tested before the next begins.
4. **OpenAPI first.** Define the API contract in OpenAPI 3.1 before writing the implementation.
5. **Schema migrations before code.** Write and review the DB migration before implementing the service layer.
6. **Immutable audit trail.** Every mutation to Restricted/Secret data must write to the audit trail atomically (same transaction or outbox).
7. **Feature flags.** Every plan-gated feature must check entitlement via the feature flag service before executing.
8. **No cross-module DB joins.** If module A needs data from module B, call module B's service or listen to its events.
9. **Environment parity.** Local dev, CI, staging, and production must use the same Docker images and configuration shape.
10. **Zero-downtime deployments.** Expand-contract migrations; no table locks; blue-green or rolling deploys on K8s.
