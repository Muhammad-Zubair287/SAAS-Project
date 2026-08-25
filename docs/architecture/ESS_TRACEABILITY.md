# Employee Self-Service (M11) Scope A — Requirement Traceability

Sources: BR §11.10 BR-ESS-001…005; PRD M11-FR-001…014; UX SCR-ESS-01…07, SCR-ATT-01…04 (employee); Wireframe ESS plate; API `employee-change-requests` + `/me/*`; Design System ESS frames.

## Scope A (shipped)

| Area | In scope |
| ---- | -------- |
| Home dashboard | Real attendance, shift, requests, onboarding, docs, notifications, leave and payslip summaries |
| Profile | View + direct-edit fields; profile change requests |
| Attendance | Today, history, check-in/out (self) |
| Documents | List/view own docs; policy acknowledgement |
| Requests | Profile / attendance correction / document categories |
| Notifications | List, unread, mark read |
| Roster | Published my roster |
| RBAC | `Employee` system role + self permissions; ownership via `employee.user_id` |

## Out of scope / coming-soon

| Area | Reason |
| ---- | ------ |
| Full mobile native ESS | Responsive web only |
| Announcements feed | No announcement module |
| Manager Self-Service (M12) | Separate product surface |
| Full HR Leave Policy Builder / Payroll engine | ESS uses leave ledger + published payslips; full M08/M10 admin builders remain HR Console backlog |

## Activate locally

1. `cd apps/api && npx prisma migrate deploy`
2. `npx ts-node -r tsconfig-paths/register src/database/seed/run-ess-permissions.ts`
3. Link `employee.user_id` to the AppUser and assign **Employee** role
4. HR grant balances: `POST /leave/balances/grants` (permission `leave.balance.adjust`)
5. Publish payslip: `POST /payslips` (permission `payroll.payslip.publish`)

## Traceability

| PDF Requirement | Module | Page / Route | API | Database | Permission | Frontend | Backend | Test | Status |
| --------------- | ------ | ------------ | --- | -------- | ---------- | -------- | ------- | ---- | ------ |
| BR-ESS-001 / SCR-ESS-01 Home | ESS | `/my` | `GET /me/dashboard` | attendance, roster, docs, requests, notifications | `ess.dashboard.read` | home page | `EssDashboardService` | isolation + e2e gated | Completed |
| M11-FR-001 Profile view | ESS | `/my/profile` | `GET /me/profile` | `employee`, personal detail | `read:employee:self` | profile | `EssProfileService` | isolation | Completed |
| M11-FR-002 Profile update request | ESS | `/my/requests/new`, profile | `PATCH /me/profile`, `POST /me/requests`, `POST /employee-change-requests` | `employee_change_request` | `employee.self.update` | forms | profile + requests | isolation | Completed |
| M11-FR-003 Record attendance | ESS | `/my`, `/my/attendance` | `POST /me/attendance/check-in\|check-out` | `attendance_raw_event` | `create:attendance_event:self` | actions | `EssAttendanceService` | isolation | Completed |
| M11-FR-004 Attendance history | ESS | `/my/attendance` | `GET /me/attendance/records` | `attendance_record` | `read:attendance_record:self` | table | attendance | — | Completed |
| M11-FR-005 Attendance correction | ESS | `/my/requests` | change request type `ATTENDANCE_CORRECTION` | `employee_change_request` | `employee.self.update` / `attendance.correction.create.self` | form | requests | — | Completed |
| M11-FR-006 Leave balances | Leave | `/my/leave` | `GET /me/leave/balances`, `GET /me/leave/types` | `leave_type`, `leave_ledger_entry` | `leave.balance.read.self`, `leave.policy.read` | balance cards | `EssLeaveService` | isolation + e2e gated | Completed |
| M11-FR-007 Leave request/cancel | Leave | `/my/leave`, `/my/leave/new`, `/my/leave/[id]` | `GET/POST /me/leave/requests*` | `leave_request`, `leave_request_day`, `leave_ledger_entry` | `leave.request.*` | list/detail/form | `EssLeaveService` | isolation + e2e gated | Completed |
| M11-FR-008 Request status | ESS | `/my/requests`, `/my/requests/[id]` | `GET /me/requests`, `GET /me/requests/:id` | change + document requests | self update / dashboard | list/detail | `EssRequestsService` | e2e gated | Completed |
| M11-FR-009 Payslips | Payroll | `/my/payslips`, `/my/payslips/[id]` | `GET /me/payslips`, `GET /me/payslips/:id`, `POST /payslips` | `payslip` | `payslip.read`, `payroll.payslip.publish` | list/detail | `EssPayslipService` | isolation + e2e gated | Completed |
| M11-FR-010 Policy acknowledgement | ESS | `/my/policies` | `GET /me/policies`, `POST /me/policies/acknowledge` | `policy_acknowledgement` | `ess.policy.acknowledge` | page | documents/policies | — | Completed |
| M11-FR-011 Onboarding tasks | ESS | home card | dashboard field | `onboarding_instance` | dashboard | home | dashboard | — | Completed |
| M11-FR-012 Notifications | ESS | `/my/notifications` | `/me/notifications*` | `user_notification` | `read/update:notification:self` | page | notifications | — | Completed |
| M11-FR-013 Responsive | ESS | all `/my/*` | — | — | — | layout grids | — | e2e gated | Completed |
| M11-FR-014 No other employee private data | ESS | all | ownership in `/me/*` | `employee.user_id` | `:self` | — | `EssContextService` | isolation | Completed |
| SCR-ESS-02 My Requests | ESS | `/my/requests` | `/me/requests` | change + doc requests | self | list | requests | — | Completed |
| SCR-ESS-03 Request detail | ESS | `/my/requests/[id]` | `GET /me/requests/:id` | change request | self | detail | requests | — | Completed |
| SCR-ESS-04 My Profile | ESS | `/my/profile` | `/me/profile` | employee | self | sections + fieldAccess | profile | — | Completed |
| SCR-ESS-05 Request profile change | ESS | `/my/requests/new` | POST change request | `employee_change_request` | `employee.self.update` | form | requests | — | Completed |
| SCR-ESS-06 My Documents | ESS | `/my/documents` | `GET /me/documents` | `employee_document` | `read:employee_document:self` | cards | documents | — | Completed |
| SCR-ESS-07 Policy ack | ESS | `/my/policies` | acknowledge | `policy_acknowledgement` | `ess.policy.acknowledge` | form | documents | — | Completed |
| SCR-SHF-05 My Roster | ESS | `/my/roster` | `GET /me/roster` | `roster_assignment` | `read:roster:self` | list | roster | — | Completed |
| API POST/GET employee-change-requests | ESS | HR approve | `/employee-change-requests` | change request | `employee.change.approve` | — | change controller | isolation | Completed |
| AppUser↔Employee link | IAM/DB | — | — | `employee.user_id` | — | — | migration | — | Completed |
| Employee role seed | IAM | — | tenant provision | permission/role | ESS_EMPLOYEE set | — | `ess-permissions.seed` | seed script | Completed |

## Security notes

- `/me/*` never trusts client `employeeId` / `tenantId`; identity from JWT.
- Check-in/out force linked employee id into attendance ingest.
- HR change-request approve path blocks self-approval of own linked employee request.
- Leave/payslip cards never invent statistics.
