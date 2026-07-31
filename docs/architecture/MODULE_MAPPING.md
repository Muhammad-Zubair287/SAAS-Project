# Module Mapping

> Every field is sourced from the specification documents. Where a field is not explicitly documented, it is marked "Not explicitly documented."
>
> Sources:
> - **BRD** — Business Requirements Document
> - **PRD** — MVP Product Requirements Document
> - **UX** — UX Specification
> - **API** — API & Event Contract Specification
> - **ERD** — Detailed Database ERD and Data Dictionary
> - **TSA** — MVP Technical Solution Architecture

---

## M01 — Platform & Tenant Management

| Field | Value | Source |
|-------|-------|--------|
| **Module Number** | M01 | PRD |
| **Module Name** | Platform & Tenant Management | PRD, TSA |
| **Purpose** | Tenant lifecycle, subscription plans, feature flags, entitlements, regional configuration, branding, and platform-level administration | BRD §11.1, TSA §9 |
| **Business Description** | Enables the Workforce Cloud OS operator to provision and manage customer tenants. Controls what each tenant can do (plans, seats, module entitlements, storage limits). Provides multi-tenancy isolation at the business layer. | BRD §11.1 (BR-TEN-001 to BR-TEN-005), BRD §17 |
| **Backend Folder** | `apps/api/src/modules/platform` | TSA Appendix B, TSA §11 |
| **Frontend Folder** | `apps/web/src/modules/platform` + `apps/web/src/app/(platform)/` | TSA §10 |
| **Primary Database Tables** | `tenant`, `tenant_region`, `plan`, `entitlement`, `usage_limit`, `feature_flag`, `tenant_branding` | TSA §17, ERD |
| **Primary APIs** | API-TEN-001 Create Tenant; tenant lifecycle endpoints; plan/entitlement management; feature flag APIs | API Spec |
| **Primary Screens** | SCR-PLT-01 to SCR-PLT-06 (Platform admin dashboard, tenant list, tenant detail, plan management, feature flags, usage metrics) | UX Spec |
| **Primary User Roles** | Platform Super Admin, Platform Support Engineer, Platform Auditor | BRD §9.1, TSA §14 |
| **Dependencies** | None (foundational module) | TSA §9 |
| **Future Dependent Modules** | All modules — every module depends on tenant context | TSA §9 |
| **Events Published** | `TenantActivated.v1`, `PlanChanged.v1`, `TenantSuspended.v1` | TSA §9, API Spec |

---

## M02 — Authentication, Identity & Access

| Field | Value | Source |
|-------|-------|--------|
| **Module Number** | M02 | PRD |
| **Module Name** | Authentication, Identity & Access | PRD, TSA |
| **Purpose** | User identity, authentication (password/OTP/SSO), MFA, sessions, RBAC, delegations, break-glass impersonation | BRD §11.3 (implicit), TSA §14, TSA §15 |
| **Business Description** | Provides the authentication and authorisation backbone. Every user interaction starts here. Manages credentials, sessions, SSO links, role assignments and security controls including MFA enforcement. | BRD §15.1, TSA §14 |
| **Backend Folder** | `apps/api/src/modules/authentication` | Current structure (maps to TSA "identity" module) |
| **Frontend Folder** | `apps/web/src/modules/authentication` + `apps/web/src/app/(auth)/` (to be added) | TSA §10 |
| **Primary Database Tables** | `user`, `identity_link`, `session`, `role`, `permission`, `role_assignment`, `api_client`, `support_grant` | TSA §17, ERD |
| **Primary APIs** | Login, logout, refresh token, MFA enrol/verify, SSO redirect, invite user (API-IAM-002), role assignment, permission check | API Spec |
| **Primary Screens** | SCR-AUTH-01 to SCR-AUTH-06 (Login, MFA, SSO, password reset, invitation accept, session management) | UX Spec |
| **Primary User Roles** | All roles (authentication is universal); Platform Super Admin manages SSO configs | BRD §9 |
| **Dependencies** | M01 (tenant context required before user authentication) | TSA §14 |
| **Future Dependent Modules** | All modules (auth token required for every API call) | TSA §14 |
| **Events Published** | `UserActivated.v1`, `RoleChanged.v1`, `UserDeactivated.v1` | TSA §9, API Spec |

