# Requirement Traceability Matrix

> Source documents: BRD (Business Requirements), PRD (MVP Product Requirements), UX Spec, API & Event Contract Specification, Database ERD, TSA (Technical Solution Architecture).
>
> Status values: 🔴 Not Started · 🟡 Structure Only · 🟢 Complete

---

## How to Read This Matrix

Each module section traces from business requirement down to implementation artefact:

```
Business Requirement (BRD §ref)
  → Product Requirement (PRD §ref)
    → UX Screens (UX Spec §ref)
      → API Endpoints (API Spec)
        → Database Tables (ERD)
          → Backend Folder (apps/api/src/modules/...)
            → Frontend Folder (apps/web/src/modules/...)
              → Implementation Phase
                → Current Status
```

---

## M01 — Platform & Tenant Management

| Layer | Artefact | Source |
|-------|----------|--------|
| **Business Requirement** | BR-PLT-001: Multi-tenant SaaS; each tenant is an isolated unit with its own data, configuration, and subscription | BRD §11.1 |
| **Business Requirement** | BR-PLT-002: Platform superadmin can create, suspend, deactivate tenants without affecting others | BRD §11.1 |
| **Business Requirement** | BR-PLT-003: Tenant data must be isolated at the database row level | BRD §11.1 |
| **Product Requirement** | Tenant onboarding wizard; tenant profile management; subscription linking | PRD §5.1 |
| **UX Screens** | Platform Dashboard · Tenant List · Tenant Create/Edit · Tenant Detail · Tenant Suspend | UX Spec §3 |
| **API Endpoints** | `POST /api/v1/tenants` · `GET /api/v1/tenants` · `GET /api/v1/tenants/:id` · `PATCH /api/v1/tenants/:id` · `POST /api/v1/tenants/:id/suspend` | API Spec §3 |
| **Database Tables** | `tenants` · `tenant_settings` · `tenant_feature_flags` | ERD §2 |
| **Backend Folder** | `apps/api/src/modules/platform/` | TSA Appendix B |
| **Frontend Folder** | `apps/web/src/modules/platform/` | TSA §10 |
| **Implementation Phase** | Phase 2 — Stage 1 Platform Core | TSA §53 |
| **Current Status** | 🟡 Folder structure only |

---

## M02 — Authentication & IAM

| Layer | Artefact | Source |
|-------|----------|--------|
| **Business Requirement** | BR-AUTH-001: Secure login with email+password, TOTP MFA, SSO (Entra ID, Google) | BRD §11.2, §15.1 |
| **Business Requirement** | BR-AUTH-002: JWT-based session management; refresh token rotation | BRD §15.1 |
| **Business Requirement** | BR-AUTH-003: RBAC with role hierarchy: Platform Admin → Tenant Admin → HR Manager → Payroll Manager → Manager → Employee | BRD §11.3 |
| **Business Requirement** | BR-AUTH-004: Permission-level access control (action + resource + scope) | BRD §11.3 |
| **Business Requirement** | BR-AUTH-005: MFA required for payroll approvers and tenant admins | BRD §15.1 |
| **Product Requirement** | Login page · MFA enrollment · SSO redirect · Password reset · RBAC role management | PRD §5.2 |
| **UX Screens** | Login · MFA Setup · SSO Landing · Password Reset · Role List · Permission Matrix | UX Spec §4 |
| **API Endpoints** | `POST /api/v1/auth/login` · `POST /api/v1/auth/refresh` · `POST /api/v1/auth/logout` · `POST /api/v1/auth/mfa/enroll` · `POST /api/v1/auth/mfa/verify` · `GET /api/v1/auth/sso/:provider` · `POST /api/v1/roles` · `GET /api/v1/roles` · `POST /api/v1/permissions` | API Spec §4 |
| **Database Tables** | `users` · `user_sessions` · `roles` · `permissions` · `role_permissions` · `user_roles` · `mfa_credentials` · `sso_connections` | ERD §3 |
| **Backend Folder** | `apps/api/src/modules/authentication/` | TSA Appendix B |
| **Frontend Folder** | `apps/web/src/modules/authentication/` · `apps/web/src/app/(auth)/` | TSA §10 |
| **Implementation Phase** | Phase 2 — Stage 1 Platform Core | TSA §53 |
| **Current Status** | 🟡 Folder structure only |

