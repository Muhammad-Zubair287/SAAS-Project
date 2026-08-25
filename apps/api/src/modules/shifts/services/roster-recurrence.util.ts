import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import {
  ROSTER_MAX_ROWS,
  ROSTER_MAX_SPAN_DAYS,
  ROSTER_RECURRENCE_TYPE,
  type RosterRecurrenceType,
} from '../constants/roster.constants';
import { toDateOnly } from '../constants/shift-assignment.constants';

export interface ExpandedRosterDate {
  date: Date;
  /** isRestDay=true when the weekday falls in restWeekdays or the whole roster is rest-only. */
  isRestDay: boolean;
}

export interface RecurrenceConfig {
  type: RosterRecurrenceType;
  daysOfWeek?: number[];
}

/**
 * Expand a date range into per-day roster entries.
 *
 * Rules:
 * - DAILY (default): every calendar day in [startDate, endDate] inclusive
 * - WEEKLY: only days whose UTC weekday (0=Sun…6=Sat) is in daysOfWeek
 * - restWeekdays: weekday numbers whose dates should receive isRestDay=true
 * - topLevelIsRest: when the whole request is a rest-day roster, all dates get isRestDay=true
 *
 * Limits (ROSTER_MAX_SPAN_DAYS / ROSTER_MAX_ROWS) are enforced before expansion.
 */
export function expandRosterDates(
  startDateIso: string,
  endDateIso: string,
  recurrence?: RecurrenceConfig,
  restWeekdays?: number[],
  topLevelIsRest = false,
  employeeCount = 1,
): ExpandedRosterDate[] {
  const startDate = toDateOnly(startDateIso);
  const endDate   = toDateOnly(endDateIso);

  if (endDate < startDate) {
    throw new AppException({
      code: ERROR_CODES.ROSTER_INVALID_DATES,
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'endDate must be on or after startDate.',
    });
  }

  const spanDays =
    Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;

  if (spanDays > ROSTER_MAX_SPAN_DAYS) {
    throw new AppException({
      code: ERROR_CODES.ROSTER_RECURRENCE_LIMIT,
      statusCode: HttpStatus.BAD_REQUEST,
      message: `Date span exceeds the maximum of ${ROSTER_MAX_SPAN_DAYS} calendar days.`,
      details: { spanDays, max: ROSTER_MAX_SPAN_DAYS },
    });
  }

  if (recurrence?.type === ROSTER_RECURRENCE_TYPE.WEEKLY) {
    if (!recurrence.daysOfWeek || recurrence.daysOfWeek.length === 0) {
      throw new AppException({
        code: ERROR_CODES.ROSTER_INVALID_DATES,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'daysOfWeek is required for WEEKLY recurrence.',
      });
    }
  }

  const allowedDows: Set<number> | null =
    recurrence?.type === ROSTER_RECURRENCE_TYPE.WEEKLY
      ? new Set(recurrence.daysOfWeek!)
      : null;

  const restDows = new Set(restWeekdays ?? []);
  const expanded: ExpandedRosterDate[] = [];

  const cur = new Date(startDate);
  while (cur <= endDate) {
    const dow = cur.getUTCDay();

    if (allowedDows === null || allowedDows.has(dow)) {
      expanded.push({
        date:      new Date(cur),
        isRestDay: topLevelIsRest || restDows.has(dow),
      });
    }

    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const totalRows = expanded.length * employeeCount;
  if (totalRows > ROSTER_MAX_ROWS) {
    throw new AppException({
      code: ERROR_CODES.ROSTER_RECURRENCE_LIMIT,
      statusCode: HttpStatus.BAD_REQUEST,
      message: `Request would create ${totalRows} rows, exceeding the limit of ${ROSTER_MAX_ROWS}.`,
      details: { totalRows, max: ROSTER_MAX_ROWS, dateCount: expanded.length, employeeCount },
    });
  }

  return expanded;
}
