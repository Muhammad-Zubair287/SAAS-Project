export const PLATFORM_PERMISSIONS = {
  TENANT_CREATE: 'platform.tenant.create',
  TENANT_READ: 'platform.tenant.read',
  TENANT_UPDATE: 'platform.tenant.update',
  TENANT_ACTIVATE: 'platform.tenant.activate',
  TENANT_SUSPEND: 'platform.tenant.suspend',
  TENANT_RESTORE: 'platform.tenant.restore',
  TENANT_CLOSE: 'platform.tenant.close',
  USAGE_READ: 'platform.usage.read',
  PLAN_CHANGE: 'platform.plan.change',
  PLAN_MANAGE: 'platform.plan.manage',
  ENTITLEMENT_MANAGE: 'platform.entitlement.manage',
  ENTITLEMENT_CATALOGUE: 'platform.entitlement.catalogue',
  SUPPORT_GRANT: 'platform.support.grant',
  SUPPORT_REVOKE: 'platform.support.revoke',
  SUPPORT_APPROVE: 'platform.support.approve',
  AUDIT_READ: 'platform.audit.read',
  AUDIT_EXPORT: 'platform.audit.export',
  AUDIT_MANAGE: 'platform.audit.manage',
  CONFIG_READ: 'platform.config.read',
  CONFIG_MANAGE: 'platform.config.manage',
  SECURITY_MANAGE: 'platform.security.manage',
  RETENTION_MANAGE: 'platform.retention.manage',
  REGION_MANAGE: 'platform.region.manage',
  NOTIFICATION_MANAGE: 'platform.notification.manage',
  NOTIFICATION_READ: 'platform.notification.read',
  INTEGRATION_MANAGE: 'platform.integration.manage',
  INTEGRATION_READ: 'platform.integration.read',
  SEARCH_READ: 'platform.search.read',
} as const;

export type PlatformPermission =
  (typeof PLATFORM_PERMISSIONS)[keyof typeof PLATFORM_PERMISSIONS];

import { PlatformRole } from '../enums/platform.enum';

export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, PlatformPermission[]> = {
  [PlatformRole.SUPER_ADMIN]: Object.values(PLATFORM_PERMISSIONS) as PlatformPermission[],
  [PlatformRole.SUPPORT_ENGINEER]: [
    PLATFORM_PERMISSIONS.TENANT_READ,
    PLATFORM_PERMISSIONS.USAGE_READ,
    PLATFORM_PERMISSIONS.SUPPORT_GRANT,
    PLATFORM_PERMISSIONS.SUPPORT_REVOKE,
    PLATFORM_PERMISSIONS.NOTIFICATION_READ,
    PLATFORM_PERMISSIONS.SEARCH_READ,
    PLATFORM_PERMISSIONS.INTEGRATION_READ,
  ],
  [PlatformRole.AUDITOR]: [
    PLATFORM_PERMISSIONS.TENANT_READ,
    PLATFORM_PERMISSIONS.USAGE_READ,
    PLATFORM_PERMISSIONS.AUDIT_READ,
    PLATFORM_PERMISSIONS.AUDIT_EXPORT,
    PLATFORM_PERMISSIONS.CONFIG_READ,
    PLATFORM_PERMISSIONS.SEARCH_READ,
    PLATFORM_PERMISSIONS.NOTIFICATION_READ,
  ],
  [PlatformRole.OPERATIONS]: [
    PLATFORM_PERMISSIONS.TENANT_READ,
    PLATFORM_PERMISSIONS.TENANT_UPDATE,
    PLATFORM_PERMISSIONS.USAGE_READ,
    PLATFORM_PERMISSIONS.AUDIT_READ,
    PLATFORM_PERMISSIONS.PLAN_MANAGE,
    PLATFORM_PERMISSIONS.ENTITLEMENT_CATALOGUE,
    PLATFORM_PERMISSIONS.CONFIG_READ,
    PLATFORM_PERMISSIONS.CONFIG_MANAGE,
    PLATFORM_PERMISSIONS.REGION_MANAGE,
    PLATFORM_PERMISSIONS.INTEGRATION_READ,
    PLATFORM_PERMISSIONS.INTEGRATION_MANAGE,
    PLATFORM_PERMISSIONS.NOTIFICATION_READ,
    PLATFORM_PERMISSIONS.SEARCH_READ,
  ],
};

