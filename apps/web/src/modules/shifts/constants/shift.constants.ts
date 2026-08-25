export const SHIFT_PERMISSIONS = {
  READ: 'shift.read',
  CREATE: 'shift.create',
  UPDATE: 'shift.update',
} as const;

export const ROSTER_PERMISSIONS = {
  READ: 'roster.read',
  ASSIGN: 'roster.assign',
  OVERRIDE: 'roster.override',
  PUBLISH: 'roster.publish',
} as const;

export const SHIFT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export const SHIFT_KEYS = {
  all: ['shifts'] as const,
  lists: () => [...SHIFT_KEYS.all, 'list'] as const,
  list: (params?: unknown) => [...SHIFT_KEYS.lists(), params] as const,
  details: () => [...SHIFT_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...SHIFT_KEYS.details(), id] as const,
};

export const SHIFT_ASSIGNMENT_KEYS = {
  all: ['shift-assignments'] as const,
  lists: () => [...SHIFT_ASSIGNMENT_KEYS.all, 'list'] as const,
  list: (params?: unknown) =>
    [...SHIFT_ASSIGNMENT_KEYS.lists(), params] as const,
  details: () => [...SHIFT_ASSIGNMENT_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...SHIFT_ASSIGNMENT_KEYS.details(), id] as const,
};

export const ROSTER_KEYS = {
  all: ['rosters'] as const,
  lists: () => [...ROSTER_KEYS.all, 'list'] as const,
  list: (params?: unknown) => [...ROSTER_KEYS.lists(), params] as const,
  details: () => [...ROSTER_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ROSTER_KEYS.details(), id] as const,
};

/** UX hint only — backend ROSTER_MAX_* remain authoritative. */
export const ROSTER_UX_MAX_SPAN_DAYS = 92;
export const ROSTER_UX_CALENDAR_PAGE_SIZE = 2000;

/** Material schedule fields — changing these on an ACTIVE shift creates a new version. */
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