---

## M03 — Organisation Structure

| Field | Value | Source |
|-------|-------|--------|
| **Module Number** | M03 | PRD |
| **Module Name** | Organisation Structure | PRD, TSA |
| **Purpose** | Legal entities, branches/locations, departments, cost centres, positions, grades, and effective-dated organisational hierarchies | BRD §11.2 (BR-ORG-001 to BR-ORG-005), TSA §9 |
| **Business Description** | Provides the organisational skeleton onto which employees, attendance, payroll and reporting are mapped. All data is effective-dated so historical reporting remains accurate through restructuring. | BRD §11.2 |
| **Backend Folder** | `apps/api/src/modules/organisation` | TSA §11 |
| **Frontend Folder** | `apps/web/src/modules/organisation` + `apps/web/src/app/(tenant)/organisation/` | TSA §10 |
| **Primary Database Tables** | `legal_entity`, `location`, `department`, `position`, `grade`, `cost_centre`, `reporting_assignment` | TSA §17, ERD |
| **Primary APIs** | CRUD for legal entities, departments, branches, positions, grades; effective-date management | API Spec |
| **Primary Screens** | SCR-ORG-01 to SCR-ORG-08 (org chart, legal entity setup, department management, branch management, position library, grade structure, cost centres) | UX Spec |
| **Primary User Roles** | Tenant Owner/Admin, HR Manager | BRD §9.2, §9.3 |
| **Dependencies** | M01 (tenant context), M02 (auth) | TSA |
| **Future Dependent Modules** | M04 (employees assigned to org units), M06 (attendance geofence tied to location), M07 (shifts tied to department/location), M10 (payroll by legal entity), M14 (reports by org dimension) | TSA §9 |
| **Events Published** | Not explicitly documented (org changes use effective-dating, not events) | TSA §9 |

---

## M04 — Employee Core HR

| Field | Value | Source |
|-------|-------|--------|
| **Module Number** | M04 | PRD |
| **Module Name** | Employee Core HR | PRD, TSA |
| **Purpose** | Employee profiles, employment contracts, compensation records, personal/bank/tax data, transfers, status lifecycle, bulk import | BRD §11.3, TSA §9 ("Organisation and People" domain) |
| **Business Description** | The system of record for employee data. Every downstream module (attendance, leave, payroll) consumes employee records from this module. Supports the full employee lifecycle from pre-boarding to exit. | BRD §11.3 (BR-EMP-001 to BR-EMP-006), BRD §12.2, §12.6 |
| **Backend Folder** | `apps/api/src/modules/employee` | Current structure (TSA names this within "organisation" and "people" domains) |
| **Frontend Folder** | `apps/web/src/modules/employee` + `apps/web/src/app/(tenant)/employees/` | TSA §10 |
| **Primary Database Tables** | `employee`, `employment`, `contact`, `bank_account`, `identifier`, `custom_field_value`, `employee_status_history` | TSA §17, ERD |
| **Primary APIs** | API-PEO-003 Create Employee; API-PEO-004 Schedule Transfer; employee CRUD; bulk import; employment history | API Spec |
| **Primary Screens** | SCR-EMP-01 to SCR-EMP-10 (employee directory, employee profile, employment details, compensation, bank details, documents, history, transfer, status change, bulk import) | UX Spec |
| **Primary User Roles** | HR Manager/HR Ops, Payroll Manager (comp data), Employee (read own), Tenant Admin | BRD §9.2–9.4 |
| **Dependencies** | M01, M02, M03 (organisation structure for assignments) | TSA |
| **Future Dependent Modules** | M05 (onboarding links to employee), M06 (attendance tied to employee), M07 (shifts assigned to employee), M08 (leave entitlement from employee), M10 (payroll driven by employee comp records), M11 (ESS profile) | TSA §9 |
| **Events Published** | `EmployeeCreated.v1`, `EmployeeActivated.v1`, `EmployeeTransferred.v1`, `EmployeeExited.v1` | TSA §9, API Spec |

---

## M05 — Onboarding & Documents

