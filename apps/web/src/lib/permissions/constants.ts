export const EMPLOYEE_PERMISSIONS = {
  EMPLOYEE_CREATE: 'create:employee:tenant',
  EMPLOYEE_READ: 'read:employee:tenant',
  EMPLOYEE_UPDATE: 'update:employee:tenant',
  PERSONAL_DETAIL_READ: 'read:employee_personal_detail:tenant',
  PERSONAL_DETAIL_UPDATE: 'update:employee_personal_detail:tenant',
  EMPLOYEE_TRANSFER: 'employee.transfer',
  EMPLOYEE_STATUS_CHANGE: 'employee.status.change',
  EMPLOYEE_HISTORY_READ: 'employee.history.read',
  EMPLOYEE_IMPORT: 'employee.import',
  EMPLOYEE_QUALITY_READ: 'employee.quality.read',
  EMPLOYMENT_READ: 'employment.read',
  EMPLOYMENT_UPDATE: 'employment.update',
  HR_DASHBOARD_READ: 'hr.dashboard.read',
} as const;

export const ORGANISATION_PERMISSIONS = {
  LEGAL_ENTITY_READ: 'read:legal_entity:tenant',
  BRANCH_READ: 'read:branch:tenant',
  DEPARTMENT_READ: 'read:department:tenant',
  COST_CENTRE_READ: 'read:cost_centre:tenant',
  POSITION_READ: 'read:position:tenant',
  GRADE_CREATE: 'create:grade:tenant',
  GRADE_READ: 'read:grade:tenant',
  GRADE_UPDATE: 'update:grade:tenant',
  GRADE_DELETE: 'delete:grade:tenant',
  ORG_HISTORY_READ: 'read:organisation_history:tenant',
  ORG_OVERVIEW_READ: 'read:organisation_overview:tenant',
} as const;

export const DOCUMENTS_PERMISSIONS = {
  EMPLOYEE_DOCUMENT_READ: 'read:employee_document:tenant',
  EMPLOYEE_DOCUMENT_APPROVE: 'document.approve',
  ONBOARDING_DASHBOARD_READ: 'onboarding.dashboard.read',
} as const;

export const ATTENDANCE_PERMISSIONS = {
  RECORD_READ: 'read:attendance_record:tenant',
  EXCEPTION_READ: 'read:attendance_exception:tenant',
  EXCEPTION_RESOLVE: 'update:attendance_exception:tenant',
  PERIOD_LOCK: 'attendance.period.lock',
  PERIOD_UNLOCK: 'attendance.period.unlock',
} as const;

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

export const ESS_PERMISSIONS = {
  DASHBOARD_READ: 'ess.dashboard.read',
  EMPLOYEE_READ_SELF: 'read:employee:self',
  EMPLOYEE_SELF_UPDATE: 'employee.self.update',
  EVENT_CREATE_SELF: 'create:attendance_event:self',
  RECORD_READ_SELF: 'read:attendance_record:self',
  DOCUMENT_READ_SELF: 'read:employee_document:self',
  NOTIFICATION_READ_SELF: 'read:notification:self',
  POLICY_ACKNOWLEDGE: 'ess.policy.acknowledge',
  ROSTER_READ_SELF: 'read:roster:self',
  LEAVE_TYPE_READ: 'leave.policy.read',
  LEAVE_REQUEST_CREATE: 'leave.request.create',
  LEAVE_REQUEST_READ_SELF: 'leave.request.read.self',
  LEAVE_REQUEST_CANCEL: 'leave.request.cancel',
  LEAVE_BALANCE_READ_SELF: 'leave.balance.read.self',
  PAYSLIP_READ_SELF: 'payslip.read',
  PAYSLIP_DOWNLOAD: 'payslip.download',
} as const;

export const LEAVE_PERMISSIONS = {
  TYPE_READ: 'leave.policy.read',
  TYPE_MANAGE: 'leave.policy.manage',
  REQUEST_READ: 'leave.request.read',
  REQUEST_CREATE: 'leave.request.create',
  REQUEST_APPROVE: 'leave.request.approve',
  BALANCE_ADJUST: 'leave.balance.adjust',
} as const;

export const PAYROLL_PERMISSIONS = {
  READ: 'payroll.read',
  PAYSLIP_PUBLISH: 'payroll.payslip.publish',
} as const;

export const TENANT_INTEGRATION_PERMISSIONS = {
  READ: 'integration.read',
  MANAGE: 'integration.manage',
} as const;

/** @deprecated Prefer TENANT_INTEGRATION_PERMISSIONS */
export const INTEGRATION_PERMISSIONS = TENANT_INTEGRATION_PERMISSIONS;

export const WORKFLOW_PERMISSIONS = {
  INBOX_READ: 'approval.inbox.read',
} as const;

export const REPORT_PERMISSIONS = {
  READ: 'report.read',
} as const;
