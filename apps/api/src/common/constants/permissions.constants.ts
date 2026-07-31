export const PLATFORM_PERMISSIONS = {
  TENANT_CREATE: 'platform.tenant.create',
  TENANT_READ: 'platform.tenant.read',
  TENANT_UPDATE: 'platform.tenant.update',
  TENANT_ACTIVATE: 'platform.tenant.activate',
  TENANT_SUSPEND: 'platform.tenant.suspend',
  TENANT_RESTORE: 'platform.tenant.restore',
  USAGE_READ: 'platform.usage.read',
  PLAN_CHANGE: 'platform.plan.change',
  ENTITLEMENT_MANAGE: 'platform.entitlement.manage',
  SUPPORT_GRANT: 'platform.support.grant',
  SUPPORT_REVOKE: 'platform.support.revoke',
  AUDIT_READ: 'platform.audit.read',
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
  ],
  [PlatformRole.AUDITOR]: [
    PLATFORM_PERMISSIONS.TENANT_READ,
    PLATFORM_PERMISSIONS.USAGE_READ,
    PLATFORM_PERMISSIONS.AUDIT_READ,
  ],
  [PlatformRole.OPERATIONS]: [
    PLATFORM_PERMISSIONS.TENANT_READ,
    PLATFORM_PERMISSIONS.TENANT_UPDATE,
    PLATFORM_PERMISSIONS.USAGE_READ,
    PLATFORM_PERMISSIONS.AUDIT_READ,
  ],
};

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
} as const;
export type OrganisationPermission = (typeof ORGANISATION_PERMISSIONS)[keyof typeof ORGANISATION_PERMISSIONS];

export const EMPLOYEE_PERMISSIONS = {
  EMPLOYEE_CREATE:         'create:employee:tenant',
  EMPLOYEE_READ:           'read:employee:tenant',
  EMPLOYEE_READ_DEPT:      'read:employee:department',
  EMPLOYEE_READ_SELF:      'read:employee:self',
  EMPLOYEE_UPDATE:         'update:employee:tenant',
  EMPLOYEE_DELETE:         'delete:employee:tenant',
  PERSONAL_DETAIL_READ:    'read:employee_personal_detail:tenant',
  PERSONAL_DETAIL_UPDATE:  'update:employee_personal_detail:tenant',
} as const;

export type EmployeePermission = (typeof EMPLOYEE_PERMISSIONS)[keyof typeof EMPLOYEE_PERMISSIONS];

export const DOCUMENTS_PERMISSIONS = {
  DOCUMENT_TEMPLATE_CREATE:    'create:document_template:tenant',
  DOCUMENT_TEMPLATE_READ:      'read:document_template:tenant',
  DOCUMENT_TEMPLATE_UPDATE:    'update:document_template:tenant',
  DOCUMENT_TEMPLATE_DELETE:    'delete:document_template:tenant',
  EMPLOYEE_DOCUMENT_CREATE:    'create:employee_document:tenant',
  EMPLOYEE_DOCUMENT_READ:      'read:employee_document:tenant',
  EMPLOYEE_DOCUMENT_UPDATE:    'update:employee_document:tenant',
  EMPLOYEE_DOCUMENT_DELETE:    'delete:employee_document:tenant',
  ONBOARDING_TEMPLATE_CREATE:  'create:onboarding_template:tenant',
  ONBOARDING_TEMPLATE_READ:    'read:onboarding_template:tenant',
  ONBOARDING_TEMPLATE_UPDATE:  'update:onboarding_template:tenant',
  ONBOARDING_TEMPLATE_DELETE:  'delete:onboarding_template:tenant',
  ONBOARDING_INSTANCE_CREATE:  'create:onboarding_instance:tenant',
  ONBOARDING_INSTANCE_READ:    'read:onboarding_instance:tenant',
  ONBOARDING_INSTANCE_UPDATE:  'update:onboarding_instance:tenant',
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
} as const;

export type AttendancePermission = (typeof ATTENDANCE_PERMISSIONS)[keyof typeof ATTENDANCE_PERMISSIONS];