---

## M03 — Organisation

| Layer | Artefact | Source |
|-------|----------|--------|
| **Business Requirement** | BR-ORG-001: Hierarchical organisation structure — Company → Business Unit → Department → Team → Location | BRD §11.4 |
| **Business Requirement** | BR-ORG-002: Multiple company entities under one tenant | BRD §11.4 |
| **Business Requirement** | BR-ORG-003: Cost centres, positions, grades effective-dated | BRD §11.4, §11.5 |
| **Business Requirement** | BR-ORG-004: Org chart visualisation | BRD §11.4 |
| **Product Requirement** | Org setup wizard · Department management · Position catalogue · Location management · Cost centre mapping | PRD §5.3 |
| **UX Screens** | Org Chart · Company List · Department List/Create/Edit · Position List · Location List · Cost Centre List | UX Spec §5 |
| **API Endpoints** | `POST /api/v1/companies` · `GET /api/v1/companies` · `POST /api/v1/departments` · `GET /api/v1/departments` · `POST /api/v1/positions` · `POST /api/v1/locations` · `POST /api/v1/cost-centres` | API Spec §5 |
| **Database Tables** | `companies` · `business_units` · `departments` · `positions` · `grades` · `locations` · `cost_centres` · `org_nodes` | ERD §4 |
| **Backend Folder** | `apps/api/src/modules/organisation/` | TSA Appendix B |
| **Frontend Folder** | `apps/web/src/modules/organisation/` | TSA §10 |
| **Implementation Phase** | Phase 3 — Stage 2 Org & People | TSA §53 |
| **Current Status** | 🟡 Folder structure only |

---

## M04 — Employee Core HR

| Layer | Artefact | Source |
|-------|----------|--------|
| **Business Requirement** | BR-EMP-001: Employee master record — personal info, contact, emergency contact, employment details | BRD §11.5 |
| **Business Requirement** | BR-EMP-002: Employment lifecycle — hire, contract change, internal transfer, promotion, termination | BRD §11.5 |
| **Business Requirement** | BR-EMP-003: Compensation records — salary, allowances, deductions effective-dated | BRD §11.5 |
| **Business Requirement** | BR-EMP-004: Employee number (auto-generated, configurable format) | BRD §11.5 |
| **Business Requirement** | BR-EMP-005: Employee photo with data classification Confidential | BRD §11.5 |
| **Product Requirement** | Employee profile · Employment history timeline · Compensation history · Document attachments | PRD §5.4 |
| **UX Screens** | Employee List · Employee Profile · Employment History · Compensation History · Termination Flow | UX Spec §6 |
| **API Endpoints** | `POST /api/v1/employees` · `GET /api/v1/employees` · `GET /api/v1/employees/:id` · `PATCH /api/v1/employees/:id` · `POST /api/v1/employees/:id/terminate` · `GET /api/v1/employees/:id/employment-history` · `POST /api/v1/employees/:id/compensation` | API Spec §6 |
| **Database Tables** | `employees` · `employment_records` · `compensation_records` · `employee_documents` · `emergency_contacts` | ERD §5 |
| **Backend Folder** | `apps/api/src/modules/employee/` | TSA Appendix B |
| **Frontend Folder** | `apps/web/src/modules/employee/` | TSA §10 |
| **Implementation Phase** | Phase 3 — Stage 2 Org & People | TSA §53 |
| **Current Status** | 🟡 Folder structure only |

---

## M05 — Onboarding & Documents

