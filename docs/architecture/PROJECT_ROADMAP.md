# Implementation Roadmap

> Source: TSA §53 — Implementation Sequence (Stage 0–9), TSA §55 Acceptance Criteria, BRD §25 MoSCoW priorities.

---

## Roadmap Summary

| Phase | Stage | Name | Modules | Status |
|-------|-------|------|---------|--------|
| 1 | Stage 0 | Repository & Infrastructure Foundation | Cross-cutting | ✅ Complete |
| 2 | Stage 1 | Platform Core | M01, M02, M16, M17 (interceptor) | 🔴 Not Started |
| 3 | Stage 2 | Organisation & People | M03, M04, M05 | 🔴 Not Started |
| 4 | Stage 3 | Attendance & Shifts | M06, M07 | 🔴 Not Started |
| 5 | Stage 4 | Leave & Workflow | M08, M09 | 🔴 Not Started |
| 6 | Stage 5 | Payroll | M10 | 🔴 Not Started |
| 7 | Stage 6 | Self-Service & Reporting | M11, M12, M13, M14 | 🔴 Not Started |
| 8 | Stage 7 | Integrations | M15 | 🔴 Not Started |
| 9 | Stage 8 | Hardening & Performance | Cross-cutting | 🔴 Not Started |
| 10 | Stage 9 | Pilot & Launch | All | 🔴 Not Started |

---

## Phase 1 — Repository & Infrastructure Foundation (Stage 0)

**Status:** ✅ Complete
**Dependencies:** None

### Deliverables
| Item | Status |
|------|--------|
| Monorepo structure (Turborepo) | ✅ Done |
| CLAUDE.md engineering reference | ✅ Done |
| Architecture documentation (this file + siblings) | ✅ Done |
| ADR-001 through ADR-014 | ✅ Done |
| All 17 backend module folder skeletons | ✅ Done |
| All 17 frontend module folder skeletons | ✅ Done |
| Missing test and package folders created | ✅ Done |
| Traceability, dependency, module mapping docs | ✅ Done |

### Completion Criteria
- [x] All documentation created from spec PDFs
- [x] All module folders verified individually
- [x] No business logic implemented (intentional)

---

## Phase 2 — Platform Core (Stage 1)

**Status:** 🔴 Not Started
**Depends On:** Phase 1 complete
**Modules:** M01 Platform & Tenant, M02 Authentication & IAM, M16 Subscriptions, M17 Audit (interceptor)

### Why First
Platform and authentication are preconditions for all other modules. Every database table, API endpoint, and background job depends on tenant context (M01) and JWT/RBAC (M02). The audit interceptor (M17 cross-cutting concern) must be active from day one.

### Deliverables

#### Infrastructure (must complete before module code)
| Item | Source |
|------|--------|
| Docker Compose dev environment (PostgreSQL, Redis, API, Web) | TSA §36 |
| Database migration tooling (Prisma + expand-contract workflow) | TSA ADR-010 |
| Base NestJS app with OpenTelemetry SDK wired | TSA ADR-008 |
| Base Next.js app with route groups `(platform)`, `(tenant)`, `(employee)` | TSA §10 |
| GitHub Actions CI pipeline (lint, type-check, test, build) | TSA §39 |
| PostgreSQL RLS base policy template | TSA ADR-002 |
| Redis rate limiter middleware | TSA §32 |
| Transactional outbox table + relay worker skeleton | TSA ADR-004 |
| Idempotency key table and middleware | TSA §20 |
| ETag / If-Match response/request interceptor | TSA §20 |
| Audit interceptor (NestJS global interceptor) | TSA §31 |

#### M01 — Platform & Tenant
| Item | Source |
|------|--------|
| `tenants` table + RLS | ERD §2 |
| `tenant_settings` table | ERD §2 |
| `tenant_feature_flags` table | ERD §2 |
| Tenant CRUD API (`POST/GET/PATCH /api/v1/tenants`) | API Spec §3 |
| Tenant suspend/activate API | API Spec §3 |
| Tenant context middleware (SET LOCAL) | TSA ADR-002 |
| Platform admin screens: Tenant List, Tenant Create, Tenant Detail | UX Spec §3 |

