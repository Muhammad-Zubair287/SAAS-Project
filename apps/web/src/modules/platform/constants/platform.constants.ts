import { ROUTES } from '../../../constants/routes.constants';
import { PLATFORM_PERMISSIONS } from '../../../lib/permissions/constants';
import type { TenantStatus } from '../types/platform.types';

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

export const PLATFORM_NAV_ITEMS = [
  {
    key: 'dashboard',
    labelKey: 'platform.nav.overview',
    href: ROUTES.PLATFORM.DASHBOARD,
    status: 'available' as const,
    permission: PLATFORM_PERMISSIONS.TENANT_READ,
  },
  {
    key: 'tenants',
    labelKey: 'platform.nav.tenants',
    href: ROUTES.PLATFORM.TENANTS,
    status: 'available' as const,
    permission: PLATFORM_PERMISSIONS.TENANT_READ,
  },
  {
    key: 'plans',
    labelKey: 'platform.nav.plans',
    href: ROUTES.PLATFORM.PLANS,
    status: 'available' as const,
    permission: PLATFORM_PERMISSIONS.TENANT_READ,
  },
  {
    key: 'usage',
    labelKey: 'platform.nav.usage',
    href: ROUTES.PLATFORM.USAGE,
    status: 'available' as const,
    permission: PLATFORM_PERMISSIONS.USAGE_READ,
  },
  {
    key: 'support',
    labelKey: 'platform.nav.supportAccess',
    href: ROUTES.PLATFORM.SUPPORT,
    status: 'available' as const,
    permission: PLATFORM_PERMISSIONS.TENANT_READ,
  },
  {
    key: 'audit',
    labelKey: 'platform.nav.audit',
    href: ROUTES.PLATFORM.AUDIT,
    status: 'available' as const,
    permission: PLATFORM_PERMISSIONS.AUDIT_READ,
  },
  {
    key: 'config',
    labelKey: 'platform.nav.config',
    href: ROUTES.PLATFORM.CONFIG,
    status: 'available' as const,
    permission: PLATFORM_PERMISSIONS.CONFIG_READ,
    children: [
      { key: 'config-general', labelKey: 'platform.nav.configGeneral', href: ROUTES.PLATFORM.CONFIG_GENERAL },
      { key: 'config-security', labelKey: 'platform.nav.configSecurity', href: ROUTES.PLATFORM.CONFIG_SECURITY },
      { key: 'config-retention', labelKey: 'platform.nav.configRetention', href: ROUTES.PLATFORM.CONFIG_RETENTION },
      { key: 'config-regions', labelKey: 'platform.nav.configRegions', href: ROUTES.PLATFORM.CONFIG_REGIONS },
      { key: 'config-notifications', labelKey: 'platform.nav.configNotifications', href: ROUTES.PLATFORM.CONFIG_NOTIFICATIONS },
      { key: 'config-integrations', labelKey: 'platform.nav.configIntegrations', href: ROUTES.PLATFORM.CONFIG_INTEGRATIONS },
      { key: 'config-audit-logging', labelKey: 'platform.nav.configAuditLogging', href: ROUTES.PLATFORM.CONFIG_AUDIT_LOGGING },
    ],
  },
  {
    key: 'integrationHealth',
    labelKey: 'platform.nav.integrationHealth',
    href: ROUTES.PLATFORM.INTEGRATION_HEALTH,
    status: 'available' as const,
    permission: PLATFORM_PERMISSIONS.INTEGRATION_READ,
  },
] as const;

/** ISO 3166-1 alpha-2 launch countries from BRD (Pakistan first, then GCC/UK). */
export const LAUNCH_COUNTRY_CODES = ['PK', 'AE', 'SA', 'GB', 'US'] as const;

/** ISO 4217 codes paired to launch countries. */
export const LAUNCH_CURRENCY_CODES = ['PKR', 'AED', 'SAR', 'GBP', 'USD'] as const;

/** IANA time zones for launch countries. */
export const LAUNCH_TIMEZONES = [
  'Asia/Karachi',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Europe/London',
  'America/New_York',
] as const;

/** BCP 47 locales from API-TEN-001 / M01-FR-003. */
export const LAUNCH_LOCALES = ['en-PK', 'ur-PK'] as const;

export const SUPPORT_GRANT_SCOPE_VALUES = [
  'attendance',
  'payroll',
  'leave',
  'employees',
  'organisation',
  'reports',
  'settings',
  'audit',
] as const;