| Layer | Artefact | Source |
|-------|----------|--------|
| **Business Requirement** | BR-ONB-001: Structured onboarding checklist per employee type | BRD §11.6 |
| **Business Requirement** | BR-ONB-002: Document upload and management (CNIC, contract, certificates) | BRD §11.6 |
| **Business Requirement** | BR-ONB-003: Document expiry tracking and automated alerts | BRD §11.6 |
| **Business Requirement** | BR-ONB-004: e-signature for employment contracts | BRD §11.6 |
| **Product Requirement** | Onboarding task list · Document vault · Expiry dashboard · e-sign flow | PRD §5.5 |
| **UX Screens** | Onboarding Checklist · Document Upload · Document List · Expiry Alerts | UX Spec §7 |
| **API Endpoints** | `POST /api/v1/onboarding/checklists` · `GET /api/v1/employees/:id/documents` · `POST /api/v1/employees/:id/documents` · `DELETE /api/v1/employees/:id/documents/:docId` | API Spec §7 |
| **Database Tables** | `onboarding_checklists` · `onboarding_tasks` · `employee_documents` · `document_types` | ERD §6 |
| **Backend Folder** | `apps/api/src/modules/onboarding/` | TSA Appendix B |
| **Frontend Folder** | `apps/web/src/modules/onboarding/` | TSA §10 |
| **Implementation Phase** | Phase 3 — Stage 2 Org & People | TSA §53 |
| **Current Status** | 🟡 Folder structure only |

---

## M06 — Attendance

| Layer | Artefact | Source |
|-------|----------|--------|
| **Business Requirement** | BR-ATT-001: Record attendance from biometric devices, web punch, mobile punch, and manual entry | BRD §11.7 |
| **Business Requirement** | BR-ATT-002: Raw attendance events are immutable and append-only | BRD §11.7 |
| **Business Requirement** | BR-ATT-003: Overtime detection and calculation per policy | BRD §11.7 |
| **Business Requirement** | BR-ATT-004: Attendance exceptions raised for policy violations | BRD §11.7 |
| **Business Requirement** | BR-ATT-005: Period lock prevents retroactive corrections without elevated role | BRD §11.7 |
| **Business Requirement** | BR-ATT-006: Attendance API acknowledges within 2 seconds (SLO) | BRD §23 |
| **Product Requirement** | Attendance dashboard · Daily view · Exception list · Period close · Manual correction | PRD §5.6 |
| **UX Screens** | Attendance Dashboard · Daily Register · Exception List · Period Close · Manual Entry | UX Spec §8 |
| **API Endpoints** | `POST /api/v1/attendance/events` · `GET /api/v1/attendance/records` · `GET /api/v1/attendance/exceptions` · `POST /api/v1/attendance/corrections` · `POST /api/v1/attendance/period-lock` | API Spec §8 |
| **Database Tables** | `raw_attendance_events` · `attendance_records` · `attendance_exceptions` · `attendance_periods` · `attendance_corrections` | ERD §7 |
| **Backend Folder** | `apps/api/src/modules/attendance/` | TSA Appendix B |
| **Frontend Folder** | `apps/web/src/modules/attendance/` | TSA §10 |
| **Implementation Phase** | Phase 4 — Stage 3 Attendance & Shifts | TSA §53 |
| **Current Status** | 🟡 Folder structure only |

---

## M07 — Shifts & Rosters

| Layer | Artefact | Source |
|-------|----------|--------|
| **Business Requirement** | BR-SHF-001: Define shift templates (fixed, flexi, rotational) | BRD §11.8 |
| **Business Requirement** | BR-SHF-002: Assign employees to shifts and rosters | BRD §11.8 |
| **Business Requirement** | BR-SHF-003: Shift swap requests between employees | BRD §11.8 |
| **Business Requirement** | BR-SHF-004: Overnight shifts spanning midnight handled correctly | BRD §11.8 |
| **Product Requirement** | Shift template builder · Roster calendar · Shift assignment · Swap request management | PRD §5.7 |
| **UX Screens** | Shift Template List · Roster Calendar · Shift Assignment · Swap Request List | UX Spec §9 |
| **API Endpoints** | `POST /api/v1/shifts` · `GET /api/v1/shifts` · `POST /api/v1/rosters` · `GET /api/v1/rosters` · `POST /api/v1/shift-assignments` · `POST /api/v1/shift-swaps` | API Spec §9 |
| **Database Tables** | `shift_templates` · `rosters` · `shift_assignments` · `shift_swap_requests` | ERD §8 |
| **Backend Folder** | `apps/api/src/modules/shifts/` | TSA Appendix B |
| **Frontend Folder** | `apps/web/src/modules/shifts/` | TSA §10 |
| **Implementation Phase** | Phase 4 — Stage 3 Attendance & Shifts | TSA §53 |
| **Current Status** | 🟡 Folder structure only |

