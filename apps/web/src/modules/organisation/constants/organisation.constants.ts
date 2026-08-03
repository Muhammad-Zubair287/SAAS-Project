import { ROUTES } from '../../../constants/routes.constants';

/**
 * Grouped module navigation.
 *
 * Structure follows the standard HRMS taxonomy (People / Time & Attendance /
 * Payroll / Reports / Settings) rather than a flat list. Notably Leave and
 * Shift Scheduling belong *under* attendance — they were previously top-level
 * siblings, which split one coherent domain across three nav entries.
 *
 * `status` reflects whether the module has a route under src/app/(tenant).
 * Items marked 'coming-soon' render as disabled placeholders rather than links
 * that 404. Flip to 'available' when the route lands.
 */
export const TENANT_NAV_ITEMS = [
  { key: 'dashboard', labelKey: 'tenant.nav.dashboard', href: ROUTES.TENANT.DASHBOARD, status: 'available' },
  {
    key: 'people',
    labelKey: 'tenant.nav.people',
    href: ROUTES.TENANT.EMPLOYEES.ROOT,
    status: 'available',
    children: [
      { key: 'employees',    labelKey: 'tenant.nav.employeeRecords', href: ROUTES.TENANT.EMPLOYEES.ROOT,    status: 'available' },
      { key: 'organisation', labelKey: 'tenant.nav.orgStructure',    href: ROUTES.TENANT.ORGANISATION.ROOT, status: 'available' },
      { key: 'documents',    labelKey: 'tenant.nav.documents',       href: ROUTES.TENANT.DOCUMENTS.ROOT,    status: 'available' },
    ],
  },
  {
    key: 'attendance',
    labelKey: 'tenant.nav.timeAttendance',
    href: ROUTES.TENANT.ATTENDANCE.ROOT,
    status: 'available',
    children: [
      { key: 'attendance-overview', labelKey: 'tenant.nav.attendanceOverview', href: ROUTES.TENANT.ATTENDANCE.ROOT,     status: 'available' },
      { key: 'attendance-records',  labelKey: 'tenant.nav.timeTracking',       href: ROUTES.TENANT.ATTENDANCE.RECORDS,  status: 'available' },
      { key: 'attendance-policies', labelKey: 'tenant.nav.attendancePolicies', href: ROUTES.TENANT.ATTENDANCE.POLICIES, status: 'available' },
      { key: 'leave',               labelKey: 'tenant.nav.leave',              href: ROUTES.TENANT.LEAVE,               status: 'coming-soon' },
      { key: 'shifts',              labelKey: 'tenant.nav.shifts',             href: ROUTES.TENANT.SHIFTS,              status: 'coming-soon' },
    ],
  },
  { key: 'payroll',  labelKey: 'tenant.nav.payroll',  href: ROUTES.TENANT.PAYROLL,  status: 'coming-soon' },
  { key: 'reports',  labelKey: 'tenant.nav.reports',  href: ROUTES.TENANT.REPORTS,  status: 'coming-soon' },
  { key: 'settings', labelKey: 'tenant.nav.settings', href: ROUTES.TENANT.SETTINGS, status: 'coming-soon' },
] as const;

export const ORG_NAV_ITEMS = [
  { key: 'legal-entities', labelKey: 'organisation.nav.legalEntities', href: ROUTES.TENANT.ORGANISATION.LEGAL_ENTITIES },
  { key: 'branches',       labelKey: 'organisation.nav.branches',       href: ROUTES.TENANT.ORGANISATION.BRANCHES },
  { key: 'departments',    labelKey: 'organisation.nav.departments',    href: ROUTES.TENANT.ORGANISATION.DEPARTMENTS },
  { key: 'cost-centres',   labelKey: 'organisation.nav.costCentres',   href: ROUTES.TENANT.ORGANISATION.COST_CENTRES },
  { key: 'positions',      labelKey: 'organisation.nav.positions',      href: ROUTES.TENANT.ORGANISATION.POSITIONS },
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
