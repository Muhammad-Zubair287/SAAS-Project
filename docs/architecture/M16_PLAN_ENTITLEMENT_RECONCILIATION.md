# M16 — Plan & Entitlement Catalogue Reconciliation

**Date:** 2026-08-31  
**Scope:** Platform Plan & Entitlement Administration closeout  
**Sources:** Database ERD p.70 (`.analysis/Workforce_Cloud_OS_Detailed_Database_ERD_and_Data_Dictionary.txt`), PRD M16 §25 (`.analysis/Workforce Cloud OS MVP Product Requirements.txt`), live Prisma schema, M01 Batch 1 migration.

---

## A. `plan.billing_model`

| Source | Allowed values |
|--------|----------------|
| **ERD p.70** | `PER_SEAT`, `PLATFORM`, `HYBRID` |
| **Live implementation** | `FLAT_RATE`, `PER_SEAT`, `USAGE` |

### Decision: **Retain live schema — approved implementation divergence**

**Evidence the ERD was superseded intentionally:**

1. **`apps/api/src/database/prisma/migrations/20260728000001_m01_batch1_catalogue_alignment/migration.sql`** — M01 Batch 1 catalogue alignment introduced `plan.billing_model VARCHAR(30) NOT NULL DEFAULT 'PER_SEAT'` as part of the commercial plan catalogue restructure (uuid PK, `code`, `status`). This migration is the deployed baseline; it does not use ERD `PLATFORM` / `HYBRID`.
2. **`apps/api/src/database/prisma/schema.prisma`** (Plan model comment) — documents the live contract: `FLAT_RATE | PER_SEAT | USAGE`.
3. **`apps/api/src/modules/platform/constants/plan-catalogue.constants.ts`** — server validation enforces the live trio only.
4. **`docs/architecture/M01_REQUIREMENTS_RECONCILIATION.md`** §Super Admin epic — Plan CRUD implemented under the Super Admin epic absorbing platform surfaces; no requirement to mirror ERD enum literals verbatim.

**Rationale:** `billing_model` is a free-form `varchar(30)` with no DB check constraint. Existing rows use `PER_SEAT` (seed + smoke data). Renaming to ERD literals (`PLATFORM`, `HYBRID`) would be a breaking contract change with no migration path and no business rule mapping (`FLAT_RATE` ↔ `PLATFORM`, `USAGE` ↔ `HYBRID` is ambiguous).

**Action taken:** None on production data. UI/API continue to expose `FLAT_RATE`, `PER_SEAT`, `USAGE` with i18n labels.

**Future:** If product approves ERD-aligned commercial packaging, add an ADR + expand-contract migration mapping legacy values.

---

## B. Entitlement value type (`entitlement.data_type`)

| Source | Column / values |
|--------|-----------------|
| **ERD p.70** | `value_type`: `BOOLEAN`, `INTEGER`, `DECIMAL`, `TEXT` |
| **Live implementation** | `data_type`: `BOOLEAN`, `INTEGER`, `DECIMAL`, `STRING` |

### Decision: **Retain live schema — approved implementation divergence**

**Evidence:**

1. **Same M01 Batch 1 migration** — creates `entitlement.data_type VARCHAR(20) NOT NULL` (renamed from legacy `dataType`). Does not use ERD column name `value_type` or literal `TEXT`.
2. **`schema.prisma`** Entitlement model comment — `INTEGER | BOOLEAN | STRING | DECIMAL`.
3. **`apps/api/src/database/seed/m01-catalogue.seed.ts`** line 81 — seed author documented `STRING` not `TEXT`.
4. **Validation** — `plan-entitlement.validation.ts` accepts `STRING`; no catalogue row currently uses `STRING` (all seeded rows are `BOOLEAN`, `INTEGER`, or `DECIMAL`).

**Semantic equivalence:** `STRING` and `TEXT` denote the same JSONB string payload; only the enum label differs.

**Action taken:** None on production data. Documentation uses `STRING` as the live API/DB literal; ERD `TEXT` is noted as the specification synonym.

---

## C. Entitlement provenance matrix (full historical catalogue — 29 rows)

Classifications:

| Code | Meaning |
|------|---------|
| **A** | Explicit M16 / authoritative-document entitlement |
| **B** | Approved live architectural / product extension |
| **C** | Roadmap / future-module placeholder with documentary support |
| **D** | Unsupported / no authoritative source |

`productionSeedAllowed` reflects **documentary approval**, not whether a row currently exists in a local database.

