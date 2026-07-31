import type { ShiftWorkSchedule } from '../interfaces/shift-check-adapter.interface';

export const DEFAULT_WORK_SCHEDULE: ShiftWorkSchedule = {
  workStartTime: '09:00',
  workEndTime: '17:00',
  workMinutesRequired: 480,
  gracePeriodMinutes: 0,
  lateToleranceMinutes: 0,
  earlyDepartureMinutes: 0,
  overtimeThresholdMinutes: 0,
  halfDayThresholdMinutes: 240,
  weekendDays: [0, 6],  // Sunday, Saturday
  timezone: 'UTC',
};

export const ATTENDANCE_STATUS = {
  PRESENT:         'PRESENT',
  ABSENT:          'ABSENT',
  LATE:            'LATE',
  HALF_DAY:        'HALF_DAY',
  EARLY_DEPARTURE: 'EARLY_DEPARTURE',
  MISSING_PUNCH:   'MISSING_PUNCH',
  ON_LEAVE:        'ON_LEAVE',
  HOLIDAY:         'HOLIDAY',
  WEEKEND:         'WEEKEND',
  REMOTE_WORK:     'REMOTE_WORK',
  BUSINESS_TRIP:   'BUSINESS_TRIP',
} as const;

export const ATTENDANCE_EXCEPTION_TYPE = {
  LATE:                 'LATE',
  EARLY_DEPARTURE:      'EARLY_DEPARTURE',
  MISSING_CHECK_IN:     'MISSING_CHECK_IN',
  MISSING_CHECK_OUT:    'MISSING_CHECK_OUT',
  OVERTIME_UNAPPROVED:  'OVERTIME_UNAPPROVED',
} as const;

export const ATTENDANCE_EVENT_TYPE = {
  CHECK_IN:  'CHECK_IN',
  CHECK_OUT: 'CHECK_OUT',
} as const;

export const ATTENDANCE_SOURCE = {
  BIOMETRIC:    'BIOMETRIC',
  MOBILE:       'MOBILE',
  WEB:          'WEB',
  MANUAL:       'MANUAL',
  API:          'API',
  OFFLINE_SYNC: 'OFFLINE_SYNC',
} as const;

export const OFFLINE_SYNC_MAX_DAYS = 7;