| Field | Value | Source |
|-------|-------|--------|
| **Module Number** | M05 | PRD |
| **Module Name** | Onboarding & Documents | PRD, TSA |
| **Purpose** | Onboarding journey templates, task checklists, document requests, e-sign hooks, document storage, classification, expiry alerts | BRD §11.4, TSA §9 ("Documents" domain) |
| **Business Description** | Automates the new-hire experience from offer acceptance to first-day readiness. Tracks completion of mandatory tasks (document submission, policy acknowledgement, bank details). Manages the full document lifecycle including upload, classification, malware scanning, versioning, retention, and access. | BRD §11.4 (BR-ONB-001 to BR-ONB-004), BRD §11.3 (BR-EMP-003), TSA §28 |
| **Backend Folder** | `apps/api/src/modules/onboarding` and `apps/api/src/modules/documents` | TSA §9 |
| **Frontend Folder** | `apps/web/src/modules/onboarding` + `apps/web/src/modules/documents` | TSA §10 |
| **Primary Database Tables** | `onboarding_template`, `onboarding_task`, `employee_task`, `policy_acknowledgement`, `document`, `document_version`, `file_object`, `document_access`, `retention_rule` | TSA §17, ERD |
| **Primary APIs** | API-DOC-005 Upload Session; document CRUD; onboarding template management; task assignment; completion tracking | API Spec |
| **Primary Screens** | SCR-ONB-01 to SCR-ONB-05; SCR-DOC-01 to SCR-DOC-03 | UX Spec |
| **Primary User Roles** | HR Manager, Employee (for own onboarding tasks), Manager (for assigned tasks) | BRD §9.3, §9.7 |
| **Dependencies** | M01, M02, M04 (employee required), M09 (approval workflow for document requests) | TSA |
| **Future Dependent Modules** | M11 (ESS document access), M17 (audit of document access) | TSA |
| **Events Published** | `DocumentUploaded.v1`, `DocumentApproved.v1`, `DocumentExpired.v1` | TSA §9, API Spec |

---

## M06 — Attendance

| Field | Value | Source |
|-------|-------|--------|
| **Module Number** | M06 | PRD |
| **Module Name** | Attendance | PRD, TSA |
| **Purpose** | Raw event ingestion (biometric/web/mobile), geofencing, IP/subnet checks, normalisation, day calculation, exception detection, corrections, period locks | BRD §11.5, TSA §9 (Attendance and Shifts domain), TSA §22 |
| **Business Description** | The highest-volume module. Receives raw check-in/out events from multiple sources, maps them to employees and shifts, calculates attendance status, creates exceptions for policy violations, supports a correction workflow, and locks periods for payroll. Raw events are immutable — corrections always create new records. | BRD §11.5 (BR-ATT-001 to BR-ATT-009), TSA §22 |
| **Backend Folder** | `apps/api/src/modules/attendance` | TSA §11, TSA §9 |
| **Frontend Folder** | `apps/web/src/modules/attendance` + `apps/web/src/app/(tenant)/attendance/` | TSA §10 |
| **Primary Database Tables** | `shift`, `shift_assignment`, `raw_attendance_event`, `attendance_day`, `attendance_exception`, `correction_request`, `period_lock` | TSA §17, ERD |
| **Primary APIs** | API-ATT-006 Ingest Event; API-ATT-007 Submit Correction; API-ATT-008 Lock Period; exception management; attendance day queries | API Spec |
| **Primary Screens** | SCR-ATT-01 to SCR-ATT-12 (attendance dashboard, daily log, exception list, correction form, period management, device management, geofence config, attendance calendar, correction detail, approval queue) | UX Spec |
| **Primary User Roles** | Attendance/Time Officer, HR Manager, Manager (team view), Employee (ESS view) | BRD §9.3, §9.6, §9.7 |
| **Dependencies** | M01, M02, M04 (employee), M03 (branch/location for geofence), M07 (shift definitions), M09 (correction approval workflow) | TSA §22 |
| **Future Dependent Modules** | M10 (payroll consumes locked attendance), M11 (ESS attendance view), M12 (MSS team attendance), M14 (attendance reports) | TSA §9 |
| **Events Published** | `AttendanceCalculated.v1`, `AttendanceCorrected.v1`, `AttendancePeriodLocked.v1`, `AttendanceExceptionRaised.v1` | TSA §9, API Spec |
| **SLO** | Ingest acknowledgement within 2 seconds (p95); normalisation within 5 minutes | TSA §42 |

---

## M07 — Shifts & Rosters