| # | code | label | dataType | document source | classification | productionSeedAllowed | reason |
|---|------|-------|----------|-----------------|----------------|----------------------|--------|
| 1 | `max_employees` | Max Employees | INTEGER | M16-FR-001/002 seat limits | A | yes | Named seat-capability in M16 commercial packaging |
| 2 | `max_legal_entities` | Max Legal Entities | INTEGER | M03 org structure limits | B | yes | Approved org-structure guardrail; not in M16 table |
| 3 | `max_branches` | Max Branches | INTEGER | M03 org structure limits | B | yes | Approved org-structure guardrail |
| 4 | `max_departments` | Max Departments | INTEGER | M03 org structure limits | B | yes | Approved org-structure guardrail |
| 5 | `storage_limit_gb` | Storage Limit (GB) | INTEGER | M01-FR-005 storage entitlement | B | yes | Documented platform storage packaging |
| 6 | `api_rate_limit_rpm` | API Rate Limit (req/min) | INTEGER | M16 API-access tiering support | B | yes | Operational limit supporting `feature_api_access` |
| 7 | `max_payroll_runs_per_month` | Payroll Runs Per Month | INTEGER | M19 payroll operations | B | yes | Payroll module operational guardrail |
| 8 | `feature_core_hr` | Core HR | BOOLEAN | M16 §25.4 | A | yes | Core HR module flag |
| 9 | `feature_attendance` | Attendance | BOOLEAN | M16 §25.4 | A | yes | Attendance module flag |
| 10 | `feature_leave` | Leave | BOOLEAN | M16 §25.4 | A | yes | Leave module flag |
| 11 | `feature_payroll` | Payroll Module | BOOLEAN | M16 §25.4 | A | yes | Payroll module flag |
| 12 | `feature_shifts` | Shifts & Roster Module | BOOLEAN | M07 shifts module (MVP scope) | B | yes | Live MVP module; approved extension |
| 13 | `feature_advanced_reports` | Advanced Reports & Dashboards | BOOLEAN | M16 §25.4 custom reports | A | yes | Advanced reporting capability |
| 14 | `feature_sso` | Single Sign-On (SSO) | BOOLEAN | M16 §25.4 | A | yes | Enterprise SSO |
| 15 | `feature_custom_branding` | Custom Branding | BOOLEAN | M01-FR-010 tenant branding | B | yes | Tenant branding scope |
| 16 | `feature_api_access` | Public API Access | BOOLEAN | M16 §25.4 | A | yes | API access tier |
| 17 | `feature_dedicated_support` | Dedicated Support | BOOLEAN | M16 §25.4 premium support | A | yes | Premium support tier |
| 18 | `feature_taskops` | TaskOps | BOOLEAN | — | D | **no** | No authoritative M16/M01/MVP source |
| 19 | `feature_performance` | Performance Management | BOOLEAN | — | D | **no** | No authoritative source |
| 20 | `feature_assets` | Assets | BOOLEAN | — | D | **no** | No authoritative source |
| 21 | `feature_benefits` | Benefits | BOOLEAN | — | D | **no** | No authoritative source |
| 22 | `feature_ai_insights` | AI Insights | BOOLEAN | — | D | **no** | No authoritative source |
| 23 | `feature_compliance_packs` | Compliance Packs | BOOLEAN | — | D | **no** | No authoritative source |
| 24 | `feature_webhooks` | Webhooks | BOOLEAN | — | D | **no** | No authoritative source |
| 25 | `feature_on_prem_connector` | On-Prem Connector | BOOLEAN | — | D | **no** | No authoritative source |
| 26 | `feature_custom_fields` | Custom Fields | BOOLEAN | Platform customisation pattern | B | yes | Approved tenant customisation |
| 27 | `pricing_per_employee_monthly` | Per-Employee Monthly Fee | DECIMAL | M16 commercial packaging metadata | B | yes | Rate metadata only — not a billing engine |
| 28 | `pricing_minimum_platform_fee` | Minimum Platform Fee | DECIMAL | M16 commercial packaging metadata | B | yes | Rate metadata only |
| 29 | `audit_log_retention_days` | Audit Log Retention (days) | INTEGER | M17-FR-007 retention | B | yes | Audit retention alignment |

### Classification totals

| Classification | Count |
|----------------|-------|
| A | 9 |
| B | 12 |
| C | 0 |
| D | 8 |
| **Total** | **29** |

### Unsupported rows (classification D — 8)

`feature_taskops`, `feature_performance`, `feature_assets`, `feature_benefits`, `feature_ai_insights`, `feature_compliance_packs`, `feature_webhooks`, `feature_on_prem_connector`

> **Correction:** Prior draft incorrectly stated “7 unsupported” while listing 8 codes. The authoritative unsupported count is **8**.

### Production reference seed

`npm run db:seed:reference-catalogue` installs **21** approved entitlements (`REFERENCE_ENTITLEMENTS` = 29 − 8).

The 8 classification-D rows are seeded only by the full dev/demo path `seedM01Catalogues()` via `seedM01DemoOnlyEntitlements()`.

### Existing database compatibility

- **No destructive migration** removes legacy D rows from deployed databases.
- Fresh deployments via reference seed **do not create** D rows.
- Environments that already contain D rows retain them; `GET /platform/entitlements` continues to return active catalogue rows present in the DB.
- Optional future cleanup (mark `INACTIVE` or archive) requires a separate product decision and ADR — out of scope for this closeout.

**M16 concepts not present as catalogue codes:** Regional hosting, distinct advanced-workflows code (folded into `feature_advanced_reports`), trial plan (tenant/subscription scope).

---

## D. Deployment bootstrap

```bash
npm run db:migrate          # from apps/api
npm run db:seed:reference-catalogue   # 21 production entitlements + regions
npm run db:seed:platform-super-admin
```

Commercial plans remain Super Admin–created (Model B). Demo plans optional via full `seedM01Catalogues()` (adds 8 dev-only entitlements + Essential/Growth/Enterprise plans).
