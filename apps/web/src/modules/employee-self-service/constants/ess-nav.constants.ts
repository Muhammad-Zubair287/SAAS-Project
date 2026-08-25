import { ROUTES } from '../../../constants/routes.constants';
import { ESS_PERMISSIONS } from '../../../lib/permissions/constants';

/**
 * Employee desktop sidebar — UX Specification §7.6 (SCR-EMP-SID-01).
 */
export const EMPLOYEE_NAV_ITEMS = [
  {
    key: 'employee-home',
    labelKey: 'employee.nav.home',
    href: ROUTES.EMPLOYEE.DASHBOARD,
    status: 'available',
    permission: ESS_PERMISSIONS.DASHBOARD_READ,
  },
  {
    key: 'employee-attendance',
    labelKey: 'employee.nav.attendance',
    href: ROUTES.EMPLOYEE.ATTENDANCE,
    status: 'available',
    permission: ESS_PERMISSIONS.RECORD_READ_SELF,
  },
  {
    key: 'employee-leave',
    labelKey: 'employee.nav.leave',
    href: ROUTES.EMPLOYEE.LEAVE,
    status: 'available',
    permission: ESS_PERMISSIONS.LEAVE_REQUEST_READ_SELF,
  },
  {
    key: 'employee-requests',
    labelKey: 'employee.nav.requests',
    href: ROUTES.EMPLOYEE.REQUESTS,
    status: 'available',
    permission: ESS_PERMISSIONS.EMPLOYEE_READ_SELF,
  },
  {
    key: 'employee-payslips',
    labelKey: 'employee.nav.payslips',
    href: ROUTES.EMPLOYEE.PAYSLIPS,
    status: 'available',
    permission: ESS_PERMISSIONS.PAYSLIP_READ_SELF,
  },
  {
    key: 'employee-documents',
    labelKey: 'employee.nav.documents',
    href: ROUTES.EMPLOYEE.DOCUMENTS,
    status: 'available',
    permission: ESS_PERMISSIONS.DOCUMENT_READ_SELF,
  },
  {
    key: 'employee-profile',
    labelKey: 'employee.nav.profile',
    href: ROUTES.EMPLOYEE.PROFILE,
    status: 'available',
    permission: ESS_PERMISSIONS.EMPLOYEE_READ_SELF,
  },
  {
    key: 'employee-notifications',
    labelKey: 'employee.nav.notifications',
    href: ROUTES.EMPLOYEE.NOTIFICATIONS,
    status: 'available',
    permission: ESS_PERMISSIONS.NOTIFICATION_READ_SELF,
  },
  {
    key: 'employee-policies',
    labelKey: 'employee.nav.policies',
    href: ROUTES.EMPLOYEE.POLICIES,
    status: 'available',
    permission: ESS_PERMISSIONS.DOCUMENT_READ_SELF,
  },
  {
    key: 'employee-roster',
    labelKey: 'employee.nav.roster',
    href: ROUTES.EMPLOYEE.ROSTER,
    status: 'available',
    permission: ESS_PERMISSIONS.ROSTER_READ_SELF,
  },
] as const;

/**
 * Mobile bottom navigation — UX Specification §6.2 (SCR-EMP-NAV-02).
 * Maximum five primary destinations; overflow lives under More.
 */
export const EMPLOYEE_BOTTOM_NAV_ITEMS = [
  {
    key: 'home',
    labelKey: 'employee.nav.home',
    href: ROUTES.EMPLOYEE.DASHBOARD,
    match: (pathname: string) => pathname === ROUTES.EMPLOYEE.DASHBOARD,
  },
  {
    key: 'attendance',
    labelKey: 'employee.nav.attendance',
    href: ROUTES.EMPLOYEE.ATTENDANCE,
    match: (pathname: string) => pathname.startsWith(ROUTES.EMPLOYEE.ATTENDANCE),
  },
  {
    key: 'requests',
    labelKey: 'employee.nav.requests',
    href: ROUTES.EMPLOYEE.REQUESTS,
    match: (pathname: string) =>
      pathname.startsWith(ROUTES.EMPLOYEE.REQUESTS) ||
      pathname.startsWith(ROUTES.EMPLOYEE.LEAVE),
  },
  {
    key: 'payslips',
    labelKey: 'employee.nav.payslips',
    href: ROUTES.EMPLOYEE.PAYSLIPS,
    match: (pathname: string) => pathname.startsWith(ROUTES.EMPLOYEE.PAYSLIPS),
  },
  {
    key: 'more',
    labelKey: 'employee.nav.more',
    href: ROUTES.EMPLOYEE.MORE,
    match: (pathname: string) =>
      pathname === ROUTES.EMPLOYEE.MORE ||
      pathname.startsWith(ROUTES.EMPLOYEE.PROFILE) ||
      pathname.startsWith(ROUTES.EMPLOYEE.DOCUMENTS) ||
      pathname.startsWith(ROUTES.EMPLOYEE.NOTIFICATIONS) ||
      pathname.startsWith(ROUTES.EMPLOYEE.POLICIES) ||
      pathname.startsWith(ROUTES.EMPLOYEE.ROSTER),
  },
] as const;

/** Secondary destinations surfaced from the More hub (SCR-ESS-04 adjacent). */
export const EMPLOYEE_MORE_LINKS = [
  {
    key: 'profile',
    labelKey: 'employee.nav.profile',
    href: ROUTES.EMPLOYEE.PROFILE,
    permission: ESS_PERMISSIONS.EMPLOYEE_READ_SELF,
  },
  {
    key: 'documents',
    labelKey: 'employee.nav.documents',
    href: ROUTES.EMPLOYEE.DOCUMENTS,
    permission: ESS_PERMISSIONS.DOCUMENT_READ_SELF,
  },
  {
    key: 'leave',
    labelKey: 'employee.nav.leave',
    href: ROUTES.EMPLOYEE.LEAVE,
    permission: ESS_PERMISSIONS.LEAVE_REQUEST_READ_SELF,
  },
  {
    key: 'notifications',
    labelKey: 'employee.nav.notifications',
    href: ROUTES.EMPLOYEE.NOTIFICATIONS,
    permission: ESS_PERMISSIONS.NOTIFICATION_READ_SELF,
  },
  {
    key: 'policies',
    labelKey: 'employee.nav.policies',
    href: ROUTES.EMPLOYEE.POLICIES,
    permission: ESS_PERMISSIONS.DOCUMENT_READ_SELF,
  },
  {
    key: 'roster',
    labelKey: 'employee.nav.roster',
    href: ROUTES.EMPLOYEE.ROSTER,
    permission: ESS_PERMISSIONS.ROSTER_READ_SELF,
  },
] as const;