export const EMPLOYEE_PERMISSIONS = {
  EMPLOYEE_CREATE:         'create:employee:tenant',
  EMPLOYEE_READ:           'read:employee:tenant',
  EMPLOYEE_READ_DEPT:      'read:employee:department',
  EMPLOYEE_READ_SELF:      'read:employee:self',
  EMPLOYEE_UPDATE:         'update:employee:tenant',
  EMPLOYEE_DELETE:         'delete:employee:tenant',
  PERSONAL_DETAIL_READ:    'read:employee_personal_detail:tenant',
  PERSONAL_DETAIL_UPDATE:  'update:employee_personal_detail:tenant',
  EMPLOYEE_TRANSFER:       'employee.transfer',
  EMPLOYEE_STATUS_CHANGE:  'employee.status.change',
  EMPLOYEE_HISTORY_READ:   'employee.history.read',
  EMPLOYEE_IMPORT:         'employee.import',
  EMPLOYEE_QUALITY_READ:   'employee.quality.read',
  EMPLOYMENT_READ:         'employment.read',
  EMPLOYMENT_UPDATE:       'employment.update',
  COMPENSATION_READ:       'compensation.read',
  COMPENSATION_UPDATE:     'compensation.update',
  HR_DASHBOARD_READ:       'hr.dashboard.read',
} as const;

export type EmployeePermission = (typeof EMPLOYEE_PERMISSIONS)[keyof typeof EMPLOYEE_PERMISSIONS];

export const ORGANISATION_PERMISSIONS = {
  LEGAL_ENTITY_CREATE: 'create:legal_entity:tenant',
  LEGAL_ENTITY_READ:   'read:legal_entity:tenant',
  LEGAL_ENTITY_UPDATE: 'update:legal_entity:tenant',
  LEGAL_ENTITY_DELETE: 'delete:legal_entity:tenant',
  BRANCH_CREATE:       'create:branch:tenant',
  BRANCH_READ:         'read:branch:tenant',
  BRANCH_UPDATE:       'update:branch:tenant',
  BRANCH_DELETE:       'delete:branch:tenant',
  DEPARTMENT_CREATE:   'create:department:tenant',
  DEPARTMENT_READ:     'read:department:tenant',
  DEPARTMENT_UPDATE:   'update:department:tenant',
  DEPARTMENT_DELETE:   'delete:department:tenant',
  COST_CENTRE_CREATE:  'create:cost_centre:tenant',
  COST_CENTRE_READ:    'read:cost_centre:tenant',
  COST_CENTRE_UPDATE:  'update:cost_centre:tenant',
  COST_CENTRE_DELETE:  'delete:cost_centre:tenant',
  POSITION_CREATE:     'create:position:tenant',
  POSITION_READ:       'read:position:tenant',
  POSITION_UPDATE:     'update:position:tenant',
  POSITION_DELETE:     'delete:position:tenant',
  GRADE_CREATE:        'create:grade:tenant',
  GRADE_READ:          'read:grade:tenant',
  GRADE_UPDATE:        'update:grade:tenant',
  GRADE_DELETE:        'delete:grade:tenant',
  ORG_HISTORY_READ:    'read:organisation_history:tenant',
  ORG_OVERVIEW_READ:   'read:organisation_overview:tenant',
} as const;
export type OrganisationPermission = (typeof ORGANISATION_PERMISSIONS)[keyof typeof ORGANISATION_PERMISSIONS];

