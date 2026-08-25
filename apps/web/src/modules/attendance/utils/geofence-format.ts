/** Backend-aligned geofence geometry constraints (CreateGeofenceDto / GeofenceService). */
export const GEOFENCE_RADIUS_MIN_METERS = 10;
export const GEOFENCE_RADIUS_MAX_METERS = 100_000;
export const GEOFENCE_NAME_MAX_LENGTH = 200;

/** Keep technical values readable in RTL layouts (pair with dir="ltr"). */
export const TECH_VALUE_CLASS = 'inline-block font-mono tabular-nums text-body-sm';

export function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

export function formatDisplayDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDisplayDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function formatCoordinate(value?: number | null, digits = 6): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

export function isVersionConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: string; statusCode?: number; name?: string };
  return (
    err.code === 'VERSION_CONFLICT' ||
    err.statusCode === 412 ||
    (err.name === 'ApiError' &&
      ((err as { code?: string }).code === 'VERSION_CONFLICT' ||
        (err as { statusCode?: number }).statusCode === 412))
  );
}
