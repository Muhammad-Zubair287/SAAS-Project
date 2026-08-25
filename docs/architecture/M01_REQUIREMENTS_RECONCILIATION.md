# M01 — Platform Super Administration
# Requirements Reconciliation

Sources: BRD §9.1 / §11.1 (BR-TEN-001–005), PRD §10 (M01-FR-001–012, statuses, workflow, validations, notifications), UX §7.1 / SCR-PLT-01–06, API-TEN-001 + Appendix B TenantStatus, ERD tenant/subscription/usage/support_grant, Design System shell, Wireframe pack plates 1/4/wizard, TSA M01/M13/M15/M16/M17, MODULE_MAPPING, CLAUDE.md.

PDF binaries were not present in the workspace; screen copy was taken from the approved text extracts in `.analysis/` (UX pp.14–17, Wireframe inventory SCR-PLT-01–06).

Status legend: DOCUMENTED | IMPLEMENTED | PARTIAL | MISSING | CROSS-MODULE DEPENDENCY | NOT APPLICABLE

---

## Super Admin responsibility mapping

| Responsibility | Source | Owner | Status |
|---|---|---|---|
| Tenant creation | BRD 9.1, PRD 7.1, M01 | M01 | IMPLEMENTED |
| Subscription assignment at provision | BRD 9.1, M01-FR-004 | M01 assign; M16 lifecycle | PARTIAL (M01 assigns plan; M16 owns billing) |
| Global configuration | BRD 9.1, PRD 7.1 | M01 catalogues; later modules for flags/billing | PARTIAL (read-only plans/regions) |
| Feature / module activation | PRD 7.1, M01-FR-004, M16-FR-001 | M01 assign from plan; M16 enforce | PARTIAL |
| Support administration | BRD 9.1, M01-FR-011, SCR-PLT-06 | M01 SupportGrant | PARTIAL (grant/revoke live; approval/notification M09/M13) |
| Platform monitoring | BRD 9.1, SCR-PLT-01 incidents | M15 Integration Health | CROSS-MODULE DEPENDENCY |
| Compliance-pack administration | BRD 9.1 | M17 | CROSS-MODULE DEPENDENCY |
| Usage and billing management | BRD 9.1, M01-FR-009, M16 | M01 usage read; M16 metering/invoicing | PARTIAL |
| Tenant branding | M01-FR-010, BR-TEN-003 | Tenant Admin (table exists) | NOT APPLICABLE on platform screens |

---

## M01-FR matrix

| ID | Document | Frontend | Backend | DB | API | Status | Owner | Required action |
|---|---|---|---|---|---|---|---|---|
| FR-001 Create tenant | PRD 10.4 | Wizard | TenantService.create | tenant | POST /platform/tenants | IMPLEMENTED | M01 | None |
| FR-002 Unique identifier | PRD 10.4 / 10.8 | slug column | slugify + unique | tenant.slug unique | response slug | IMPLEMENTED | M01 | None |
| FR-003 Company profile | PRD 10.4 | Company step | DTO validated | country/currency/tz/locale | API-TEN-001 | IMPLEMENTED | M01 | None |
| FR-004 Plan + modules | PRD 10.4 | Plan select + plan entitlements | planId + plan entitlements | plan, tenant.planId, tenant_entitlement | POST + GET plans | IMPLEMENTED | M01 | Display only; modules come from plan |
| FR-005 Seat + storage limits | PRD 10.4 / 10.8 | Seat yes; storage missing as editable field | seatLimit yes; storage via entitlement `storage_limit_gb` | tenant.seatLimit; entitlement catalogue | seatLimit in API-TEN-001; storage not in example | PARTIAL | M01 | Persist/display storage_limit_gb override on create |
| FR-006 Primary admin invitation | PRD 10.4 / 10.9 | Create and send invitation | InvitationService + NotificationGateway | user_invitation (hash only) | token never in response | IMPLEMENTED | M01+M02 | Do not regress |
| FR-007 Draft | PRD 10.4 / 10.7 | Save draft | sendInvitation=false → DRAFT | status DRAFT | POST | IMPLEMENTED | M01 | None |
| FR-008 Suspended blocked | PRD 10.4 / 10.10 | Suspend dialog | Auth BLOCKED_TENANT_STATUSES + JWT strategy | SUSPENDED | login 403 TENANT_SUSPENDED | IMPLEMENTED | M01+M02 | None |
| FR-009 Usage + subscription | PRD 10.4 | Overview, Usage, detail tabs | stats, usage, subscription fields | tenant_subscription, tenant_usage_snapshot | GET usage/stats | IMPLEMENTED | M01 | None |
| FR-010 Branding | PRD 10.4 | Not on platform | TenantBranding model unused by platform UI | tenant_branding | no platform branding API | NOT APPLICABLE (tenant admin) | M01 table / Tenant Admin UI | Platform-side contract only |
| FR-011 Controlled support | PRD 10.4, SCR-PLT-06 | Grant/revoke dialogs | SupportGrantService | support_grant | POST/GET/DELETE grants | PARTIAL | M01 | Banner on tenant detail; no impersonation |
| FR-012 Audit create/activate/suspend/plan | PRD 10.4 / 10.8 | Platform Audit + tenant Audit tab | PlatformAuditService | audit_event | GET /platform/audit-events | IMPLEMENTED | M01 (M17 store) | None |