export const DOCUMENTS_PERMISSIONS = {
  DOCUMENT_TEMPLATE_CREATE:    'create:document_template:tenant',
  DOCUMENT_TEMPLATE_READ:      'read:document_template:tenant',
  DOCUMENT_TEMPLATE_UPDATE:    'update:document_template:tenant',
  DOCUMENT_TEMPLATE_DELETE:    'delete:document_template:tenant',
  EMPLOYEE_DOCUMENT_CREATE:    'create:employee_document:tenant',
  EMPLOYEE_DOCUMENT_READ:      'read:employee_document:tenant',
  EMPLOYEE_DOCUMENT_UPDATE:    'update:employee_document:tenant',
  EMPLOYEE_DOCUMENT_DELETE:    'delete:employee_document:tenant',
  EMPLOYEE_DOCUMENT_APPROVE:   'document.approve',
  EMPLOYEE_DOCUMENT_DOWNLOAD:  'document.download',
  ONBOARDING_TEMPLATE_CREATE:  'create:onboarding_template:tenant',
  ONBOARDING_TEMPLATE_READ:    'read:onboarding_template:tenant',
  ONBOARDING_TEMPLATE_UPDATE:  'update:onboarding_template:tenant',
  ONBOARDING_TEMPLATE_DELETE:  'delete:onboarding_template:tenant',
  ONBOARDING_INSTANCE_CREATE:  'create:onboarding_instance:tenant',
  ONBOARDING_INSTANCE_READ:    'read:onboarding_instance:tenant',
  ONBOARDING_INSTANCE_UPDATE:  'update:onboarding_instance:tenant',
  ONBOARDING_DASHBOARD_READ:   'onboarding.dashboard.read',
  DOCUMENT_REQUEST_CREATE:     'create:document_request:tenant',
  DOCUMENT_REQUEST_READ:       'read:document_request:tenant',
  DOCUMENT_REQUEST_UPDATE:     'update:document_request:tenant',
} as const;

export type DocumentsPermission = (typeof DOCUMENTS_PERMISSIONS)[keyof typeof DOCUMENTS_PERMISSIONS];

export const ATTENDANCE_POLICY_PERMISSIONS = {
  READ:   'attendance.policy.read',
  CREATE: 'attendance.policy.create',
  UPDATE: 'attendance.policy.update',
  DELETE: 'attendance.policy.delete',
} as const;

export const ATTENDANCE_PERMISSIONS = {
  // Raw Events
  EVENT_INGEST:         'create:attendance_event:tenant',
  EVENT_READ:           'read:attendance_event:tenant',
  EVENT_READ_SELF:      'read:attendance_event:self',

  // Records
  RECORD_READ:          'read:attendance_record:tenant',
  RECORD_READ_DEPT:     'read:attendance_record:department',
  RECORD_READ_SELF:     'read:attendance_record:self',
  RECORD_CREATE_MANUAL: 'create:attendance_record:tenant',
  RECORD_RECALCULATE:   'update:attendance_record:tenant',

  // Exceptions
  EXCEPTION_READ:       'read:attendance_exception:tenant',
  EXCEPTION_READ_DEPT:  'read:attendance_exception:department',
  EXCEPTION_RESOLVE:    'update:attendance_exception:tenant',

  // Period lock (SCR-ATT-12)
  PERIOD_LOCK:          'attendance.period.lock',
  PERIOD_UNLOCK:        'attendance.period.unlock',
  CORRECTION_APPROVE:   'attendance.correction.approve',
} as const;

export type AttendancePermission = (typeof ATTENDANCE_PERMISSIONS)[keyof typeof ATTENDANCE_PERMISSIONS];

// M06 Batch 3 — Attendance capture infrastructure. These are intentionally
// dot-delimited to match the approved Device Capture API Contract Addendum.
export const ATTENDANCE_CAPTURE_PERMISSIONS = {
  DEVICE_READ:             'attendance.device.read',
  DEVICE_MANAGE:           'attendance.device.manage',
  DEVICE_TOKEN_ISSUE:      'attendance.device-token.issue',
  DEVICE_TOKEN_ROTATE:     'attendance.device-token.rotate',
  DEVICE_TOKEN_REVOKE:     'attendance.device-token.revoke',
  DEVICE_TOKEN_INSPECT:    'attendance.device-token.inspect',
  DEVICE_HEARTBEAT_READ:   'attendance.device-heartbeat.read',
  DEVICE_EVENT_REVALIDATE: 'attendance.device-event.revalidate',
  OFFLINE_READ:            'attendance.offline.read',
  OFFLINE_MANAGE:          'attendance.offline.manage',
  GEOFENCE_READ:           'attendance.geofence.read',
  GEOFENCE_MANAGE:         'attendance.geofence.manage',
} as const;

