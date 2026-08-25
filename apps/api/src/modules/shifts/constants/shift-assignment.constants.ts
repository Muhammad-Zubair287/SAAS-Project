export const SHIFT_ASSIGNMENT_SOURCE = {
  INDIVIDUAL: 'INDIVIDUAL',
  DEPARTMENT: 'DEPARTMENT',
  DEFAULT: 'DEFAULT',
} as const;

export type ShiftAssignmentSource =
  (typeof SHIFT_ASSIGNMENT_SOURCE)[keyof typeof SHIFT_ASSIGNMENT_SOURCE];

/** Inclusive start / exclusive end overlap. Touching boundaries do not overlap. */
export function rangesOverlap(
  aFrom: Date,
  aTo: Date | null | undefined,
  bFrom: Date,
  bTo: Date | null | undefined,
): boolean {
  const aStart = aFrom.getTime();
  const bStart = bFrom.getTime();
  const aEnd = aTo ? aTo.getTime() : Number.POSITIVE_INFINITY;
  const bEnd = bTo ? bTo.getTime() : Number.POSITIVE_INFINITY;
  // Empty / closed ranges (to <= from) never overlap.
  if (aEnd <= aStart || bEnd <= bStart) return false;
  return aStart < bEnd && bStart < aEnd;
}

export function toDateOnly(isoDate: string | Date): Date {
  if (isoDate instanceof Date) {
    return new Date(
      `${isoDate.toISOString().slice(0, 10)}T00:00:00.000Z`,
    );
  }
  return new Date(`${isoDate.slice(0, 10)}T00:00:00.000Z`);
}

export function dateOnlyIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
