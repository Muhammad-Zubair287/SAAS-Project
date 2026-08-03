'use client';

import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';
import { Button } from './button';

const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const;

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Required — this is the dialog's accessible name. */
  title: string;
  description?: string;
  size?: keyof typeof SIZE_CLASSES;
  children?: ReactNode;
  footer?: ReactNode;
  /** Set false for dirty forms, so a stray click cannot discard input. */
  closeOnBackdropClick?: boolean;
  closeLabel?: string;
}

/**
 * Built on the native <dialog> with showModal(), which gives focus trapping,
 * Escape-to-close, top-layer stacking (no z-index war with the mobile drawer)
 * and an inert background for free. A portal plus a hand-rolled focus trap
 * would be ~150 lines reimplementing what the browser already does correctly.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  children,
  footer,
  closeOnBackdropClick = true,
  closeLabel = 'Close',
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // Unique per instance — hardcoded ids would collide if two dialogs mount.
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // Escape and the close() call both fire `cancel`/`close`; keep React in sync.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onClose = () => onOpenChange(false);
    el.addEventListener('close', onClose);
    return () => el.removeEventListener('close', onClose);
  }, [onOpenChange]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={(e) => {
        // The backdrop is part of the <dialog> box, so a click landing on the
        // element itself (not its content) means the backdrop was hit.
        if (closeOnBackdropClick && e.target === ref.current) onOpenChange(false);
      }}
      className={cn(
        'w-[calc(100vw-2rem)] rounded-xl border border-border-default bg-surface-primary p-0 text-text-primary shadow-elevation-3',
        'backdrop:bg-black/50',
        'max-h-[calc(100dvh-2rem)] overflow-y-auto',
        SIZE_CLASSES[size],
      )}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-heading-h2 font-semibold text-text-primary">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-body-sm text-text-secondary">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={closeLabel}
            className="-mr-2 -mt-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-canvas"
          >
            <svg
              className="h-5 w-5"
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

        {children && <div className="mt-4">{children}</div>}

        {footer && (
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Replaces `window.confirm`, which the templates list currently uses for a
 * destructive delete.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isLoading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      closeOnBackdropClick={!isLoading}
      closeLabel={cancelLabel}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={() => void onConfirm()}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
