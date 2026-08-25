import { ApiError } from '../../../lib/api/types';
import { toast } from '../../../lib/toast/store';

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