#### M02 — Authentication & IAM
| Item | Source |
|------|--------|
| `users`, `user_sessions`, `roles`, `permissions`, `role_permissions`, `user_roles`, `mfa_credentials`, `sso_connections` tables | ERD §3 |
| JWT issuance (access + refresh tokens) | TSA §14 |
| TOTP MFA enrollment and verification | TSA §14 |
| SMS/Email OTP flow | TSA §14 |
| SSO integration stubs (Entra ID, Google) | BRD §11.20 |
| RBAC guard (action + resource + scope) | TSA ADR-002 |
| Auth screens: Login, MFA Setup, Password Reset | UX Spec §4 |
| Role management API and screens | API Spec §4 |

#### M16 — Subscriptions (basic)
| Item | Source |
|------|--------|
| `subscription_plans`, `tenant_subscriptions`, `entitlements`, `plan_features` tables | ERD §17 |
| Entitlement check service (feature flag gate) | BRD §11.21 |
| Plan management API | API Spec §18 |

#### M17 — Audit Interceptor (cross-cutting)
| Item | Source |
|------|--------|
| `audit_logs` table (append-only, no UPDATE/DELETE RLS) | ERD §18 |
| Global `AuditInterceptor` writing to audit_logs via outbox | TSA §31 |
| Audit log read API | API Spec §19 |

### Acceptance Criteria (from TSA §55)
- [ ] AC-1: JWT tenant claim verified on every request
- [ ] AC-2: RBAC guard blocks unauthorized actions
- [ ] AC-3: SET LOCAL isolates every transaction
- [ ] AC-4: RLS rejects cross-tenant access with valid JWT
- [ ] AC-5: RLS enabled and tested on all tenant tables created so far
- [ ] AC-9: Audit log captures all Restricted/Secret mutations
- [ ] AC-11: Tenant isolation test suite passes (zero leakage)

---

## Phase 3 — Organisation & People (Stage 2)

**Status:** 🔴 Not Started
**Depends On:** Phase 2 complete
**Modules:** M03 Organisation, M04 Employee Core HR, M05 Onboarding & Docs

### Why This Order
Organisation structure (M03) must exist before employees (M04) can be assigned to departments, positions, and cost centres. Employee records (M04) are the anchor for every subsequent workforce module.

### Deliverables

#### M03 — Organisation
| Item | Source |
|------|--------|
| `companies`, `business_units`, `departments`, `positions`, `grades`, `locations`, `cost_centres`, `org_nodes` tables | ERD §4 |
| Effective-dated records (btree_gist exclusion constraints) | TSA §17 |
| Org CRUD APIs | API Spec §5 |
| Org chart visualisation screen | UX Spec §5 |

#### M04 — Employee Core HR
| Item | Source |
|------|--------|
| `employees`, `employment_records`, `compensation_records`, `employee_documents`, `emergency_contacts` tables | ERD §5 |
| numeric(19,4) on all compensation amounts | TSA §17 |
| Employee lifecycle APIs (hire, transfer, promote, terminate) | API Spec §6 |
| Employee profile screens | UX Spec §6 |

#### M05 — Onboarding & Documents
| Item | Source |
|------|--------|
| `onboarding_checklists`, `onboarding_tasks`, `document_types` tables | ERD §6 |
| Document upload to S3 with tenant-prefixed paths | TSA ADR-006 |
| Document expiry alerts via notifications | BRD §11.6 |
| Onboarding screens | UX Spec §7 |

### Acceptance Criteria
- [ ] All employee tables have RLS enabled and tested
- [ ] Effective-dated transfers block overlapping assignments
- [ ] Document S3 paths are tenant-prefixed
- [ ] numeric(19,4) used for all compensation amounts

---

## Phase 4 — Attendance & Shifts (Stage 3)

**Status:** 🔴 Not Started
**Depends On:** Phase 3 complete
**Modules:** M06 Attendance, M07 Shifts & Rosters

### Why This Order
Attendance (M06) is the primary data input for payroll. Shifts (M07) define expected schedules that attendance is validated against. Both must be complete and tested before payroll can be attempted.

### Deliverables

#### M06 — Attendance
| Item | Source |
|------|--------|
| `raw_attendance_events`, `attendance_records`, `attendance_exceptions`, `attendance_periods`, `attendance_corrections` tables | ERD §7 |
| Attendance ingest endpoint (2s SLO, Idempotency-Key) | TSA §43, AC-6 |
| Append-only raw event store | BRD §11.7 |
| Attendance calculation worker (BullMQ) | TSA §36 |
| Exception detection engine | BRD §11.7 |
| Period lock API (elevated role required) | BRD §11.7 |
| Attendance dashboard, daily register, exception list screens | UX Spec §8 |