---

## M08 — Leave

| Layer | Artefact | Source |
|-------|----------|--------|
| **Business Requirement** | BR-LVE-001: Configurable leave types per tenant (annual, sick, maternity, etc.) | BRD §11.9 |
| **Business Requirement** | BR-LVE-002: Leave accrual rules (monthly, annual, pro-rated) | BRD §11.9 |
| **Business Requirement** | BR-LVE-003: Leave request → approval workflow | BRD §11.9 |
| **Business Requirement** | BR-LVE-004: Leave balance tracking and carry-forward rules | BRD §11.9 |
| **Business Requirement** | BR-LVE-005: Statutory leave compliance (Pakistan Labour Laws) | BRD §11.9 |
| **Product Requirement** | Leave type configuration · Balance dashboard · Leave request · Approval flow · Carry-forward | PRD §5.8 |
| **UX Screens** | Leave Dashboard · Leave Request · Leave Calendar · Leave Balance · Approval Queue | UX Spec §10 |
| **API Endpoints** | `GET /api/v1/leave/types` · `POST /api/v1/leave/requests` · `GET /api/v1/leave/requests` · `POST /api/v1/leave/requests/:id/approve` · `POST /api/v1/leave/requests/:id/reject` · `GET /api/v1/leave/balances` | API Spec §10 |
| **Database Tables** | `leave_types` · `leave_policies` · `leave_requests` · `leave_balances` · `leave_accruals` · `leave_carry_forward` | ERD §9 |
| **Backend Folder** | `apps/api/src/modules/leave/` | TSA Appendix B |
| **Frontend Folder** | `apps/web/src/modules/leave/` | TSA §10 |
| **Implementation Phase** | Phase 5 — Stage 4 Leave & Workflow | TSA §53 |
| **Current Status** | 🟡 Folder structure only |

---

## M09 — Workflow / Approval Engine

| Layer | Artefact | Source |
|-------|----------|--------|
| **Business Requirement** | BR-WFL-001: Configurable multi-step approval workflows | BRD §11.10 |
| **Business Requirement** | BR-WFL-002: Delegation of approval authority with date range | BRD §11.10 |
| **Business Requirement** | BR-WFL-003: Escalation on timeout | BRD §11.10 |
| **Business Requirement** | BR-WFL-004: Audit trail for every workflow state transition | BRD §11.10 |
| **Product Requirement** | Workflow designer · Approval inbox · Delegation management · Escalation rules | PRD §5.9 |
| **UX Screens** | Workflow Template Builder · Approval Inbox · Delegation Setup · Workflow History | UX Spec §11 |
| **API Endpoints** | `POST /api/v1/workflows` · `GET /api/v1/workflows` · `GET /api/v1/approvals/inbox` · `POST /api/v1/approvals/:id/approve` · `POST /api/v1/approvals/:id/reject` · `POST /api/v1/delegations` | API Spec §11 |
| **Database Tables** | `workflow_definitions` · `workflow_steps` · `workflow_instances` · `workflow_transitions` · `approval_tasks` · `delegations` | ERD §10 |
| **Backend Folder** | `apps/api/src/modules/workflow/` | TSA Appendix B |
| **Frontend Folder** | `apps/web/src/modules/workflow/` | TSA §10 |
| **Implementation Phase** | Phase 5 — Stage 4 Leave & Workflow | TSA §53 |
| **Current Status** | 🟡 Folder structure only |

---

## M10 — Payroll