export type AttendanceCapturePermission =
  (typeof ATTENDANCE_CAPTURE_PERMISSIONS)[keyof typeof ATTENDANCE_CAPTURE_PERMISSIONS];

/** M07 Phase 1 — Shift Foundation (API contract inventory). */
export const SHIFT_PERMISSIONS = {
  READ:   'shift.read',
  CREATE: 'shift.create',
  UPDATE: 'shift.update',
} as const;

export type ShiftPermission =
  (typeof SHIFT_PERMISSIONS)[keyof typeof SHIFT_PERMISSIONS];

/**
 * M07 Phase 2–4 — ShiftAssignment + Roster Engine permissions.
 */
export const ROSTER_PERMISSIONS = {
  READ:     'roster.read',
  ASSIGN:   'roster.assign',
  OVERRIDE: 'roster.override',
  PUBLISH:  'roster.publish',
} as const;

export type RosterPermission =
  (typeof ROSTER_PERMISSIONS)[keyof typeof ROSTER_PERMISSIONS];

export const LEAVE_PERMISSIONS = {
  TYPE_READ: 'leave.policy.read',
  TYPE_MANAGE: 'leave.policy.manage',
  REQUEST_CREATE: 'leave.request.create',
  REQUEST_READ: 'leave.request.read',
  REQUEST_READ_SELF: 'leave.request.read.self',
  REQUEST_CANCEL: 'leave.request.cancel',
  BALANCE_READ_SELF: 'leave.balance.read.self',
  BALANCE_ADJUST: 'leave.balance.adjust',
  REQUEST_APPROVE: 'leave.request.approve',
} as const;

export type LeavePermission = (typeof LEAVE_PERMISSIONS)[keyof typeof LEAVE_PERMISSIONS];

export const PAYSLIP_PERMISSIONS = {
  READ_SELF: 'payslip.read',
  DOWNLOAD: 'payslip.download',
  PUBLISH: 'payroll.payslip.publish',
} as const;

export type PayslipPermission = (typeof PAYSLIP_PERMISSIONS)[keyof typeof PAYSLIP_PERMISSIONS];

export const PAYROLL_PERMISSIONS = {
  READ: 'payroll.read',
  PAYSLIP_PUBLISH: PAYSLIP_PERMISSIONS.PUBLISH,
} as const;

export type PayrollPermission = (typeof PAYROLL_PERMISSIONS)[keyof typeof PAYROLL_PERMISSIONS];

export const WORKFLOW_PERMISSIONS = {
  INBOX_READ: 'approval.inbox.read',
} as const;

export type WorkflowPermission = (typeof WORKFLOW_PERMISSIONS)[keyof typeof WORKFLOW_PERMISSIONS];

export const REPORT_PERMISSIONS = {
  READ: 'report.read',
} as const;

export type ReportPermission = (typeof REPORT_PERMISSIONS)[keyof typeof REPORT_PERMISSIONS];

/** Tenant-scoped integration catalogue / configure gate (SCR-INT). */
export const TENANT_INTEGRATION_PERMISSIONS = {
  READ: 'integration.read',
  MANAGE: 'integration.manage',
} as const;

export type TenantIntegrationPermission =
  (typeof TENANT_INTEGRATION_PERMISSIONS)[keyof typeof TENANT_INTEGRATION_PERMISSIONS];

/** M11 Employee Self-Service — self-scoped + ESS dashboard / change-request permissions. */
export const ESS_PERMISSIONS = {
  DASHBOARD_READ:          'ess.dashboard.read',
  EMPLOYEE_SELF_UPDATE:     'employee.self.update',
  EMPLOYEE_CHANGE_APPROVE: 'employee.change.approve',
  EVENT_CREATE_SELF:       'create:attendance_event:self',
  DOCUMENT_READ_SELF:      'read:employee_document:self',
  DOCUMENT_DOWNLOAD_SELF:  'document.download.self',
  NOTIFICATION_READ_SELF:  'read:notification:self',
  NOTIFICATION_UPDATE_SELF:'update:notification:self',
  POLICY_ACKNOWLEDGE:      'ess.policy.acknowledge',
  ROSTER_READ_SELF:        'read:roster:self',
  CORRECTION_CREATE_SELF:  'attendance.correction.create.self',
} as const;

