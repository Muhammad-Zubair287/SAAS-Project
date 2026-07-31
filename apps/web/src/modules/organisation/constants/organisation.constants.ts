import { ROUTES } from '../../../constants/routes.constants';

export const TENANT_NAV_ITEMS = [
  { key: 'dashboard',     labelKey: 'tenant.nav.dashboard',     href: ROUTES.TENANT.DASHBOARD },
  { key: 'organisation',  labelKey: 'tenant.nav.organisation',  href: ROUTES.TENANT.ORGANISATION.ROOT },
  { key: 'employees',     labelKey: 'tenant.nav.employees',     href: ROUTES.TENANT.EMPLOYEES.ROOT },
  { key: 'documents',     labelKey: 'tenant.nav.documents',     href: ROUTES.TENANT.DOCUMENTS.ROOT },
  { key: 'attendance',    labelKey: 'tenant.nav.attendance',    href: ROUTES.TENANT.ATTENDANCE.ROOT },
  { key: 'leave',         labelKey: 'tenant.nav.leave',         href: ROUTES.TENANT.LEAVE },
  { key: 'shifts',        labelKey: 'tenant.nav.shifts',        href: ROUTES.TENANT.SHIFTS },
  { key: 'payroll',       labelKey: 'tenant.nav.payroll',       href: ROUTES.TENANT.PAYROLL },
  { key: 'reports',       labelKey: 'tenant.nav.reports',       href: ROUTES.TENANT.REPORTS },
  { key: 'settings',      labelKey: 'tenant.nav.settings',      href: ROUTES.TENANT.SETTINGS },
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