| Layer | Artefact | Source |
|-------|----------|--------|
| **Business Requirement** | BR-PAY-001: Payroll calendar (monthly, bi-monthly) | BRD §11.11 |
| **Business Requirement** | BR-PAY-002: Immutable input snapshot at run time | BRD §11.11 |
| **Business Requirement** | BR-PAY-003: Formula engine with versioned formula packs | BRD §11.11 |
| **Business Requirement** | BR-PAY-004: Pakistan statutory deductions (EOBI, SESSI, Income Tax) | BRD §11.11 |
| **Business Requirement** | BR-PAY-005: MFA-gated payroll approval; SoD — preparer ≠ approver | BRD §11.11 |
| **Business Requirement** | BR-PAY-006: Immutable lock after approval; version-stamped | BRD §11.11 |
| **Business Requirement** | BR-PAY-007: Protected PDF payslips with access link | BRD §11.11 |
| **Business Requirement** | BR-PAY-008: Bank file export and tax file export | BRD §11.11 |
| **Business Requirement** | BR-PAY-009: Variance analysis vs prior period | BRD §11.11 |
| **Business Requirement** | BR-PAY-010: `numeric(19,4)` — no floating-point arithmetic | BRD §11.11, TSA §17 |
| **Product Requirement** | Payroll run management · Calculation review · Variance dashboard · Approval flow · Payslip delivery · Export | PRD §5.10 |
| **UX Screens** | Payroll Calendar · Run List · Run Detail · Variance Report · Approval Screen (MFA) · Payslip List | UX Spec §12 |
| **API Endpoints** | `POST /api/v1/payroll/runs` · `GET /api/v1/payroll/runs` · `GET /api/v1/payroll/runs/:id` · `POST /api/v1/payroll/runs/:id/calculate` · `GET /api/v1/payroll/runs/:id/variance` · `POST /api/v1/payroll/runs/:id/approve` · `GET /api/v1/payroll/payslips/:id` · `POST /api/v1/payroll/runs/:id/export` | API Spec §12 |
| **Database Tables** | `payroll_calendars` · `payroll_runs` · `payroll_run_inputs` · `payroll_line_items` · `payroll_deductions` · `payroll_approvals` · `payslips` · `payroll_exports` | ERD §11 |
| **Backend Folder** | `apps/api/src/modules/payroll/` | TSA Appendix B |
| **Frontend Folder** | `apps/web/src/modules/payroll/` | TSA §10 |
| **Implementation Phase** | Phase 6 — Stage 5 Payroll | TSA §53 |
| **Current Status** | 🟡 Folder structure only |

---

## M11 — ESS (Employee Self-Service)

| Layer | Artefact | Source |
|-------|----------|--------|
| **Business Requirement** | BR-ESS-001: Employee views own attendance, leave balances, payslips | BRD §11.12 |
| **Business Requirement** | BR-ESS-002: Employee submits leave requests and tracks status | BRD §11.12 |
| **Business Requirement** | BR-ESS-003: Employee updates personal contact information | BRD §11.12 |
| **Business Requirement** | BR-ESS-004: Employee downloads own payslips | BRD §11.12 |
| **Product Requirement** | My Dashboard · My Attendance · My Leave · My Payslips · My Profile | PRD §5.11 |
| **UX Screens** | ESS Dashboard · Attendance History · Leave History · Payslip List · Profile Edit | UX Spec §13 |
| **API Endpoints** | `GET /api/v1/me/attendance` · `GET /api/v1/me/leave` · `GET /api/v1/me/payslips` · `GET /api/v1/me/profile` · `PATCH /api/v1/me/profile` | API Spec §13 |
| **Database Tables** | (reads from employees, attendance_records, leave_requests, payslips — no ESS-specific tables) | ERD §12 |
| **Backend Folder** | `apps/api/src/modules/ess/` | TSA Appendix B |
| **Frontend Folder** | `apps/web/src/modules/ess/` · `apps/web/src/app/(employee)/` | TSA §10 |
| **Implementation Phase** | Phase 7 — Stage 6 Self-Service & Reporting | TSA §53 |
| **Current Status** | 🟡 Folder structure only |

---

## M12 — MSS (Manager Self-Service)

| Layer | Artefact | Source |
|-------|----------|--------|
| **Business Requirement** | BR-MSS-001: Manager views team attendance, leave, and approvals | BRD §11.13 |
| **Business Requirement** | BR-MSS-002: Manager approves/rejects leave and workflow tasks | BRD §11.13 |
| **Business Requirement** | BR-MSS-003: Manager initiates HR actions (transfer requests, etc.) | BRD §11.13 |
| **Product Requirement** | Team Dashboard · Team Attendance · Approval Queue · HR Action Requests | PRD §5.12 |
| **UX Screens** | MSS Dashboard · Team Attendance · Approval Queue · Team Leave Calendar | UX Spec §14 |
| **API Endpoints** | `GET /api/v1/team/attendance` · `GET /api/v1/team/leave` · `GET /api/v1/team/approvals` · `POST /api/v1/team/hr-actions` | API Spec §14 |
| **Database Tables** | (reads from attendance_records, leave_requests, workflow_instances — no MSS-specific tables) | ERD §13 |
| **Backend Folder** | `apps/api/src/modules/mss/` | TSA Appendix B |
| **Frontend Folder** | `apps/web/src/modules/mss/` · `apps/web/src/app/(tenant)/mss/` | TSA §10 |
| **Implementation Phase** | Phase 7 — Stage 6 Self-Service & Reporting | TSA §53 |
| **Current Status** | 🟡 Folder structure only |

