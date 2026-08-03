import type { TenantStatus } from '../types/platform.types';

export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
  DRAFT: 'Draft',
  TRIAL: 'Trial',
  ACTIVE: 'Active',
  GRACE: 'Grace',
  SUSPENDED: 'Suspended',
  CLOSED: 'Closed',
  ARCHIVED: 'Archived',
};

export const TENANT_STATUS_VARIANTS: Record<
  TenantStatus,
  'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'locked'
> = {
  DRAFT: 'neutral',
  TRIAL: 'info',
  ACTIVE: 'success',
  GRACE: 'warning',
  SUSPENDED: 'danger',
  CLOSED: 'locked',
  ARCHIVED: 'locked',
};

export const BILLING_CYCLE_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  annual: 'Annual',
};

/**
 * `status` reflects whether the module has a route under src/app/platform.
 * Items marked 'coming-soon' render as disabled placeholders rather than
 * links that 404. Flip to 'available' when the route lands.
 */
export const PLATFORM_NAV_ITEMS = [
  { key: 'dashboard', labelKey: 'platform.nav.overview', href: '/platform/dashboard', icon: 'LayoutDashboard', status: 'available' },
  { key: 'tenants', labelKey: 'platform.nav.tenants', href: '/platform/tenants', icon: 'Building2', status: 'available' },
  { key: 'plans', labelKey: 'platform.nav.plans', href: '/platform/plans', icon: 'CreditCard', status: 'coming-soon' },
  { key: 'usage', labelKey: 'platform.nav.usage', href: '/platform/usage', icon: 'BarChart3', status: 'coming-soon' },
  { key: 'support', labelKey: 'platform.nav.supportAccess', href: '/platform/support', icon: 'ShieldCheck', status: 'coming-soon' },
  { key: 'audit', labelKey: 'platform.nav.audit', href: '/platform/audit', icon: 'FileText', status: 'coming-soon' },
  { key: 'config', labelKey: 'platform.nav.config', href: '/platform/config', icon: 'Settings', status: 'coming-soon' },
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
  { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT, UTC+5)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4)' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh (AST, UTC+3)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
] as const;

export const HOSTING_REGIONS = [
  { key: 'aws-ap-south-1', label: 'AWS Asia Pacific (Mumbai)', countries: ['PK', 'IN'] },
  { key: 'aws-me-south-1', label: 'AWS Middle East (Bahrain)', countries: ['AE', 'SA'] },
  { key: 'aws-eu-west-2', label: 'AWS Europe (London)', countries: ['GB'] },
  { key: 'aws-us-east-1', label: 'AWS US East (N. Virginia)', countries: ['US'] },
] as const;

export const SUPPORT_GRANT_SCOPES = [
  { value: 'attendance', label: 'Attendance' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'leave', label: 'Leave' },
  { value: 'employees', label: 'Employees' },
  { value: 'organisation', label: 'Organisation' },
  { value: 'reports', label: 'Reports' },
  { value: 'settings', label: 'Settings' },
  { value: 'audit', label: 'Audit' },
] as const;
