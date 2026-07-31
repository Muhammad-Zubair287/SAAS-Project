# Folder Structure Verification Report

> Verification performed against: TSA Appendix B (Suggested Repository Structure), TSA §10 (Frontend Architecture), TSA §11 (Backend Architecture), PRD module list, BRD scope.
>
> Status values: ✅ Verified | ⚠️ Discrepancy Found | ❌ Missing

---

## 1. Root Repository Structure

| Folder | Status | Notes |
|--------|--------|-------|
| `apps/` | ✅ Verified | TSA Appendix B |
| `apps/api/` | ✅ Verified | NestJS modular monolith; TSA §11 |
| `apps/web/` | ✅ Verified | Next.js; TSA §10 |
| `packages/` | ✅ Verified | TSA Appendix B |
| `infrastructure/` | ✅ Verified | TSA §36, §38 |
| `docs/` | ✅ Verified | TSA §51 (architecture governance) |
| `.github/` | ✅ Verified | TSA §39 (CI/CD) |
| `CLAUDE.md` | ✅ Verified | Permanent engineering reference |
| `README.md` | ✅ Verified | Standard repository documentation |
| `apps/worker/` | ⚠️ Missing | TSA Appendix B explicitly lists `apps/worker/` for queue consumers. Currently workers live inside `apps/api/`. Decision required. |
| `apps/connector-runtime/` | ⚠️ Missing | TSA Appendix B lists `apps/connector-runtime/` for integration adapters. TSA §31 requires connector isolation. Decision required. |
| `tests/` | ⚠️ Missing | TSA Appendix B lists `tests/tenant-isolation/`, `tests/payroll-regression/`, `tests/performance/`, `tests/resilience/` as top-level test suites. |

---

## 2. Backend Module Folders (apps/api/src/modules/)

Each module is verified individually for the presence of all required subdirectories.

### M01 — platform
| Subfolder | Status |
|-----------|--------|
| `controllers/` | ✅ |
| `services/` | ✅ |
| `repositories/` | ✅ |
| `dto/` | ✅ |
| `entities/` | ✅ |
| `validators/` | ✅ |
| `interfaces/` | ✅ |
| **Overall** | ✅ Verified |

### M02 — authentication
| Subfolder | Status |
|-----------|--------|
| `controllers/` | ✅ |
| `services/` | ✅ |
| `repositories/` | ✅ |
| `dto/` | ✅ |
| `entities/` | ✅ |
| `validators/` | ✅ |
| `interfaces/` | ✅ |
| **Overall** | ⚠️ Name mismatch — TSA §11 uses `identity`; current folder is `authentication`. Functionally equivalent. See Module Naming Note in MODULE_MAPPING.md. |

### M03 — organisation
| Subfolder | Status |
|-----------|--------|
| `controllers/` | ✅ |
| `services/` | ✅ |
| `repositories/` | ✅ |
| `dto/` | ✅ |
| `entities/` | ✅ |
| `validators/` | ✅ |
| `interfaces/` | ✅ |
| **Overall** | ✅ Verified (matches TSA §11 `modules/organisation`) |

### M04 — employee
| Subfolder | Status |
|-----------|--------|
| `controllers/` | ✅ |
| `services/` | ✅ |
| `repositories/` | ✅ |
| `dto/` | ✅ |
| `entities/` | ✅ |
| `validators/` | ✅ |
| `interfaces/` | ✅ |
| **Overall** | ⚠️ Name mismatch — TSA §11 uses `people`; current folder is `employee`. Functionally equivalent. Decision required. |

### M05 — onboarding
| Subfolder | Status |
|-----------|--------|
| `controllers/` | ✅ |
| `services/` | ✅ |
| `repositories/` | ✅ |
| `dto/` | ✅ |
| `entities/` | ✅ |
| `validators/` | ✅ |
| `interfaces/` | ✅ |
| **Overall** | ✅ Verified |

### M05 (part 2) — documents
| Subfolder | Status |
|-----------|--------|
| `controllers/` | ✅ |
| `services/` | ✅ |
| `repositories/` | ✅ |
| `dto/` | ✅ |
| `entities/` | ✅ |
| `validators/` | ✅ |
| `interfaces/` | ✅ |
| **Overall** | ✅ Verified (TSA §11 `modules/documents`) |