---

## M13 — Notifications

| Layer | Artefact | Source |
|-------|----------|--------|
| **Business Requirement** | BR-NTF-001: Multi-channel notifications — in-app, email, SMS, push | BRD §11.14 |
| **Business Requirement** | BR-NTF-002: Template-based notification content (localised EN + UR) | BRD §11.14 |
| **Business Requirement** | BR-NTF-003: User notification preferences (opt-in/opt-out per channel) | BRD §11.14 |
| **Business Requirement** | BR-NTF-004: Notification delivery audit (sent, delivered, failed) | BRD §11.14 |
| **Product Requirement** | Notification centre · Template management · User preferences · Delivery log | PRD §5.13 |
| **UX Screens** | Notification Bell · Notification List · Notification Settings · Admin Template Editor | UX Spec §15 |
| **API Endpoints** | `GET /api/v1/notifications` · `PATCH /api/v1/notifications/:id/read` · `GET /api/v1/notification-templates` · `POST /api/v1/notification-templates` · `GET /api/v1/notification-preferences` · `PATCH /api/v1/notification-preferences` | API Spec §15 |
| **Database Tables** | `notifications` · `notification_templates` · `notification_preferences` · `notification_deliveries` | ERD §14 |
| **Backend Folder** | `apps/api/src/modules/notifications/` | TSA Appendix B |
| **Frontend Folder** | `apps/web/src/modules/notifications/` | TSA §10 |
| **Implementation Phase** | Phase 7 — Stage 6 Self-Service & Reporting | TSA §53 |
| **Current Status** | 🟡 Folder structure only |

---

## M14 — Reports & Dashboards

| Layer | Artefact | Source |
|-------|----------|--------|
| **Business Requirement** | BR-RPT-001: Attendance summary, exception, overtime reports | BRD §11.15 |
| **Business Requirement** | BR-RPT-002: Payroll summary and statutory reports | BRD §11.15 |
| **Business Requirement** | BR-RPT-003: Leave utilisation and balance reports | BRD §11.15 |
| **Business Requirement** | BR-RPT-004: Headcount and turnover reports | BRD §11.15 |
| **Business Requirement** | BR-RPT-005: Export to Excel, CSV, PDF | BRD §11.15 |
| **Product Requirement** | Analytics dashboard · Report builder · Scheduled exports | PRD §5.14 |
| **UX Screens** | Reports Hub · Attendance Reports · Payroll Reports · Leave Reports · HR Reports · Export Queue | UX Spec §16 |
| **API Endpoints** | `GET /api/v1/reports/attendance` · `GET /api/v1/reports/payroll` · `GET /api/v1/reports/leave` · `GET /api/v1/reports/headcount` · `POST /api/v1/reports/exports` · `GET /api/v1/reports/exports/:id` | API Spec §16 |
| **Database Tables** | `report_definitions` · `report_schedules` · `report_exports` | ERD §15 |
| **Backend Folder** | `apps/api/src/modules/reports/` | TSA Appendix B |
| **Frontend Folder** | `apps/web/src/modules/reports/` | TSA §10 |
| **Implementation Phase** | Phase 7 — Stage 6 Self-Service & Reporting | TSA §53 |
| **Current Status** | 🟡 Folder structure only |

---

## M15 — Integrations

