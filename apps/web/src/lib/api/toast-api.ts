import { ApiError } from './types';
import { toast } from '../toast/store';

/** Surface backend error.message (or success message) via toast — never invent copy. */
export function toastApiError(error: unknown, fallback: string): void {
  if (error instanceof ApiError) {
    toast.error(error.message || fallback);
    return;
  }
  if (error instanceof Error && error.message) {
    toast.error(error.message);
    return;
  }
  toast.error(fallback);
}

export function toastApiSuccess(message: string): void {
  toast.success(message);
}

export function maybeToastSuccess(res: unknown): void {
  if (res && typeof res === 'object' && 'message' in res) {
    const message = (res as { message?: string }).message;
    if (message) toastApiSuccess(message);
    return;
  }
  if (res && typeof res === 'object' && 'data' in res) {
    const data = (res as { data?: unknown }).data;
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: string }).message;
      if (message) toastApiSuccess(message);
    }
  }
}