### M06 — attendance
| Subfolder | Status |
|-----------|--------|
| `controllers/` | ✅ |
| `services/` | ✅ |
| `repositories/` | ✅ |
| `dto/` | ✅ |
| `entities/` | ✅ |
| `validators/` | ✅ |
| `interfaces/` | ✅ |
| **Overall** | ✅ Verified (matches TSA §11 `modules/attendance`) |

### M07 — shifts
| Subfolder | Status |
|-----------|--------|
| `controllers/` | ✅ |
| `services/` | ✅ |
| `repositories/` | ✅ |
| `dto/` | ✅ |
| `entities/` | ✅ |
| `validators/` | ✅ |
| `interfaces/` | ✅ |
| **Overall** | ✅ Verified (TSA groups shifts within attendance domain; separate folder is acceptable and provides better module colocation) |

### M08 — leave
| Subfolder | Status |
|-----------|--------|
| `controllers/` | ✅ |
| `services/` | ✅ |
| `repositories/` | ✅ |
| `dto/` | ✅ |
| `entities/` | ✅ |
| `validators/` | ✅ |
| `interfaces/` | ✅ |
| **Overall** | ✅ Verified (matches TSA §11 `modules/leave`) |

### M09 — workflow
| Subfolder | Status |
|-----------|--------|
| `controllers/` | ✅ |
| `services/` | ✅ |
| `repositories/` | ✅ |
| `dto/` | ✅ |
| `entities/` | ✅ |
| `validators/` | ✅ |
| `interfaces/` | ✅ |
| **Overall** | ✅ Verified (matches TSA §11 `modules/workflow`) |

### M10 — payroll
| Subfolder | Status |
|-----------|--------|
| `controllers/` | ✅ |
| `services/` | ✅ |
| `repositories/` | ✅ |
| `dto/` | ✅ |
| `entities/` | ✅ |
| `validators/` | ✅ |
| `interfaces/` | ✅ |
| **Overall** | ✅ Verified (matches TSA §11 `modules/payroll`) |

### M11 — employee-self-service
| Subfolder | Status |
|-----------|--------|
| `controllers/` | ✅ |
| `services/` | ✅ |
| `repositories/` | ✅ |
| `dto/` | ✅ |
| `entities/` | ✅ |
| `validators/` | ✅ |
| `interfaces/` | ✅ |
| **Overall** | ✅ Verified |

### M12 — manager-self-service
| Subfolder | Status |
|-----------|--------|
| `controllers/` | ✅ |
| `services/` | ✅ |
| `repositories/` | ✅ |
| `dto/` | ✅ |
| `entities/` | ✅ |
| `validators/` | ✅ |
| `interfaces/` | ✅ |
| **Overall** | ✅ Verified |

### M13 — notifications
| Subfolder | Status |
|-----------|--------|
| `controllers/` | ✅ |
| `services/` | ✅ |
| `repositories/` | ✅ |
| `dto/` | ✅ |
| `entities/` | ✅ |
| `validators/` | ✅ |
| `interfaces/` | ✅ |
| **Overall** | ✅ Verified (matches TSA §11 `modules/notifications`) |

### M14 — reports
| Subfolder | Status |
|-----------|--------|
| `controllers/` | ✅ |
| `services/` | ✅ |
| `repositories/` | ✅ |
| `dto/` | ✅ |
| `entities/` | ✅ |
| `validators/` | ✅ |
| `interfaces/` | ✅ |
| **Overall** | ⚠️ Name mismatch — TSA §11 uses `reporting`; current folder is `reports`. Functionally equivalent. Decision required. |

### M15 — integrations
| Subfolder | Status |
|-----------|--------|
| `controllers/` | ✅ |
| `services/` | ✅ |
| `repositories/` | ✅ |
| `dto/` | ✅ |
| `entities/` | ✅ |
| `validators/` | ✅ |
| `interfaces/` | ✅ |
| **Overall** | ✅ Verified (matches TSA §11 `modules/integrations`) |