| Layer | Artefact | Source |
|-------|----------|--------|
| **Business Requirement** | BR-INT-001: Biometric device integration (ZKTeco protocol) | BRD §11.20 |
| **Business Requirement** | BR-INT-002: Entra ID and Google Workspace SSO | BRD §11.20 |
| **Business Requirement** | BR-INT-003: ERP/accounting system data export (GL entries) | BRD §11.20 |
| **Business Requirement** | BR-INT-004: Bank file generation for salary disbursement | BRD §11.20 |
| **Business Requirement** | BR-INT-005: HMAC-SHA256 signed webhooks for outbound events | BRD §11.20 |
| **Product Requirement** | Integration marketplace · Connector configuration · Webhook management · Sync logs | PRD §5.15 |
| **UX Screens** | Integration List · Connector Setup · Webhook Config · Sync Log | UX Spec §17 |
| **API Endpoints** | `GET /api/v1/integrations` · `POST /api/v1/integrations` · `GET /api/v1/integrations/:id/logs` · `POST /api/v1/webhooks` · `GET /api/v1/webhooks` | API Spec §17 |
| **Database Tables** | `integrations` · `integration_credentials` · `integration_sync_logs` · `webhooks` · `webhook_deliveries` | ERD §16 |
| **Backend Folder** | `apps/api/src/modules/integrations/` | TSA Appendix B |
| **Frontend Folder** | `apps/web/src/modules/integrations/` | TSA §10 |
| **Implementation Phase** | Phase 8 — Stage 7 Integrations | TSA §53 |
| **Current Status** | 🟡 Folder structure only |

---

## M16 — Subscriptions & Entitlements

| Layer | Artefact | Source |
|-------|----------|--------|
| **Business Requirement** | BR-SUB-001: Subscription tiers (Starter / Growth / Enterprise) | BRD §11.21 |
| **Business Requirement** | BR-SUB-002: Feature entitlement checks per subscription tier | BRD §11.21 |
| **Business Requirement** | BR-SUB-003: Subscription billing cycle and seat count limits | BRD §11.21 |
| **Business Requirement** | BR-SUB-004: Trial period management | BRD §11.21 |
| **Product Requirement** | Subscription plan page · Entitlement management · Usage dashboard · Upgrade flow | PRD §5.16 |
| **UX Screens** | Plan Selection · Current Plan · Usage Limits · Billing History | UX Spec §18 |
| **API Endpoints** | `GET /api/v1/subscriptions` · `POST /api/v1/subscriptions` · `PATCH /api/v1/subscriptions/:id` · `GET /api/v1/entitlements/check` | API Spec §18 |
| **Database Tables** | `subscription_plans` · `tenant_subscriptions` · `entitlements` · `plan_features` · `usage_records` | ERD §17 |
| **Backend Folder** | `apps/api/src/modules/subscriptions/` | TSA Appendix B |
| **Frontend Folder** | `apps/web/src/modules/subscriptions/` | TSA §10 |
| **Implementation Phase** | Phase 2 — Stage 1 Platform Core | TSA §53 |
| **Current Status** | 🟡 Folder structure only |

---

## M17 — Audit & Compliance

| Layer | Artefact | Source |
|-------|----------|--------|
| **Business Requirement** | BR-AUD-001: Append-only audit log for all Restricted/Secret mutations | BRD §11.22 |
| **Business Requirement** | BR-AUD-002: Audit log includes: actor, action, resource, before/after, timestamp, IP, tenant | BRD §11.22 |
| **Business Requirement** | BR-AUD-003: Audit log searchable by date, actor, resource type | BRD §11.22 |
| **Business Requirement** | BR-AUD-004: Audit log export for regulatory authorities | BRD §11.22 |
| **Business Requirement** | BR-AUD-005: Audit log immutability verified (hash chain or equivalent) | BRD §11.22 |
| **Product Requirement** | Audit log viewer · Filtered search · Export · Integrity check | PRD §5.17 |
| **UX Screens** | Audit Log List · Audit Detail · Audit Export | UX Spec §19 |
| **API Endpoints** | `GET /api/v1/audit-logs` · `GET /api/v1/audit-logs/:id` · `POST /api/v1/audit-logs/export` | API Spec §19 |
| **Database Tables** | `audit_logs` (append-only, no UPDATE/DELETE RLS policy) | ERD §18 |
| **Backend Folder** | `apps/api/src/modules/audit/` | TSA Appendix B |
| **Frontend Folder** | `apps/web/src/modules/audit/` | TSA §10 |
| **Implementation Phase** | Phase 2 — Stage 1 Platform Core (Audit Interceptor); Phase 9 — Audit UI | TSA §53 |
| **Current Status** | 🟡 Folder structure only |

