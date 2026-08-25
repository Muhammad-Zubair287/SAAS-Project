/**
 * Pure validation helpers for M07 Shift foundation (no Jest dependency).
 * Run: node --import tsx (or compile) — invoked via npx ts-node in smoke.
 */
import {
  SHIFT_MATERIAL_FIELDS,
  SHIFT_STATUS,
  SHIFT_TIME_PATTERN,
} from '../src/modules/shifts/constants/shift.constants';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function isValidSchedule(
  start: string,
  end: string,
  crossesMidnight: boolean,
): boolean {
  if (!SHIFT_TIME_PATTERN.test(start) || !SHIFT_TIME_PATTERN.test(end)) {
    return false;
  }
  const startMins = toMinutes(start);
  const endMins = toMinutes(end);
  if (!crossesMidnight && endMins <= startMins) return false;
  if (crossesMidnight && endMins >= startMins) return false;
  return true;
}

assert(SHIFT_TIME_PATTERN.test('09:00'), '09:00 valid');
assert(!SHIFT_TIME_PATTERN.test('24:00'), '24:00 invalid');
assert(SHIFT_MATERIAL_FIELDS.includes('startLocalTime'), 'material start');
assert(!SHIFT_MATERIAL_FIELDS.includes('name' as never), 'name non-material');
assert(SHIFT_STATUS.ACTIVE === 'ACTIVE', 'status');
assert(isValidSchedule('09:00', '17:00', false), 'day ok');
assert(!isValidSchedule('22:00', '06:00', false), 'day overnight rejected');
assert(isValidSchedule('22:00', '06:00', true), 'overnight ok');
assert(!isValidSchedule('09:00', '17:00', true), 'overnight day rejected');

console.log(JSON.stringify({ ok: true, suite: 'shift-foundation-validation' }));