| Field | Value | Source |
|-------|-------|--------|
| **Module Number** | M07 | PRD |
| **Module Name** | Shifts & Rosters | PRD, TSA |
| **Purpose** | Shift definitions, rotation patterns, roster publishing, roster viewing, shift swaps, coverage management | BRD §11.6 (BR-SHF-001 to BR-SHF-005), TSA §9 |
| **Business Description** | Enables HR and managers to define work schedules and publish rosters. Shift templates capture working hours, break rules, overtime rules, and grace periods. Rotation patterns handle shift cycles. Employees view upcoming rosters. | BRD §11.6 |
| **Backend Folder** | `apps/api/src/modules/shifts` | TSA §9 (part of Attendance and Shifts domain) |
| **Frontend Folder** | `apps/web/src/modules/shifts` + `apps/web/src/app/(tenant)/shifts/` | TSA §10 |
| **Primary Database Tables** | `shift`, `shift_assignment` (shared with M06), plus roster-specific tables | TSA §17, ERD |
| **Primary APIs** | Shift CRUD, roster publish/view, shift assignment, rotation pattern management | API Spec |
| **Primary Screens** | SCR-SHF-01 to SCR-SHF-05 (shift library, roster calendar, shift assignment, rotation builder, shift swap) | UX Spec |
| **Primary User Roles** | HR Manager, Attendance Officer, Manager (team roster), Employee (view own roster) | BRD §9.3, §9.6, §9.7 |
| **Dependencies** | M01, M02, M03 (department/location), M04 (employees to assign) | TSA |
| **Future Dependent Modules** | M06 (attendance validated against shifts), M08 (leave coverage checks), M12 (MSS schedule view) | TSA |
| **Events Published** | Not explicitly documented in TSA §9 (roster events implicit) | TSA |

---

## M08 — Leave

| Field | Value | Source |
|-------|-------|--------|
| **Module Number** | M08 | PRD |
| **Module Name** | Leave | PRD, TSA |
| **Purpose** | Leave type configuration, policy accruals, holiday calendars, balance ledger, leave requests, approvals, cancellations, payroll impact, encashment | BRD §11.7, TSA §9, TSA §23 |
| **Business Description** | Manages the complete leave lifecycle using a ledger model. Balances are computed from grants, accruals, reservations, approvals, cancellations, adjustments and expiries. Policy resolution uses employee type, grade, legal entity, and effective date. Approved leave triggers payroll impact events. | BRD §11.7 (BR-LVE-001 to BR-LVE-007), TSA §23 |
| **Backend Folder** | `apps/api/src/modules/leave` | TSA §11 |
| **Frontend Folder** | `apps/web/src/modules/leave` + `apps/web/src/app/(tenant)/leave/` | TSA §10 |
| **Primary Database Tables** | `leave_type`, `leave_policy`, `leave_ledger`, `leave_request`, `leave_adjustment`, `holiday_calendar` | TSA §17, ERD |
| **Primary APIs** | API-LVE-009 Submit Leave; leave type/policy CRUD; balance queries; cancellation; encashment; calendar | API Spec |
| **Primary Screens** | SCR-LVE-01 to SCR-LVE-10 (leave dashboard, apply leave, leave calendar, balance summary, approval queue, policy management, holiday calendar, cancellation, encashment, leave history) | UX Spec |
| **Primary User Roles** | Employee (apply), Manager (approve team leave), HR Manager (policy config, admin), Payroll Manager (impact on payroll) | BRD §9.3, §9.4, §9.6, §9.7 |
| **Dependencies** | M01, M02, M04 (employee), M07 (shift coverage checks), M09 (approval workflow) | TSA §23 |
| **Future Dependent Modules** | M10 (payroll impact), M11 (ESS leave), M12 (MSS team calendar), M14 (leave reports) | TSA |
| **Events Published** | `LeaveSubmitted.v1`, `LeaveApproved.v1`, `LeaveCancelled.v1` | TSA §9, API Spec |

---

## M09 — Workflow / Approval Engine

