export const ROSTER_EVENTS = {
  ASSIGNED:  'RosterAssigned.v1',
  PUBLISHED: 'RosterPublished.v1',
} as const;

export const ROSTER_STATUS = {
  DRAFT:     'DRAFT',
  PUBLISHED: 'PUBLISHED',
} as const;

export type RosterStatus = (typeof ROSTER_STATUS)[keyof typeof ROSTER_STATUS];

export const ROSTER_ASSIGNMENT_SOURCE = {
  INDIVIDUAL:  'INDIVIDUAL',
  DEPARTMENT:  'DEPARTMENT',
  RECURRENCE:  'RECURRENCE',
} as const;

export type RosterAssignmentSource =
  (typeof ROSTER_ASSIGNMENT_SOURCE)[keyof typeof ROSTER_ASSIGNMENT_SOURCE];

export const ROSTER_RECURRENCE_TYPE = {
  DAILY:  'DAILY',
  WEEKLY: 'WEEKLY',
} as const;

export type RosterRecurrenceType =
  (typeof ROSTER_RECURRENCE_TYPE)[keyof typeof ROSTER_RECURRENCE_TYPE];

/** Maximum calendar span (startDate..endDate inclusive) for one creation request. */
export const ROSTER_MAX_SPAN_DAYS = 92;

/** Maximum total rows (employees × dates) a single creation request may generate. */
export const ROSTER_MAX_ROWS = 2000;

/**
 * Bounded page size for GET /rosters calendar range loads.
 * Aligns with ROSTER_MAX_ROWS so one visible range can load without per-cell calls.
 */
export const ROSTER_CALENDAR_MAX_PAGE_SIZE = 2000;

/** Max employeeIds[] filter entries on GET /rosters. */
export const ROSTER_LIST_MAX_EMPLOYEE_IDS = 500;