---

## Tenant status reconciliation

| Documented (PRD 10.5 / API App B) | Prisma `TenantStatus` | Action |
|---|---|---|
| Draft | DRAFT | Keep |
| Trial | TRIAL | Keep |
| Active | ACTIVE | Keep |
| Payment overdue | No tenant enum; SubscriptionStatus.PAST_DUE (compat) | Do not add enum. Surface via subscription status. |
| Grace period | GRACE (API: GRACE_PERIOD) | Keep GRACE; do not rename (compat) |
| Suspended | SUSPENDED | Keep |
| Closed | CLOSED | Keep |
| Archived | ARCHIVED compat-only | Do not use for new work |

### Transition matrix (authoritative backend)

| From | Activate | Suspend | Restore | Close |
|---|---|---|---|---|
| DRAFT | → ACTIVE (requires plan) | No | No | Not implemented (no close API) |
| TRIAL | No (already live) | → SUSPENDED | — | — |
| ACTIVE | No (409 already active) | → SUSPENDED | — | — |
| GRACE | No | → SUSPENDED | — | — |
| SUSPENDED | No (use restore) | No | → ACTIVE | — |
| CLOSED | Only PLATFORM_SUPER_ADMIN (PRD 10.8 elevated) | No | No | — |
| ARCHIVED | Never | Never | Never | — |

Login blocked: SUSPENDED, CLOSED, ARCHIVED (auth.service / jwt.strategy).

---

## Gap classification

| Gap | Class | Batch |
|---|---|---|
| Storage limit not independently configurable on create | A M01 missing | 2 |
| Usage threshold directory filter | A M01 missing (UX SCR-PLT-02) | 3 |
| Directory missing Edit / Change plan / View audit row actions | B defect | 4 |
| Detail suspend only on ACTIVE (not TRIAL/GRACE) | B defect | 4 |
| No visible support-access banner | A M01 missing (SCR-PLT-06) | 5 |
| CLOSED reactivation not explicit | B defect (PRD 10.8) | 1 |
| Activate without plan check | B defect (PRD 10.8) | 1 |
| Phone on primary admin | E not in API-TEN-001 (“where required”) | Skip |
| Payment overdue as tenant status | C/E map to subscription PAST_DUE/GRACE | Skip enum |
| Integration incidents live data | A Super Admin epic | Done — Integration Health + PLT-01 widget |
| Trial/seat/subscription warning emails | C M13 + M16-FR-008 (scheduled) | Skip scheduler |
| Activation/suspension email beyond invitation | C M13 consumes TenantActivated.v1 / TenantSuspended.v1 | Keep outbox; no second EmailService |
| Tenant branding UI | C Tenant Admin / M01-FR-010 | Skip platform UI |
| Billing/invoicing | C M16 partial | Usage MRR estimate + plan CRUD in Super Admin epic; full invoicing later |
| Full audit product (DSR, retention UI) | A Super Admin epic | Done — audit detail/export + config retention/security |
| Support grant approval workflow | A Super Admin epic | Done — PENDING + approve/reject gated by security setting |
| Tenant notification of support access | C M13 outbox | Outbox events emitted; inbox via platform notifications |
| Public signup | E forbidden | None |

## Super Admin epic (2026-08-24) ownership note

Platform shell chrome (§6.1), Plans CRUD, Usage dashboard + snapshot job, System Configuration domains, Integration Health, Platform notifications, Global search, and Audit detail/export are implemented under `/platform` and `apps/api` platform module as a single epic absorbing prior M13/M15/M16/M17 *platform surfaces*.

---

## Implementation batches (this task)

1. Lifecycle rules: plan required on activate; CLOSED only Super Admin. **DONE**
2. Storage limit: optional `storageLimitGb` → `tenant_entitlement.storage_limit_gb`; wizard + usage display. **DONE**
3. Directory `minSeatUtilisationPct` filter. **DONE**
4. Directory/detail actions alignment. **DONE**
5. Support-access banner on tenant detail. **DONE**
6. Build + API/browser smoke for the new rules only. **DONE** (API `nest build` + smoke 18/18; Playwright 5/5; web `tsc` passed; `next build` skipped while `next dev` is live)