### M16 — subscriptions
| Subfolder | Status |
|-----------|--------|
| `controllers/` | ✅ |
| `services/` | ✅ |
| `repositories/` | ✅ |
| `dto/` | ✅ |
| `entities/` | ✅ |
| `validators/` | ✅ |
| `interfaces/` | ✅ |
| **Overall** | ✅ Verified |

### M17 — audit
| Subfolder | Status |
|-----------|--------|
| `controllers/` | ✅ |
| `services/` | ✅ |
| `repositories/` | ✅ |
| `dto/` | ✅ |
| `entities/` | ✅ |
| `validators/` | ✅ |
| `interfaces/` | ✅ |
| **Overall** | ✅ Verified (matches TSA §11 audit domain) |

### settings
| Subfolder | Status |
|-----------|--------|
| All 7 subfolders | ✅ |
| **Overall** | ✅ Verified (tenant/platform settings management) |

### Cross-cutting backend folders
| Folder | Status | Source |
|--------|--------|--------|
| `apps/api/src/main/` | ✅ Verified | NestJS entry point |
| `apps/api/src/config/` | ✅ Verified | TSA §38 — configuration management |
| `apps/api/src/common/constants/` | ✅ Verified | |
| `apps/api/src/common/decorators/` | ✅ Verified | |
| `apps/api/src/common/dto/` | ✅ Verified | |
| `apps/api/src/common/exceptions/` | ✅ Verified | |
| `apps/api/src/common/filters/` | ✅ Verified | |
| `apps/api/src/common/guards/` | ✅ Verified | |
| `apps/api/src/common/interceptors/` | ✅ Verified | |
| `apps/api/src/common/middleware/` | ✅ Verified | |
| `apps/api/src/common/pipes/` | ✅ Verified | |
| `apps/api/src/common/types/` | ✅ Verified | |
| `apps/api/src/common/utils/` | ✅ Verified | |
| `apps/api/src/database/prisma/` | ✅ Verified | |
| `apps/api/src/database/migrations/` | ✅ Verified | TSA ADR-010 |
| `apps/api/src/database/seed/` | ✅ Verified | |
| `apps/api/src/realtime/` | ✅ Verified | TSA §27 (WebSocket channel) |
| `apps/api/src/jobs/` | ✅ Verified | TSA §21 (background processing) |
| `apps/api/src/events/` | ✅ Verified | TSA ADR-004 (outbox relay) |
| `apps/api/src/queues/` | ✅ Verified | TSA ADR-005 (BullMQ) |
| `apps/api/src/uploads/` | ✅ Verified | TSA §28 (file upload staging) |
| `apps/api/src/tests/` | ✅ Verified | TSA §46 |
| `platform/tenant-context` subfolder | ⚠️ Missing | TSA §11 references `platform/tenant-context`, `audit`, `jobs`, `config`, `telemetry` as cross-cutting. These are covered by `common/` and `config/` but could be explicit. Not blocking. |

---

## 3. Frontend Module Folders (apps/web/src/modules/)

Each module verified for all 6 required subdirectories (components, hooks, api, types, utils, constants).

| Module | Status | Notes |
|--------|--------|-------|
| `authentication` | ✅ All 6 subdirs | |
| `platform` | ✅ All 6 subdirs | |
| `tenant` | ✅ All 6 subdirs | |
| `organisation` | ✅ All 6 subdirs | |
| `employee` | ✅ All 6 subdirs | |
| `onboarding` | ✅ All 6 subdirs | |
| `documents` | ✅ All 6 subdirs | |
| `attendance` | ✅ All 6 subdirs | |
| `shifts` | ✅ All 6 subdirs | |
| `leave` | ✅ All 6 subdirs | |
| `workflow` | ✅ All 6 subdirs | |
| `payroll` | ✅ All 6 subdirs | |
| `employee-self-service` | ✅ All 6 subdirs | |
| `manager-self-service` | ✅ All 6 subdirs | |
| `notifications` | ✅ All 6 subdirs | |
| `reports` | ✅ All 6 subdirs | |
| `integrations` | ✅ All 6 subdirs | |
| `subscriptions` | ✅ All 6 subdirs | |
| `audit` | ✅ All 6 subdirs | |
| `settings` | ✅ All 6 subdirs | |