---

## Cross-Cutting Concerns Traceability

| Concern | Business Requirement | Implementation Artefact | Phase | Status |
|---------|---------------------|------------------------|-------|--------|
| Tenant Isolation | BR-PLT-003, TSA ADR-002 | PostgreSQL RLS policies + SET LOCAL + JWT tenant_id claim | Phase 2 | 🔴 Not Started |
| Transactional Outbox | TSA ADR-004 | `outbox_events` table + Outbox Relay Worker | Phase 2 | 🔴 Not Started |
| Audit Interceptor | BR-AUD-001, TSA §31 | NestJS `AuditInterceptor` applied globally on Restricted/Secret routes | Phase 2 | 🔴 Not Started |
| Rate Limiting | TSA §32, §35 | Redis counter per `(tenant_id, token)` | Phase 2 | 🔴 Not Started |
| OpenTelemetry | TSA ADR-008 | OTel SDK on API + Workers; traces, metrics, logs | Phase 2 | 🔴 Not Started |
| Idempotency | TSA §20, API Spec | `Idempotency-Key` header; `idempotency_keys` table | Phase 2 | 🔴 Not Started |
| ETag / Optimistic Lock | TSA §20 | ETag response header; `If-Match` request header on mutations | Phase 3 | 🔴 Not Started |
| Money Precision | BR-PAY-010, TSA §17 | `numeric(19,4)` on all monetary columns; Decimal.js in application layer | Phase 3 | 🔴 Not Started |
| Effective-dating | TSA §17 | `valid_from`/`valid_to` + `btree_gist` exclusion constraints | Phase 3 | 🔴 Not Started |
| RTL / i18n | BRD §15.7 | `next-intl` + ICU MessageFormat; `dir` HTML attribute; Noto Sans Arabic | Phase 3 | 🔴 Not Started |
| MFA Payroll Gate | BR-PAY-005 | TOTP/OTP second factor enforced on payroll approval endpoint | Phase 6 | 🔴 Not Started |
| SoD Enforcement | BR-PAY-005 | Preparer ≠ Approver check in payroll approval service | Phase 6 | 🔴 Not Started |
| Period Lock | BR-ATT-005 | `attendance_periods.locked_at`; elevated role check before correction | Phase 4 | 🔴 Not Started |
| HMAC Webhook Signing | BR-INT-005, TSA §20 | HMAC-SHA256 with per-integration secret; `X-Signature-256` header | Phase 8 | 🔴 Not Started |

---

## Acceptance Criteria Traceability (TSA §55)

| AC# | Acceptance Criterion | Module | Database | Status |
|-----|---------------------|--------|----------|--------|
| AC-1 | JWT tenant claim is verified on every request | M02 | — | 🔴 |
| AC-2 | RBAC guard blocks actions not permitted by role | M02 | roles, permissions | 🔴 |
| AC-3 | SET LOCAL isolates every database transaction to one tenant | M01, M02 | — (session var) | 🔴 |
| AC-4 | RLS rejects cross-tenant data access even with valid JWT | M01 | RLS policies | 🔴 |
| AC-5 | PostgreSQL RLS is enabled and tested for all tenant-owned tables | M01 | All tenant tables | 🔴 |
| AC-6 | Attendance event acknowledged within 2 seconds p95 | M06 | raw_attendance_events | 🔴 |
| AC-7 | Payroll run produces identical result given identical inputs | M10 | payroll_runs | 🔴 |
| AC-8 | Payroll approval requires MFA and SoD | M10 | payroll_approvals | 🔴 |
| AC-9 | Audit log captures all Restricted/Secret mutations | M17 | audit_logs | 🔴 |
| AC-10 | All API endpoints return ETag; mutations require If-Match | All | — | 🔴 |
| AC-11 | Tenant isolation test suite passes with zero cross-tenant leakage | M01, M02 | — | 🔴 |
| AC-12 | Payroll regression suite passes for all statutory deduction scenarios | M10 | — | 🔴 |