export type EssPermission = (typeof ESS_PERMISSIONS)[keyof typeof ESS_PERMISSIONS];

/** Permission codes granted to the system Employee role. */
export const ESS_EMPLOYEE_PERMISSION_CODES: string[] = [
  EMPLOYEE_PERMISSIONS.EMPLOYEE_READ_SELF,
  ATTENDANCE_PERMISSIONS.EVENT_READ_SELF,
  ATTENDANCE_PERMISSIONS.RECORD_READ_SELF,
  LEAVE_PERMISSIONS.TYPE_READ,
  LEAVE_PERMISSIONS.REQUEST_CREATE,
  LEAVE_PERMISSIONS.REQUEST_READ_SELF,
  LEAVE_PERMISSIONS.REQUEST_CANCEL,
  LEAVE_PERMISSIONS.BALANCE_READ_SELF,
  PAYSLIP_PERMISSIONS.READ_SELF,
  PAYSLIP_PERMISSIONS.DOWNLOAD,
  ...Object.values(ESS_PERMISSIONS),
];

/** Tenant Admin Console (SCR-TEN / SCR-SET / SCR-SUB / SCR-AUD) — colon form. */
export const TENANT_ADMIN_PERMISSIONS = {
  PROFILE_READ: 'read:tenant_profile:tenant',
  PROFILE_MANAGE: 'manage:tenant_profile:tenant',
  BRANDING_READ: 'read:tenant_branding:tenant',
  BRANDING_MANAGE: 'manage:tenant_branding:tenant',
  SETTINGS_READ: 'read:tenant_settings:tenant',
  SETTINGS_MANAGE: 'manage:tenant_settings:tenant',
  MODULES_READ: 'read:tenant_modules:tenant',
  SUBSCRIPTION_READ: 'read:subscription:tenant',
  UPGRADE_REQUEST: 'request:upgrade:tenant',
  SECURITY_POLICY_READ: 'read:security_policy:tenant',
  SECURITY_POLICY_MANAGE: 'manage:security_policy:tenant',
  USER_READ: 'read:user:tenant',
  USER_INVITE: 'invite:user:tenant',
  USER_DEACTIVATE: 'deactivate:user:tenant',
  USER_MANAGE: 'manage:user:tenant',
  ROLE_READ: 'read:role:tenant',
  ROLE_MANAGE: 'manage:role:tenant',
  ROLE_ASSIGNMENT_READ: 'read:role_assignment:tenant',
  ROLE_ASSIGNMENT_MANAGE: 'manage:role_assignment:tenant',
  SESSION_READ: 'read:session:tenant',
  SESSION_REVOKE: 'revoke:session:tenant',
  AUDIT_READ: 'read:audit_event:tenant',
} as const;

export type TenantAdminPermission =
  (typeof TENANT_ADMIN_PERMISSIONS)[keyof typeof TENANT_ADMIN_PERMISSIONS];

export const TENANT_ADMIN_PERMISSION_CODES: TenantAdminPermission[] = Object.values(
  TENANT_ADMIN_PERMISSIONS,
);

/** HR Console Scope A — full M03–M07 + lifecycle permission set for HR Manager. */
export const HR_CONSOLE_PERMISSION_CODES: string[] = [
  ...Object.values(ORGANISATION_PERMISSIONS),
  ...Object.values(EMPLOYEE_PERMISSIONS),
  ...Object.values(DOCUMENTS_PERMISSIONS),
  ...Object.values(ATTENDANCE_PERMISSIONS),
  ...Object.values(ATTENDANCE_POLICY_PERMISSIONS),
  ...Object.values(ATTENDANCE_CAPTURE_PERMISSIONS),
  ...Object.values(SHIFT_PERMISSIONS),
  ...Object.values(ROSTER_PERMISSIONS),
  ...Object.values(LEAVE_PERMISSIONS),
  PAYSLIP_PERMISSIONS.PUBLISH,
  PAYROLL_PERMISSIONS.READ,
  WORKFLOW_PERMISSIONS.INBOX_READ,
  REPORT_PERMISSIONS.READ,
  TENANT_INTEGRATION_PERMISSIONS.READ,
  TENANT_INTEGRATION_PERMISSIONS.MANAGE,
];