### Frontend Shared Folders
| Folder | Status | Source |
|--------|--------|--------|
| `apps/web/src/app/(platform)/` | ✅ Verified | TSA §10 |
| `apps/web/src/app/(tenant)/` | ✅ Verified | TSA §10 |
| `apps/web/src/app/(employee)/` | ✅ Verified | TSA §10 |
| `apps/web/src/layouts/` | ✅ Verified | |
| `apps/web/src/routes/` | ✅ Verified | |
| `apps/web/src/guards/` | ✅ Verified | TSA §10 — "Navigation and controls hide unauthorised actions" |
| `apps/web/src/providers/` | ✅ Verified | |
| `apps/web/src/contexts/` | ✅ Verified | |
| `apps/web/src/hooks/` | ✅ Verified | |
| `apps/web/src/api/` | ✅ Verified | |
| `apps/web/src/services/` | ✅ Verified | |
| `apps/web/src/components/common/` | ✅ Verified | |
| `apps/web/src/components/layout/` | ✅ Verified | |
| `apps/web/src/components/forms/` | ✅ Verified | |
| `apps/web/src/components/tables/` | ✅ Verified | |
| `apps/web/src/components/dialogs/` | ✅ Verified | |
| `apps/web/src/components/charts/` | ✅ Verified | TSA §10 — dashboards |
| `apps/web/src/components/feedback/` | ✅ Verified | |
| `apps/web/src/components/navigation/` | ✅ Verified | |
| `apps/web/src/assets/` | ✅ Verified | |
| `apps/web/src/localization/` | ✅ Verified | BRD §15.7, TSA §10 |
| `apps/web/src/theme/` | ✅ Verified | Design System |
| `apps/web/src/styles/` | ✅ Verified | TSA §10 — `styles/tokens.css` |
| `apps/web/src/constants/` | ✅ Verified | |
| `apps/web/src/types/` | ✅ Verified | |
| `apps/web/src/utils/` | ✅ Verified | |
| `apps/web/src/app/(auth)/` | ⚠️ Missing | Auth route group needed for login/MFA screens |
| `apps/web/src/lib/` | ⚠️ Missing | TSA §10 specifies `lib/api`, `lib/auth`, `lib/i18n`, `lib/permissions`, `lib/telemetry`. Not blocking but recommended. |

---

## 4. Packages

| Package | Status | Source |
|---------|--------|--------|
| `packages/shared/` | ✅ Verified | TSA Appendix B |
| `packages/ui/` | ✅ Verified | TSA Appendix B (`design-system`) |
| `packages/ui/src/components/` | ✅ Verified | |
| `packages/ui/src/tokens/` | ✅ Verified | Design System |
| `packages/ui/src/hooks/` | ✅ Verified | |
| `packages/types/` | ✅ Verified | |
| `packages/constants/` | ✅ Verified | |
| `packages/localization/` | ✅ Verified | BRD §15.7 |
| `packages/localization/src/en/` | ✅ Verified | |
| `packages/localization/src/ur/` | ✅ Verified | |
| `packages/utils/` | ✅ Verified | |
| `packages/contracts/` | ⚠️ Missing | TSA Appendix B — OpenAPI + AsyncAPI contracts package |
| `packages/domain-events/` | ⚠️ Missing | TSA Appendix B — shared event type definitions |
| `packages/validation/` | ⚠️ Missing | TSA Appendix B — shared Zod schemas |
| `packages/observability/` | ⚠️ Missing | TSA Appendix B + TSA ADR-008 — OpenTelemetry setup |
| `packages/test-fixtures/` | ⚠️ Missing | TSA Appendix B — shared test data factories |

---

## 5. Infrastructure

| Folder | Status | Source |
|--------|--------|--------|
| `infrastructure/docker/` | ✅ Verified | TSA ADR-007 |
| `infrastructure/kubernetes/base/` | ✅ Verified | TSA §36, §38 |
| `infrastructure/kubernetes/overlays/dev/` | ✅ Verified | TSA §37 |
| `infrastructure/kubernetes/overlays/staging/` | ✅ Verified | TSA §37 |
| `infrastructure/kubernetes/overlays/production/` | ✅ Verified | TSA §37 |
| `infrastructure/nginx/` | ✅ Verified | TSA §36 (ingress) |
| `infrastructure/monitoring/grafana/` | ✅ Verified | TSA §41 |
| `infrastructure/monitoring/prometheus/` | ✅ Verified | TSA §41 |
| `infrastructure/monitoring/loki/` | ✅ Verified | TSA §41 |
| `infrastructure/scripts/` | ✅ Verified | TSA §39 (runbooks) |
| `infrastructure/terraform/` | ⚠️ Missing | TSA §38, Appendix B — IaC root module. Currently `infrastructure/kubernetes/` exists but no `terraform/` folder. |
| `infrastructure/policies/` | ⚠️ Missing | TSA §38 — "Apply policy-as-code checks for public access, encryption." |

