'use client';

import { useEffect } from 'react';
import { cn } from '../../lib/utils/cn';
import { useToastStore, type Toast, type ToastVariant } from '../../lib/toast/store';

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'border-l-4 border-semantic-success',
  error: 'border-l-4 border-semantic-danger',
  warning: 'border-l-4 border-semantic-warning',
  info: 'border-l-4 border-semantic-info',
};

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast.id, toast.durationMs, dismiss]);

  return (
    <div
      className={cn(
        'pointer-events-auto w-full overflow-hidden rounded-lg border border-border-default bg-surface-primary p-4 shadow-elevation-3',
        VARIANT_CLASSES[toast.variant],
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-label-md font-semibold text-text-primary">{toast.title}</p>
          {toast.description && (
            <p className="mt-1 break-words text-body-sm text-text-secondary">
              {toast.description}
            </p>
          )}
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                dismiss(toast.id);
              }}
              className="mt-2 text-label-md font-semibold text-brand-blue-600 underline-offset-4 hover:underline"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => dismiss(toast.id)}
          aria-label="Dismiss notification"
          className="-mr-2 -mt-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-canvas"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Mounted once in providers.tsx.
 *
 * Two live regions rather than one: errors are assertive (interrupt), the rest
 * polite. A single region cannot vary politeness per message.
 *
 * Positioned bottom on phones (reachable, clear of the top bar) and top-right
 * from `sm` up.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  const assertive = toasts.filter((t) => t.variant === 'error');
  const polite = toasts.filter((t) => t.variant !== 'error');

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col gap-2 p-4 sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-0 sm:w-96"
    >
      <div aria-live="assertive" aria-atomic="false" className="flex flex-col gap-2">
        {assertive.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </div>
      <div aria-live="polite" aria-atomic="false" className="flex flex-col gap-2">
        {polite.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </div>
    </div>
  );
}
