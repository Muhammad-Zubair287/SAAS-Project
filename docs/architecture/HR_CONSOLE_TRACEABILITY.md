# HR Console Scope A — Requirement Traceability

Sources: UX §7.3 HR Admin nav; Wireframe SCR-EMP-01…10, SCR-ORG-01/04/07/08, SCR-ONB-01…04, SCR-DOC-01…03, SCR-ATT-07…12; API People/Employment; ERD employment/compensation/emergency; CLAUDE M03–M07.

**Out of scope (marked coming-soon):** Leave (SCR-LVE-*), Workflow (SCR-WFL-*), Reports (SCR-RPT-*), Payroll, ESS mobile screens.

| PDF Requirement | Module | Page / Route | API | Database | Permission | Frontend | Backend | Test | Status |
| --------------- | ------ | ------------ | --- | -------- | ---------- | -------- | ------- | ---- | ------ |
| HR Dashboard KPIs | HR | `/hr` | `GET /hr/dashboard` | aggregates | `hr.dashboard.read` | Scope A web | `HrDashboardService` | isolation spec | Completed |
| SCR-EMP-01 Directory | Employee | `/employees` | `GET /employees` | `employee` | `read:employee:tenant` | enhanced filters | list filters | isolation | Completed |
| SCR-EMP-02 Add wizard | Employee | `/employees/new` | `POST /employees` | `employee` + `employment_record` | `create:employee:tenant` | wizard | create + employment row | — | Completed |
| SCR-EMP-03 Profile | Employee | `/employees/[id]` | `GET /employees/:id` | `employee` | `read:employee:tenant` | tabs | response DTO | — | Completed |
| SCR-EMP-04 Personal + emergency | Employee | profile personal tab | emergency-contacts CRUD | `emergency_contact` | personal detail perms | web | lifecycle API | — | Completed |
| SCR-EMP-05 Employment | Employee | employment tab | `GET .../employment` | `employment_record`, `compensation_record` | `employment.read` | web | lifecycle API | — | Completed |
| SCR-EMP-06 Transfer | Employee | `/employees/[id]/transfer` | `POST .../transfers` | employment + timeline | `employee.transfer` | web | lifecycle API | isolation | Completed |
| SCR-EMP-07 Status change | Employee | `/employees/[id]/status` | `POST .../status-changes` | `employee` + timeline | `employee.status.change` | web | lifecycle API | isolation | Completed |
| SCR-EMP-08 Timeline | Employee | `/employees/[id]/timeline` | `GET .../history` | `employee_timeline_event` | `employee.history.read` | web | lifecycle API | — | Completed |
| SCR-EMP-09 Bulk import | Employee | `/employees/import` | `POST /imports/employees`, commit | `employee_import_job/row` | `employee.import` | web | lifecycle API | isolation | Completed |
| SCR-EMP-10 Data quality | Employee | `/employees/data-quality` | `GET /employees/data-quality` | aggregates | `employee.quality.read` | web | lifecycle API | — | Completed |
| SCR-ORG-01 Overview | Org | `/organisation` | `GET /organisation/overview` | aggregates | `read:organisation_overview:tenant` | web | overview service | — | Completed |
| SCR-ORG-04 Dept tree | Org | departments | `GET /departments/tree` | `department` | `read:department:tenant` | web | overview service | — | Completed |
| SCR-ORG-07 Grades | Org | `/organisation/grades` | `/grades` CRUD | `grade` | `*:grade:tenant` | web | `GradeService` | — | Completed |
| SCR-ORG-08 Org history | Org | `/organisation/history` | `GET /organisation/history` | `organisation_change_event` | `read:organisation_history:tenant` | web | overview service | — | Completed |
| SCR-ONB-01 Dashboard | Onboarding | `/documents/onboarding` | `GET /onboarding/dashboard` | instances/tasks | `onboarding.dashboard.read` | web | dashboard service | — | Completed |
| SCR-ONB-02/03/04 | Onboarding | existing + workspace | existing instance APIs | onboarding_* | onboarding.* | partial UI | existing | — | Partially Completed |
| SCR-DOC-01 Library | Documents | `/documents` | `GET /documents` | `employee_document` | document read | web | library controller | — | Completed |
| SCR-DOC-02 Upload | Documents | upload form | `POST employees/:id/documents` | `employee_document` | document create | web | existing | — | Partially Completed |
| SCR-DOC-03 Review | Documents | library actions | `POST documents/:id/approve\|reject` | status | `document.approve` | web | approve/reject | — | Completed |
| SCR-ATT-07…11 | Attendance | existing + exceptions | existing APIs | attendance_* | attendance.* | exceptions page | existing | — | Partially Completed |
| SCR-ATT-12 Period lock | Attendance | `/attendance/period-lock` | `POST /attendance/period-lock` | `attendance_period` | `attendance.period.lock` | web | period service | isolation | Completed |
| HR Settings hub | HR | `/hr/settings` | links only | — | various | web | — | — | Completed |
| HR Manager RBAC seed | IAM | — | provisioning | `permission`/`role` | HR_CONSOLE set | — | `hr-console-permissions.seed` | seed script | Completed |

## Notes

- Transfers/status changes apply immediately with audit (no M09 workflow inbox).
- Wizard Step 3 assigns shift + attendance policy only (no leave/payroll).
- Leave / Approvals / Reports remain coming-soon in nav.
