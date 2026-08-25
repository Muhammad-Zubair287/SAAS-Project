/** Dashboard time-period keys for SCR-PLT-01 (UX Spec §10). */
export const PLATFORM_DASHBOARD_PERIODS = ['today', '7d', '30d', 'month', 'custom'] as const;
export type PlatformDashboardPeriod = (typeof PLATFORM_DASHBOARD_PERIODS)[number] | 'all';