#### M07 — Shifts & Rosters
| Item | Source |
|------|--------|
| `shift_templates`, `rosters`, `shift_assignments`, `shift_swap_requests` tables | ERD §8 |
| Overnight shift handling (midnight spanning) | BRD §11.8 |
| Shift assignment APIs | API Spec §9 |
| Shift swap request and approval flow | BRD §11.8 |
| Roster calendar screen | UX Spec §9 |

### Acceptance Criteria
- [ ] AC-6: Attendance event acknowledged within 2s p95
- [ ] Raw attendance events are append-only (no UPDATE/DELETE allowed)
- [ ] Period lock blocks all corrections without elevated role
- [ ] Overnight shifts do not double-count hours
- [ ] Performance test suite passes for attendance ingest

---

## Phase 5 — Leave & Workflow (Stage 4)

**Status:** 🔴 Not Started
**Depends On:** Phase 4 complete
**Modules:** M08 Leave, M09 Workflow / Approval Engine

### Why This Order
Leave balances feed payroll deductions. The workflow engine (M09) is the approval backbone for leave, attendance corrections, payroll, and transfers — it must be production-ready before payroll.

### Deliverables

#### M08 — Leave
| Item | Source |
|------|--------|
| `leave_types`, `leave_policies`, `leave_requests`, `leave_balances`, `leave_accruals`, `leave_carry_forward` tables | ERD §9 |
| Pakistan statutory leave types (Annual, Sick, Casual, Maternity) | BRD §11.9 |
| Accrual calculation worker (BullMQ, nightly) | BRD §11.9 |
| Leave request → workflow integration | BRD §11.9 |
| Leave screens: dashboard, request, calendar, balance | UX Spec §10 |

#### M09 — Workflow / Approval Engine
| Item | Source |
|------|--------|
| `workflow_definitions`, `workflow_steps`, `workflow_instances`, `workflow_transitions`, `approval_tasks`, `delegations` tables | ERD §10 |
| Multi-step approval configuration | BRD §11.10 |
| Delegation with date range | BRD §11.10 |
| Escalation on timeout | BRD §11.10 |
| Audit trail per state transition | BRD §11.10 |
| SoD enforcement hook (plugged in from M10) | TSA §17 |
| Approval inbox screen | UX Spec §11 |

### Acceptance Criteria
- [ ] Leave balances reconcile after accrual run
- [ ] Carry-forward rules applied correctly
- [ ] Workflow audit trail captures every state transition
- [ ] Delegation routes tasks to delegate within date range
- [ ] Escalation fires after SLA timeout

---

## Phase 6 — Payroll (Stage 5)

**Status:** 🔴 Not Started
**Depends On:** Phase 5 complete
**Modules:** M10 Payroll

### Why This Comes Last in Core
Payroll consumes outputs from every preceding module (employees, attendance, leave, workflow). It is the highest-risk module and requires all upstream data to be stable.

### Deliverables

#### M10 — Payroll
| Item | Source |
|------|--------|
| `payroll_calendars`, `payroll_runs`, `payroll_run_inputs`, `payroll_line_items`, `payroll_deductions`, `payroll_approvals`, `payslips`, `payroll_exports` tables | ERD §11 |
| Immutable input snapshot at run creation | BRD §11.11 |
| Versioned formula packs (EOBI, SESSI, Income Tax — Pakistan) | BRD §11.11 |
| numeric(19,4) throughout; Decimal.js in application layer | TSA §17 |
| Calculation worker (BullMQ, deterministic) | TSA §53 |
| Variance analysis vs prior period | BRD §11.11 |
| MFA-gated approval endpoint (TOTP + SoD check) | BRD §11.11 |
| Immutable lock + version stamp on approval | BRD §11.11 |
| Protected PDF payslip generation (S3, time-limited pre-signed URL) | BRD §11.11 |
| Bank file export and tax file export (statutory formats) | BRD §11.11 |
| Payroll screens: calendar, run list, run detail, variance, approval, payslip | UX Spec §12 |

### Acceptance Criteria
- [ ] AC-7: Payroll run produces identical result given identical inputs
- [ ] AC-8: Payroll approval requires MFA and SoD (initiator ≠ approver)
- [ ] AC-12: Payroll regression suite passes for all statutory deduction scenarios
- [ ] Approved runs cannot be modified — new version required
- [ ] Bank and tax export files pass statutory format validation

---

## Phase 7 — Self-Service & Reporting (Stage 6)

