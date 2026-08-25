import type { RosterCalendarView } from '../types/roster.types';

/** Local calendar YYYY-MM-DD (no UTC shift). */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function addDays(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** Monday-start week containing `anchor` (local). */
export function weekRange(anchorIso: string): { dateFrom: string; dateTo: string; days: string[] } {
  const d = parseIsoDate(anchorIso);
  const dow = d.getDay(); // 0 Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const start = new Date(d);
  start.setDate(d.getDate() + mondayOffset);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    days.push(toIsoDate(x));
  }
  return { dateFrom: days[0]!, dateTo: days[6]!, days };
}

export function monthRange(anchorIso: string): {
  dateFrom: string;
  dateTo: string;
  days: string[];
} {
  const d = parseIsoDate(anchorIso);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const days: string[] = [];
  for (let day = 1; day <= end.getDate(); day++) {
    days.push(toIsoDate(new Date(d.getFullYear(), d.getMonth(), day)));
  }
  return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end), days };
}

export function dayRange(anchorIso: string): {
  dateFrom: string;
  dateTo: string;
  days: string[];
} {
  return { dateFrom: anchorIso, dateTo: anchorIso, days: [anchorIso] };
}

export function rangeForView(
  view: RosterCalendarView,
  anchorIso: string,
): { dateFrom: string; dateTo: string; days: string[] } {
  if (view === 'day') return dayRange(anchorIso);
  if (view === 'week') return weekRange(anchorIso);
  return monthRange(anchorIso);
}

export function shiftAnchor(
  view: RosterCalendarView,
  anchorIso: string,
  direction: -1 | 1,
): string {
  if (view === 'day') return addDays(anchorIso, direction);
  if (view === 'week') return addDays(anchorIso, direction * 7);
  const d = parseIsoDate(anchorIso);
  d.setMonth(d.getMonth() + direction);
  return toIsoDate(d);
}

export function cellKey(employeeId: string, workDate: string): string {
  return `${employeeId}_${workDate}`;
}

export function formatShortDay(iso: string, locale: string): string {
  const d = parseIsoDate(iso);
  return d.toLocaleDateString(locale === 'ur' ? 'ur-PK' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
