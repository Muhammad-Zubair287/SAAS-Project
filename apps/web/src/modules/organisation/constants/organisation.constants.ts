import { ROUTES } from '../../../constants/routes.constants';
import { ATTENDANCE_CAPTURE_PERMISSIONS } from '../../attendance/constants/attendance-capture.constants';
import { SHIFT_PERMISSIONS, ROSTER_PERMISSIONS } from '../../shifts/constants/shift.constants';
import { TENANT_ADMIN_PERMISSIONS } from '../../tenant/constants/tenant-admin.permissions';
import {
  ATTENDANCE_PERMISSIONS,
  DOCUMENTS_PERMISSIONS,
  EMPLOYEE_PERMISSIONS,
  INTEGRATION_PERMISSIONS,
  LEAVE_PERMISSIONS,
  ORGANISATION_PERMISSIONS,
  PAYROLL_PERMISSIONS,
} from '../../../lib/permissions/constants';

/**
 * HR Admin sidebar — UX Specification §7.3 (SCR-HR-SID-01).
 * Additional tenant-admin modules follow the HR command set for operators
 * who also hold organisation / payroll / audit responsibilities.
 */
export const TENANT_NAV_ITEMS = [
  {
    key: 'home',
    labelKey: 'tenant.nav.home',
    href: ROUTES.TENANT.DASHBOARD,
    status: 'available',
  },
  {
    key: 'hrDashboard',
    labelKey: 'tenant.nav.hrDashboard',
    href: ROUTES.TENANT.HR.ROOT,
    status: 'available',
    permission: EMPLOYEE_PERMISSIONS.HR_DASHBOARD_READ,
  },
  {
    key: 'people',
    labelKey: 'tenant.nav.employees',
    href: ROUTES.TENANT.EMPLOYEES.ROOT,
    status: 'available',
    permission: EMPLOYEE_PERMISSIONS.EMPLOYEE_READ,
  },
  {
    key: 'onboarding',
    labelKey: 'tenant.nav.onboarding',
    href: ROUTES.TENANT.DOCUMENTS.ONBOARDING,
    status: 'available',
    permission: DOCUMENTS_PERMISSIONS.ONBOARDING_DASHBOARD_READ,
  },
  {
    key: 'attendance',
    labelKey: 'tenant.nav.attendance',
    href: ROUTES.TENANT.ATTENDANCE.ROOT,
    status: 'available',
    permission: ATTENDANCE_PERMISSIONS.RECORD_READ,
    children: [
      {
        key: 'attendance-overview',
        labelKey: 'tenant.nav.attendanceOverview',
        href: ROUTES.TENANT.ATTENDANCE.ROOT,
        status: 'available',
      },
      {
        key: 'attendance-records',
        labelKey: 'tenant.nav.timeTracking',
        href: ROUTES.TENANT.ATTENDANCE.RECORDS,
        status: 'available',
      },
      {
        key: 'attendance-exceptions',
        labelKey: 'tenant.nav.attendanceExceptions',
        href: ROUTES.TENANT.ATTENDANCE.EXCEPTIONS,
        status: 'available',
        permission: ATTENDANCE_PERMISSIONS.EXCEPTION_READ,
      },
      {
        key: 'attendance-period-lock',
        labelKey: 'tenant.nav.periodLock',
        href: ROUTES.TENANT.ATTENDANCE.PERIOD_LOCK,
        status: 'available',
        permission: ATTENDANCE_PERMISSIONS.PERIOD_LOCK,
      },
      {
        key: 'attendance-policies',
        labelKey: 'tenant.nav.attendancePolicies',
        href: ROUTES.TENANT.ATTENDANCE.POLICIES,
        status: 'available',
      },
      {
        key: 'attendance-capture',
        labelKey: 'tenant.nav.captureOverview',
        href: ROUTES.TENANT.ATTENDANCE.CAPTURE,
        status: 'available',
        permission: ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_HEARTBEAT_READ,
      },
      {
        key: 'attendance-devices',
        labelKey: 'tenant.nav.captureDevices',
        href: ROUTES.TENANT.ATTENDANCE.DEVICES,
        status: 'available',
        permission: ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_READ,
      },
      {
        key: 'attendance-geofences',
        labelKey: 'tenant.nav.captureGeofences',
        href: ROUTES.TENANT.ATTENDANCE.GEOFENCES,
        status: 'available',
        permission: ATTENDANCE_CAPTURE_PERMISSIONS.GEOFENCE_READ,
      },
      {
        key: 'attendance-offline',
        labelKey: 'tenant.nav.captureOfflineSessions',
        href: ROUTES.TENANT.ATTENDANCE.OFFLINE_SESSIONS,
        status: 'available',
        permission: ATTENDANCE_CAPTURE_PERMISSIONS.OFFLINE_READ,
      },
    ],
  },
  {
    key: 'shifts',
    labelKey: 'tenant.nav.shiftsRosters',
    href: ROUTES.TENANT.SHIFTS.ROOT,
    status: 'available',
    permission: SHIFT_PERMISSIONS.READ,
    children: [
      {
        key: 'shifts-catalogue',
        labelKey: 'tenant.nav.shifts',
        href: ROUTES.TENANT.SHIFTS.ROOT,
        status: 'available',
        permission: SHIFT_PERMISSIONS.READ,
      },
      {
        key: 'roster',
        labelKey: 'tenant.nav.roster',
        href: ROUTES.TENANT.SHIFTS.ROSTER,
        status: 'available',
        permission: ROSTER_PERMISSIONS.READ,
      },
      {
        key: 'shifts-assign',
        labelKey: 'tenant.nav.shiftAssign',
        href: ROUTES.TENANT.SHIFTS.ASSIGN,
        status: 'available',
        permission: ROSTER_PERMISSIONS.ASSIGN,
      },
    ],
  },
  {
    key: 'leave',
    labelKey: 'tenant.nav.leave',
    href: ROUTES.TENANT.LEAVE.ROOT,
    status: 'available',
    permission: LEAVE_PERMISSIONS.REQUEST_READ,
  },
  {
    key: 'approvals',
    labelKey: 'tenant.nav.approvals',
    href: ROUTES.TENANT.APPROVALS.ROOT,
    status: 'available',
    permission: LEAVE_PERMISSIONS.REQUEST_APPROVE,
  },
  {
    key: 'documents',
    labelKey: 'tenant.nav.documentsLibrary',
    href: ROUTES.TENANT.DOCUMENTS.ROOT,
    status: 'available',
    permission: DOCUMENTS_PERMISSIONS.EMPLOYEE_DOCUMENT_READ,
  },
  {
    key: 'reports',
    labelKey: 'tenant.nav.reports',
    href: ROUTES.TENANT.REPORTS.ROOT,
    status: 'available',
    permission: EMPLOYEE_PERMISSIONS.EMPLOYEE_READ,
  },
  {
    key: 'hrSettings',
    labelKey: 'tenant.nav.hrSettings',
    href: ROUTES.TENANT.HR.SETTINGS,
    status: 'available',
    permission: EMPLOYEE_PERMISSIONS.HR_DASHBOARD_READ,
  },
  {
    key: 'organisation',
    labelKey: 'tenant.nav.organisation',
    href: ROUTES.TENANT.ORGANISATION.ROOT,
    status: 'available',
    permission: ORGANISATION_PERMISSIONS.ORG_OVERVIEW_READ,
  },
  {
    key: 'payroll',
    labelKey: 'tenant.nav.payroll',
    href: ROUTES.TENANT.PAYROLL.ROOT,
    status: 'available',
    permission: PAYROLL_PERMISSIONS.PAYSLIP_PUBLISH,
  },
  {
    key: 'integrations',
    labelKey: 'tenant.nav.integrations',
    href: ROUTES.TENANT.INTEGRATIONS.ROOT,
    status: 'available',
    permission: INTEGRATION_PERMISSIONS.MANAGE,
  },
  {
    key: 'settings',
    labelKey: 'tenant.nav.settings',
    href: ROUTES.TENANT.SETTINGS,
    status: 'available',
    permission: TENANT_ADMIN_PERMISSIONS.SETTINGS_READ,
  },
  {
    key: 'subscription',
    labelKey: 'tenant.nav.subscription',
    href: ROUTES.TENANT.SUBSCRIPTION,
    status: 'available',
    permission: TENANT_ADMIN_PERMISSIONS.SUBSCRIPTION_READ,
  },
  {
    key: 'audit',
    labelKey: 'tenant.nav.audit',
    href: ROUTES.TENANT.AUDIT,
    status: 'available',
    permission: TENANT_ADMIN_PERMISSIONS.AUDIT_READ,
  },
] as const;

