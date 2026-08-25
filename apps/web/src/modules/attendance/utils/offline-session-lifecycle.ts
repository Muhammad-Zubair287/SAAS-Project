import type { OfflineSession } from '../types/attendance-capture.types';

/** Operator actions for offline session recovery — derived from OfflineQueueService. */
export type OfflineSessionUiAction = 'replay' | 'close';

/**
 * Hide impossible/terminal actions for UX. Backend remains authoritative.
 * - Close: only ACTIVE (service sets CLOSED; no guard, but CLOSED/COMPLETED are terminal).
 * - Replay: ACTIVE or CLOSED (COMPLETED means replay already finished successfully).
 */
export function getOfflineSessionActions(
  status: string | null | undefined,
): OfflineSessionUiAction[] {
  const normalized = (status ?? '').toUpperCase();
  switch (normalized) {
    case 'ACTIVE':
      return ['replay', 'close'];
    case 'CLOSED':
      return ['replay'];
    case 'COMPLETED':
    default:
      return [];
  }
}

export function isOfflineSessionOpen(
  session: Pick<OfflineSession, 'endedAt' | 'status'>,
): boolean {
  if (session.endedAt) return false;
  const status = (session.status ?? '').toUpperCase();
  return status === 'ACTIVE' || status === '';
}