| Field | Value | Source |
|-------|-------|--------|
| **Module Number** | M09 | PRD |
| **Module Name** | Workflow / Approval Engine | PRD, TSA |
| **Purpose** | Reusable approval engine for all workflow needs: sequential/parallel approvals, delegations, escalations, SoD checks, MFA-gated actions | BRD §11.8, TSA §24 |
| **Business Description** | A shared infrastructure module consumed by all other modules requiring approvals. Defines versioned workflow definitions with stages, SLAs, and escalation rules. Approval instances are bound to the definition version selected at submission, so later policy changes don't alter in-flight requests. | BRD §11.8 (BR-WFL-001 to BR-WFL-006), TSA §24 |
| **Backend Folder** | `apps/api/src/modules/workflow` | TSA §11 |
| **Frontend Folder** | `apps/web/src/modules/workflow` + `apps/web/src/app/(tenant)/approvals/` | TSA §10 |
| **Primary Database Tables** | `workflow_definition`, `workflow_version`, `workflow_instance`, `approval_step`, `delegation`, `escalation` | TSA §17, ERD |
| **Primary APIs** | API-WFL-010 Act on Approval; workflow definition CRUD; instance queries; delegation management; escalation rules | API Spec |
| **Primary Screens** | SCR-WFL-01 to SCR-WFL-06 (approval queue, approval detail, workflow builder, delegation setup, escalation config, approval history) | UX Spec |
| **Primary User Roles** | All roles with approval responsibilities (Manager, HR, Payroll, Tenant Admin) | BRD §9 |
| **Dependencies** | M01, M02 (RBAC for approver resolution) | TSA §24 |
| **Future Dependent Modules** | M05, M06, M08, M10 (all consume approval events) | TSA §24 |
| **Events Published** | `ApprovalAssigned.v1`, `ApprovalCompleted.v1`, `ApprovalEscalated.v1` | TSA §9, API Spec |

---

## M10 — Payroll

| Field | Value | Source |
|-------|-------|--------|
| **Module Number** | M10 | PRD |
| **Module Name** | Payroll | PRD, TSA |
| **Purpose** | Payroll calendars, salary structures, formula packs, immutable input snapshots, versioned calculation runs, variance analysis, MFA-gated approval, payslip generation, bank/tax exports | BRD §11.9, TSA §25, TSA §26 |
| **Business Description** | The highest-risk module. Every payroll run produces an immutable versioned snapshot of inputs (people, contracts, comp, attendance, leave, formulas). Calculation is deterministic using fixed-precision arithmetic. Approval requires MFA + SoD. Only locked runs produce payslips and statutory exports. Re-runs create new versions without deleting prior ones. | BRD §11.9 (BR-PAY-001 to BR-PAY-011), TSA §25–26 |
| **Backend Folder** | `apps/api/src/modules/payroll` | TSA §11 |
| **Frontend Folder** | `apps/web/src/modules/payroll` + `apps/web/src/app/(tenant)/payroll/` | TSA §10 |
| **Primary Database Tables** | `payroll_group`, `salary_component`, `salary_structure`, `payroll_period`, `payroll_run`, `payroll_version`, `payroll_line`, `adjustment`, `payslip`, `export` | TSA §17, ERD |
| **Primary APIs** | Create payroll run, snapshot inputs, calculate, validate, variance analysis, approve (MFA), lock, generate payslips, export bank file, export tax/statutory; 9 total high-risk APIs | API Spec |
| **Primary Screens** | SCR-PAY-01 to SCR-PAY-18 (payroll dashboard, period management, salary structure, run workspace, calculation result, exception list, variance report, approval, lock confirmation, payslip preview, bank export, tax export) | UX Spec |
| **Primary User Roles** | Payroll Manager/Payroll Officer (prepare, calculate), Payroll Approver (approve — must differ from preparer), Tenant Admin (structure config) | BRD §9.4, TSA §26 |
| **Dependencies** | M01, M02 (MFA + SoD), M04 (employee + comp), M06 (locked attendance), M08 (approved leave), M09 (approval workflow) | TSA §25 |
| **Future Dependent Modules** | M11 (ESS payslips), M14 (payroll reports), M15 (bank/ERP integration) | TSA |
| **Events Published** | `PayrollCalculated.v1`, `PayrollApproved.v1`, `PayslipsPublished.v1`, `PayrollExportReady.v1` | TSA §9, API Spec |

---

## M11 — Employee Self-Service (ESS)