export const ORG_NAV_ITEMS = [
  { key: 'legal-entities', labelKey: 'organisation.nav.legalEntities', href: ROUTES.TENANT.ORGANISATION.LEGAL_ENTITIES },
  { key: 'branches',       labelKey: 'organisation.nav.branches',       href: ROUTES.TENANT.ORGANISATION.BRANCHES },
  { key: 'departments',    labelKey: 'organisation.nav.departments',    href: ROUTES.TENANT.ORGANISATION.DEPARTMENTS },
  { key: 'cost-centres',   labelKey: 'organisation.nav.costCentres',   href: ROUTES.TENANT.ORGANISATION.COST_CENTRES },
  { key: 'positions',      labelKey: 'organisation.nav.positions',      href: ROUTES.TENANT.ORGANISATION.POSITIONS },
  { key: 'grades',         labelKey: 'organisation.grades.title',       href: ROUTES.TENANT.ORGANISATION.GRADES },
] as const;

export const SUPPORTED_COUNTRIES = [
  { code: 'PK', name: 'Pakistan' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
] as const;

export const SUPPORTED_CURRENCIES = [
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'USD', name: 'US Dollar' },
] as const;

export const SUPPORTED_TIMEZONES = [
  { value: 'Asia/Karachi',    label: 'Asia/Karachi (PKT, UTC+5)' },
  { value: 'Asia/Dubai',      label: 'Asia/Dubai (GST, UTC+4)' },
  { value: 'Asia/Riyadh',     label: 'Asia/Riyadh (AST, UTC+3)' },
  { value: 'Europe/London',   label: 'Europe/London (GMT/BST)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
] as const;