---

## 6. Docs & GitHub

| Folder | Status | Source |
|--------|--------|--------|
| `docs/adr/` | ✅ Verified | TSA §51 — Architecture Decision Records |
| `docs/api/` | ✅ Verified | TSA §56 — API contract specification |
| `docs/runbooks/` | ✅ Verified | TSA §50 |
| `docs/architecture/` | ✅ Verified | TSA §51 |
| `docs/data-dictionary/` | ⚠️ Missing | TSA Appendix B lists `docs/data-dictionary/` |
| `.github/workflows/` | ✅ Verified | TSA §39 |
| `.github/ISSUE_TEMPLATE/` | ✅ Verified | |
| `.github/PULL_REQUEST_TEMPLATE/` | ✅ Verified | |

---

## 7. Top-Level Test Suites

| Folder | Status | Source |
|--------|--------|--------|
| `tests/tenant-isolation/` | ❌ Missing | TSA Appendix B + TSA §46 + TSA §55 Acceptance Criteria #2 — Mandatory |
| `tests/payroll-regression/` | ❌ Missing | TSA Appendix B + TSA §26 + TSA §46 — Mandatory |
| `tests/performance/` | ❌ Missing | TSA Appendix B + TSA §46 |
| `tests/resilience/` | ❌ Missing | TSA Appendix B + TSA §46 |

---

## 8. Summary of Findings

### ✅ Verified (no action needed)
- All 20 backend module folders with 7 subdirs each
- All 20 frontend module folders with 6 subdirs each
- All shared frontend folders
- All infrastructure monitoring folders
- Kubernetes overlay structure
- All docs and GitHub folders
- All packages (6 of 11 TSA-referenced)

### ⚠️ Discrepancies Found (decisions required)

| Item | Description | Decision Required |
|------|-------------|-------------------|
| Backend module `authentication` | TSA §11 uses `identity` | Rename or accept as-is (ADR-011b) |
| Backend module `employee` | TSA §11 uses `people` | Rename or accept as-is (ADR-011b) |
| Backend module `reports` | TSA §11 uses `reporting` | Rename or accept as-is (ADR-011b) |
| `apps/worker/` | TSA Appendix B lists this as a separate app | Add or keep workers in `apps/api/` |
| `apps/connector-runtime/` | TSA Appendix B lists this as a separate app | Add or confirm connectors stay in `integrations` module |
| `apps/web/src/app/(auth)/` | Auth screens need a route group | Add |
| `apps/web/src/lib/` | TSA §10 specifies lib subdirectories | Add or use existing structure |
| `packages/contracts/` | TSA Appendix B lists this | Add |
| `packages/domain-events/` | TSA Appendix B lists this | Add |
| `packages/validation/` | TSA Appendix B lists this | Add |
| `packages/observability/` | TSA Appendix B lists this | Add |
| `packages/test-fixtures/` | TSA Appendix B lists this | Add |
| `infrastructure/terraform/` | TSA §38 requires IaC | Add |
| `infrastructure/policies/` | TSA §38 requires policy-as-code | Add |
| `docs/data-dictionary/` | TSA Appendix B lists this | Add |

### ❌ Missing (critical — must add before Phase 2)

| Item | Reason Critical |
|------|----------------|
| `tests/tenant-isolation/` | TSA §55 Acceptance Criteria #2 — mandatory before production |
| `tests/payroll-regression/` | TSA §26 + TSA §55 AC #10 — mandatory before payroll launch |
| `tests/performance/` | TSA §46 — required for SLO validation |
| `tests/resilience/` | TSA §46 — required for DR validation |