**Status:** 🔴 Not Started
**Depends On:** Phase 6 complete
**Modules:** M11 ESS, M12 MSS, M13 Notifications, M14 Reports

### Deliverables

#### M11 — ESS
- My Dashboard, My Attendance, My Leave, My Payslips, My Profile screens
- Read-only views over M04, M06, M08, M10 data scoped to `self`

#### M12 — MSS
- Team Dashboard, Team Attendance, Approval Queue, Team Leave Calendar
- Scoped to `manager_hierarchy` with delegation support

#### M13 — Notifications
- Multi-channel delivery (in-app, email, SMS; push roadmap)
- Template management with EN + UR localisation
- User preference management
- BullMQ notification worker

#### M14 — Reports
- Canned reports: Attendance Summary, Exception, Overtime, Leave Utilisation, Payroll Summary, Headcount
- Excel/CSV/PDF export via background worker
- Scheduled export jobs

### Acceptance Criteria
- [ ] Employee can only view own data (self scope enforced)
- [ ] Manager can only view team data (manager_hierarchy scope enforced)
- [ ] Notification templates render correctly in EN and UR (RTL)
- [ ] All exports generate correct data for tenant

---

## Phase 8 — Integrations (Stage 7)

**Status:** 🔴 Not Started
**Depends On:** Phase 7 complete
**Modules:** M15 Integrations

### Deliverables

#### M15 — Integrations
- Biometric device connector (ZKTeco protocol)
- Microsoft Entra ID SSO (completes M02 stub)
- Google Workspace SSO (completes M02 stub)
- ERP/accounting GL export
- Bank file connector
- HMAC-SHA256 signed webhook delivery system
- Integration sync log screens
- Connector runtime (isolated NestJS app)

### Acceptance Criteria
- [ ] Biometric device events flow to M06 attendance pipeline
- [ ] SSO login creates valid JWT session
- [ ] Webhook delivery includes valid X-WCOS-Signature header
- [ ] Sync logs capture success, failure, and retry status

---

## Phase 9 — Hardening & Performance (Stage 8)

**Status:** 🔴 Not Started
**Depends On:** Phase 8 complete

### Deliverables
| Item | Source |
|------|--------|
| Full tenant isolation test suite (zero cross-tenant leakage) | TSA §55, AC-11 |
| Payroll regression test suite (all statutory scenarios) | TSA §55, AC-12 |
| Performance test suite (800ms p95 API, 2s attendance) | TSA SLOs |
| Security penetration test (external) | TSA §32 |
| SAST, DAST, dependency scan in CI | TSA §39 |
| Signed container images (SBOM) | TSA §39 |
| Disaster recovery test (RPO 15min, RTO 4hr) | TSA §44 |
| SOC 2 Type II controls documentation | TSA §32 |
| Audit log M17 UI (viewer, export, integrity check) | UX Spec §19 |
| Full RTL (Urdu) testing across all modules | BRD §15.7 |
| Observability dashboards (Grafana) wired to OTel | TSA ADR-008 |
| Log aggregation configured (Loki or Elastic) | TSA §41 |

### Acceptance Criteria
- [ ] All AC-1 through AC-12 passing
- [ ] Zero findings in external pen test (Critical/High)
- [ ] SLO targets met under load test

---

## Phase 10 — Pilot & Launch (Stage 9)

**Status:** 🔴 Not Started
**Depends On:** Phase 9 complete

### Deliverables
- Pilot tenant onboarding (real data migration)
- Training materials
- Go-live runbook
- Support escalation playbooks
- Production Kubernetes deployment (EKS)
- Blue-green deploy validated
- Incident response plan activated

---

## Open Architecture Decisions (Requiring Approval Before Relevant Phase)

| Decision | Options | Required Before |
|----------|---------|----------------|
| Mobile offline cache | WatermelonDB vs MMKV | Mobile sprint (post-MVP) |
| Chart library | Recharts vs Nivo | Phase 7 |
| K8s manifest tooling | Helm vs Kustomize | Phase 2 infrastructure |
| Log aggregation backend | Loki vs Elastic | Phase 2 infrastructure |
| RDS variant | RDS PostgreSQL vs Aurora PostgreSQL | Phase 2 infrastructure |
| Document malware scanning | Managed service vs containerised scanner | Phase 3 (M05) |
| Payroll PDF generation engine | Specific HTML→PDF library | Phase 6 (M10) |

> **These decisions MUST be resolved and documented as ADR updates before reaching the relevant phase.**
