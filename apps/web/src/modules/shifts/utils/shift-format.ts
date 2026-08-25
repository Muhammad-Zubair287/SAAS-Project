import { ApiError } from '../../../lib/api/types';

export function isVersionConflict(err: unknown): boolean {
  if (err instanceof ApiError) {
    return err.code === 'VERSION_CONFLICT' || err.statusCode === 412;
  }
  const e = err as { code?: string; statusCode?: number; name?: string } | undefined;
  return (
    e?.code === 'VERSION_CONFLICT' ||
    e?.statusCode === 412 ||
    (e?.name === 'ApiError' && e?.code === 'VERSION_CONFLICT')
  );
}

export function formatRequiredHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function hasMaterialFieldChanges(
  original: Record<string, unknown>,
  next: Record<string, unknown>,
  materialFields: readonly string[],
): boolean {
  return materialFields.some((field) => {
    const a = original[field] ?? null;
    const b = next[field] ?? null;
    return String(a) !== String(b);
  });
}