| Field | Value | Source |
|-------|-------|--------|
| **Module Number** | M11 | PRD |
| **Module Name** | Employee Self-Service | PRD, TSA |
| **Purpose** | Employee-facing portal: personalised dashboard, attendance view/check-in, leave application, payslip access, document access, profile management, request tracking | BRD §11.10, TSA §9 |
| **Business Description** | Aggregates data from multiple domains into the employee experience. Reduces HR workload by enabling self-service for routine requests. Mobile-optimised as the primary employee touchpoint. | BRD §11.10 (BR-ESS-001 to BR-ESS-005) |
| **Backend Folder** | `apps/api/src/modules/employee-self-service` | TSA §11 |
| **Frontend Folder** | `apps/web/src/modules/employee-self-service` + `apps/web/src/app/(employee)/` | TSA §10 |
| **Primary Database Tables** | Reads from: employee, attendance_day, leave_ledger, leave_request, payslip, document, workflow_instance. No ESS-exclusive tables. | TSA §17 |
| **Primary APIs** | ESS-specific read endpoints; attendance check-in/out via M06 API; leave request via M08 API; profile update request | API Spec |
| **Primary Screens** | SCR-ESS-01 to SCR-ESS-07 (employee home, attendance, leave, payslips, documents, requests, profile) | UX Spec |
| **Primary User Roles** | Employee, Contractor/External Worker | BRD §9.7 |
| **Dependencies** | M01, M02, M04, M06, M08, M10 (payslips), M05 (documents), M09 (request approval status) | TSA |
| **Future Dependent Modules** | None (ESS is a consumer, not a producer) | TSA |
| **Events Published** | None directly (ESS triggers events through M06, M08 APIs) | TSA |

---

## M12 — Manager Self-Service (MSS)

| Field | Value | Source |
|-------|-------|--------|
| **Module Number** | M12 | PRD |
| **Module Name** | Manager Self-Service | PRD, TSA |
| **Purpose** | Manager-facing portal: team dashboards, team attendance, leave calendar, approval queue, schedule management, exception handling | BRD §11.11, TSA §9 |
| **Business Description** | Provides line managers and team leads with real-time visibility over their team's workforce data and enables approval actions. Data is strictly scoped to the manager's hierarchy. | BRD §11.11 (BR-MSS-001 to BR-MSS-003) |
| **Backend Folder** | `apps/api/src/modules/manager-self-service` | TSA §11 |
| **Frontend Folder** | `apps/web/src/modules/manager-self-service` + `apps/web/src/app/(tenant)/manager/` | TSA §10 |
| **Primary Database Tables** | Reads from: employee, attendance_day, attendance_exception, leave_request, workflow_instance, shift_assignment. No MSS-exclusive tables. | TSA §17 |
| **Primary APIs** | MSS-specific team-scoped read endpoints; approval actions via M09 API; attendance correction review | API Spec |
| **Primary Screens** | SCR-MGR-01 to SCR-MGR-07 (manager home, team attendance, leave calendar, approval queue, team schedule, exception review, team directory) | UX Spec |
| **Primary User Roles** | Line Manager/Team Lead | BRD §9.6 |
| **Dependencies** | M01, M02 (manager scope resolution), M04, M06, M07, M08, M09 | TSA |
| **Future Dependent Modules** | None (MSS is a consumer) | TSA |
| **Events Published** | None directly | TSA |

---

## M13 — Notifications

| Field | Value | Source |
|-------|-------|--------|
| **Module Number** | M13 | PRD |
| **Module Name** | Notifications | PRD, TSA |
| **Purpose** | In-app notifications, email, SMS, push; templated + versioned + localised (en/ur); delivery retry; user preferences; in-app notification centre | BRD §11.19, TSA §27 |
| **Business Description** | Consumes domain events from all modules and produces user notifications through appropriate channels. Templates are tenant-branded, multilingual, and versioned. Sensitive data (salary, bank, private leave) is never included in email or push notifications. | BRD §11.19 (BR-NTF-001 to BR-NTF-004), TSA §27 |
| **Backend Folder** | `apps/api/src/modules/notifications` | TSA §11 |
| **Frontend Folder** | `apps/web/src/modules/notifications` + notification centre component | TSA §10 |
| **Primary Database Tables** | `template`, `preference`, `notification`, `delivery_attempt` | TSA §17, ERD |
| **Primary APIs** | Notification preference management; in-app notification list/mark-read; template management | API Spec |
| **Primary Screens** | SCR-NTF-01 to SCR-NTF-04 (notification centre, preferences, template management, delivery log) | UX Spec |
| **Primary User Roles** | All users (receive); Tenant Admin (manage templates and channels) | BRD §9 |
| **Dependencies** | M01, M02, M09 (approval events), M06, M08, M10 (source events) | TSA §27 |
| **Future Dependent Modules** | None | TSA |
| **Events Published** | `NotificationDelivered.v1`, `NotificationFailed.v1` | TSA §9, API Spec |
| **Channel Support at MVP** | In-app + email (mandatory); SMS and push via provider adapters as enabled | TSA §27 |

