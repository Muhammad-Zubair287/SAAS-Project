/**
 * HR Command Centre (SCR-HR-01) configuration.
 * Windows are overridable via environment for tenant-operational tuning.
 */
function readPositiveInt(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const HR_DASHBOARD_CONSTANTS = {
  /** Documents considered "expiring soon" within this many days. */
  DOCUMENT_EXPIRY_WINDOW_DAYS: readPositiveInt(
    'HR_DASHBOARD_DOCUMENT_EXPIRY_DAYS',
    30,
  ),
  /** Probation ending within this many days surfaces on the dashboard. */
  PROBATION_DUE_WINDOW_DAYS: readPositiveInt(
    'HR_DASHBOARD_PROBATION_DUE_DAYS',
    30,
  ),
  /** Attendance trend series length (calendar days including today). */
  ATTENDANCE_TREND_DAYS: readPositiveInt('HR_DASHBOARD_ATTENDANCE_TREND_DAYS', 7),
  /** Monthly headcount growth series length. */
  HEADCOUNT_GROWTH_MONTHS: readPositiveInt(
    'HR_DASHBOARD_HEADCOUNT_GROWTH_MONTHS',
    6,
  ),
  /** Recent activity feed size. */
  RECENT_ACTIVITY_LIMIT: readPositiveInt('HR_DASHBOARD_RECENT_ACTIVITY_LIMIT', 10),
  ACTIVE_EMPLOYEE_STATUSES: ['ACTIVE', 'PROBATION', 'ON_LEAVE'] as const,
  PRESENT_STATUSES: [
    'PRESENT',
    'LATE',
    'HALF_DAY',
    'REMOTE_WORK',
    'BUSINESS_TRIP',
    'EARLY_DEPARTURE',
  ] as const,
  ON_LEAVE_STATUSES: ['ON_LEAVE', 'ON_APPROVED_LEAVE'] as const,
} as const;
