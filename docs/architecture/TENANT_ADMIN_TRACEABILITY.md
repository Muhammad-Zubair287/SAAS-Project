# Tenant Admin Console — Requirement Traceability (Scope A)

Sources: UX §7.2 / §11 SCR-TEN-01…06, SCR-SET-01, SCR-AUD-04/05/06, SCR-SUB-01/03/04; BRD §9.2; PRD M01-FR-010 / M02; ERD tenant_branding / audit_event.

| PDF Requirement | Backend API | Database | Frontend Page | Permission | Tests | Status |
|-----------------|-------------|----------|---------------|------------|-------|--------|
| SCR-TEN-01 Setup checklist | `GET /tenant/setup-status` | Aggregates Tenant + org/attendance counts | `/dashboard` (when incomplete) | `read:tenant_settings:tenant` | Playwright smoke | Completed |
| SCR-TEN-02 Company profile | `GET/PATCH /tenant/profile` | `tenant` + `tenant_settings` | `/settings/company` | `read/manage:tenant_profile:tenant` | Isolation spec | Completed |
| SCR-TEN-03 Branding | `GET/PUT /tenant/branding`, `POST /tenant/branding/logo` | `tenant_branding` (extended) | `/settings/branding` + shell logo + upload | `read/manage:tenant_branding:tenant` | Isolation spec | Completed |
| SCR-TEN-04 Regional | `GET/PUT /tenant/regional` | `tenant_settings` + tenant locale/tz | `/settings/regional` (locales + week pattern) | `read/manage:tenant_settings:tenant` | Isolation spec | Completed |
| SCR-TEN-05 Administrators | `GET /users`, `GET /users/:id`, invitations, deactivate, require reset/MFA | `app_user`, `user_invitation`, `role_assignment` | `/settings/users` (+ detail panel) | `read/invite/deactivate/manage:user:tenant` | Playwright smoke | Completed |
| SCR-TEN-06 Modules | `GET /tenant/modules` | entitlements + feature flags | `/settings/modules` | `read:tenant_modules:tenant` | Isolation spec | Completed |
| SCR-SET-01 Settings hub | `GET /tenant/setup-status` categories | same | `/settings` | settings read | Playwright smoke | Completed |
| SCR-AUD-04 Role matrix | `GET/POST/PATCH/DELETE /roles`, `GET /permissions` | `role`, `role_permission`, `permission` | `/settings/roles` | `read/manage:role:tenant` | Isolation spec | Completed |
| SCR-AUD-05 Security MVP | `GET/PUT /tenant/security-policy` | `tenant_security_policy` | `/settings/security` | `read/manage:security_policy:tenant` | Isolation spec | Completed |
| SCR-AUD-06 Sessions | `GET/DELETE /sessions` | `session` | `/settings/sessions` | `read/revoke:session:tenant` | Isolation spec | Completed |
| SCR-SUB-01/04 Subscription/usage | `GET /tenant/subscription`, `GET /tenant/usage` | subscription + usage snapshot | `/settings/subscription` | `read:subscription:tenant` | Isolation spec | Completed |
| SCR-SUB-03 Upgrade request | `POST/GET /tenant/upgrade-requests` | `tenant_upgrade_request` | `/settings/subscription` (+ history) | `request:upgrade:tenant` | Isolation spec | Completed |
| SCR-AUD-01/02 Audit | `GET /audit-events`, `GET /audit-events/:id` | `audit_event` (JWT tenant filter) | `/audit`, `/audit/[id]` | `read:audit_event:tenant` | Isolation spec | Completed |
| Tenant isolation | All tenant controllers | RLS + JWT `tenantId` | N/A | enforced server-side | Isolation spec | Completed |
| Ops modules (org/people/attendance) | Existing APIs | Existing | Existing routes | Existing | Existing | Already complete |

## Explicitly out of Scope A

Leave, Payroll, Workflows, Notification templates, Integrations/API credentials UI, Custom fields (SCR-SET-02), Platform Admin commercial plan changes.

## Security notes

- Tenant identity is taken from JWT/`CurrentUserContext` only.
- Invitation create rejects body `tenantId` that differs from JWT tenant.
- Response DTOs omit password hashes, refresh tokens, and invitation token hashes.
- Sensitive mutations write `audit_event` rows.