---

## M14 — Reports / Dashboards / Exports

| Field | Value | Source |
|-------|-------|--------|
| **Module Number** | M14 | PRD |
| **Module Name** | Reports, Dashboards & Exports | PRD, TSA |
| **Purpose** | Canned + custom reports, role-based dashboards, scheduled exports, asynchronous large-report generation | BRD §11.18, TSA §29 |
| **Business Description** | Provides role-appropriate visibility. Operational dashboards use optimised queries within PostgreSQL. Large reports run asynchronously and produce expiring secure export files. A separate analytical warehouse is not introduced at MVP. | BRD §11.18 (BR-RPT-001 to BR-RPT-009), TSA §29 |
| **Backend Folder** | `apps/api/src/modules/reports` | TSA §11 (reporting and export) |
| **Frontend Folder** | `apps/web/src/modules/reports` + `apps/web/src/app/(tenant)/reports/` | TSA §10 |
| **Primary Database Tables** | Read models, report job tables (in reporting domain); ExportReady events | TSA §17 |
| **Primary APIs** | Report run, export download (signed URL), dashboard KPI endpoints; scheduled report management | API Spec |
| **Primary Screens** | SCR-RPT-01 to SCR-RPT-05 (report library, report viewer, dashboard, export history, scheduled reports) | UX Spec |
| **Primary User Roles** | HR Manager, Payroll Manager, Tenant Admin, Tenant Auditor, Line Manager (scoped) | BRD §9 |
| **Dependencies** | M01, M02, all data-producing modules (M04–M10) | TSA §29 |
| **Future Dependent Modules** | None (reports are consumers) | TSA |
| **Events Published** | `ExportReady.v1`, `ExportExpired.v1` | TSA §9, API Spec |

---

## M15 — Data Migration & Integrations

| Field | Value | Source |
|-------|-------|--------|
| **Module Number** | M15 | PRD |
| **Module Name** | Data Migration & Integrations | PRD, TSA |
| **Purpose** | CSV import templates, staging validation, controlled migration pipeline, biometric connector, SSO federation, ERP/bank export connectors, webhook consumer/producer, API key management | BRD §11.20, TSA §30, TSA §31, TSA §47 |
| **Business Description** | Manages all data flows crossing the system boundary. Imports go through a staging-and-validation pipeline before committing through domain services. Connectors for biometric devices, identity providers, ERP, and banks are isolated in a connector runtime. | BRD §11.20 (BR-INT-001 to BR-INT-008), TSA §30, §31, §47 |
| **Backend Folder** | `apps/api/src/modules/integrations` | TSA §11 |
| **Frontend Folder** | `apps/web/src/modules/integrations` + `apps/web/src/app/(tenant)/integrations/` | TSA §10 |
| **Primary Database Tables** | `integration`, `credential_reference`, `mapping`, `sync_run`, `external_event`, `reconciliation_issue` | TSA §17, ERD |
| **Primary APIs** | Connector configuration; webhook endpoints (inbound/outbound); import upload + validation; sync run management; reconciliation | API Spec |
| **Primary Screens** | SCR-INT-01 to SCR-INT-06 (integration health, connector setup, sync log, reconciliation queue, webhook config, import wizard) | UX Spec |
| **Primary User Roles** | Tenant Admin, Integrator/Developer, HR Manager (data import) | BRD §9 |
| **Dependencies** | M01, M02, M04 (employee import), M06 (attendance ingestion), M10 (payroll export) | TSA §30 |
| **Future Dependent Modules** | None (integrations are a cross-cutting concern) | TSA |
| **Events Published** | `IntegrationFailed.v1`, `ExternalEventAccepted.v1` | TSA §9, API Spec |

