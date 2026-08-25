export const SHIFT_EVENTS = {
  CREATED: 'ShiftCreated.v1',
  VERSION_PUBLISHED: 'ShiftVersionPublished.v1',
} as const;

export const SHIFT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type ShiftStatus = (typeof SHIFT_STATUS)[keyof typeof SHIFT_STATUS];

/** Fields that change schedule meaning — material edit creates a new business version. */
export const SHIFT_MATERIAL_FIELDS = [
  'startLocalTime',
  'endLocalTime',
  'crossesMidnight',
  'requiredMinutes',
  'breakMinutes',
  'breakPaid',
  'checkInWindowBeforeMinutes',
  'checkInWindowAfterMinutes',
  'checkOutWindowAfterMinutes',
  'attendancePolicyId',
  'effectiveFrom',
  'effectiveTo',
] as const;

/** HH:MM local time (24h). */
export const SHIFT_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const SHIFT_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,59}$/;