---

## M16 — Subscription & Feature Entitlements

| Field | Value | Source |
|-------|-------|--------|
| **Module Number** | M16 | PRD |
| **Module Name** | Subscription & Feature Entitlements | PRD |
| **Purpose** | Plan management, seat counting, usage metering, feature flag enforcement, invoicing hooks, trial management, upgrade/downgrade | BRD §11.1, BRD §17 |
| **Business Description** | Governs what each tenant can access based on their subscription. Feature flags gate access to paid functionality at runtime. Usage metering tracks seat consumption. Invoicing hooks integrate with external billing systems. | BRD §17 (BR-TEN-004, BR-TEN-005), BRD §17.1–17.5 |
| **Backend Folder** | `apps/api/src/modules/subscriptions` | Aligned to BRD §17 |
| **Frontend Folder** | `apps/web/src/modules/subscriptions` + `apps/web/src/app/(platform)/subscriptions/` | TSA §10 |
| **Primary Database Tables** | `plan`, `entitlement`, `usage_limit`, `feature_flag` (shared with M01 tenant tables) | TSA §17, ERD |
| **Primary APIs** | Plan management; entitlement check; usage reporting; feature flag toggle | API Spec |
| **Primary Screens** | SCR-SUB-01 to SCR-SUB-04 (subscription dashboard, plan comparison, usage metrics, billing hooks) | UX Spec |
| **Primary User Roles** | Platform Super Admin, Tenant Admin | BRD §9.1, §9.2 |
| **Dependencies** | M01 (tenant context), M02 (auth) | TSA |
| **Future Dependent Modules** | All modules (every feature checks entitlement) | TSA |
| **Events Published** | Not explicitly documented | PRD |

---

## M17 — Audit, Security, Privacy & Compliance

| Field | Value | Source |
|-------|-------|--------|
| **Module Number** | M17 | PRD |
| **Module Name** | Audit, Security, Privacy & Compliance | PRD, TSA |
| **Purpose** | Immutable audit trail for all restricted/secret data mutations; DSR (access/export/erasure) handling; data retention lifecycle; legal holds; encryption key management; security event monitoring | BRD §15.8, TSA §32, TSA §34, TSA §41 |
| **Business Description** | Cross-cutting compliance infrastructure. Every write to Restricted/Secret data produces an atomic audit record. Audit store is append-only with integrity verification. DSR workflows fulfil GDPR/PDPA-aligned subject rights. Retention policies with legal-hold overrides protect required evidence. | BRD §15.8, TSA §32, TSA §34 |
| **Backend Folder** | `apps/api/src/modules/audit` | TSA §11 |
| **Frontend Folder** | `apps/web/src/modules/audit` + `apps/web/src/app/(tenant)/audit/` and `apps/web/src/app/(platform)/audit/` | TSA §10 |
| **Primary Database Tables** | `audit_event`, `security_event`, `data_export_event`, `support_access_event` | TSA §17, ERD |
| **Primary APIs** | Audit log queries; DSR request management; retention rule configuration; legal hold management | API Spec |
| **Primary Screens** | SCR-AUD-01 to SCR-AUD-06 (audit log viewer, security events, DSR management, retention config, legal hold management, export audit) | UX Spec |
| **Primary User Roles** | Platform Auditor, Tenant Auditor, Platform Super Admin, Tenant Admin | BRD §9.8 |
| **Dependencies** | M01, M02 (all modules write to audit through interceptor) | TSA §32 |
| **Future Dependent Modules** | None (audit is consumed by compliance workflows) | TSA |
| **Events Published** | `AuditRecorded.v1` | TSA §9, API Spec |

---

## Module Naming Note

The Technical Solution Architecture (TSA §11) uses these domain names for the backend:
- `identity` (our folder: `authentication`)
- `people` (our folder: `employee`)
- `reporting` (our folder: `reports`)

These were mapped to different names in the initial folder creation. The folder names used are acceptable alternatives; however, if strict conformance to TSA is desired, consider renaming:
- `authentication` → `identity`
- `employee` → `people`
- `reports` → `reporting`

This is an open architectural decision requiring user approval before any rename.
