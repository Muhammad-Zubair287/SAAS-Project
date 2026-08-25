'use client';

import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';
import { useFieldContext } from './field';

/**
 * Shared control chrome. Replaces 13 mutually inconsistent variants of the same
 * class string (three different focus-ring treatments, one with no ring at all
 * — a WCAG 2.4.7 failure).
 *
 * h-11 meets the 44px touch minimum. text-body-md is 14px; note that iOS zooms
 * on focus for anything under 16px, which is a deliberate trade for density
 * here and applies equally to the markup this replaces.
 */
export const CONTROL_BASE =
  'w-full rounded-md border bg-surface-primary px-3 text-body-md text-text-primary ' +
  'placeholder:text-text-secondary transition-colors ' +
  'focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-600/30 ' +
  'disabled:cursor-not-allowed disabled:bg-surface-canvas disabled:text-text-disabled';

export function controlBorder(invalid: boolean): string {
  return invalid
    ? 'border-semantic-danger focus-visible:border-semantic-danger focus-visible:ring-semantic-danger/30'
    : 'border-border-default focus-visible:border-brand-blue-600';
}

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** `size` is taken by the DOM attribute, so the visual scale is `inputSize`. */
  inputSize?: 'sm' | 'md';
  /** Falls back to the enclosing Field's error state. */
  invalid?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, inputSize = 'md', invalid, leadingIcon, trailingIcon, ...props },
  ref,
) {
  const field = useFieldContext();
  const isInvalid = invalid ?? field?.invalid ?? false;

  const describedBy =
    [field?.descriptionId, field?.errorId].filter(Boolean).join(' ') || undefined;

  const control = (
    <input
      ref={ref}
      id={props.id ?? field?.id}
      required={props.required ?? field?.required}
      aria-invalid={isInvalid || undefined}
      aria-describedby={describedBy}
      className={cn(
        CONTROL_BASE,
        controlBorder(isInvalid),
        inputSize === 'sm' ? 'h-9' : 'h-11',
        leadingIcon && 'pl-10',
        trailingIcon && 'pr-10',
        className,
      )}
      {...props}
    />
  );

  if (!leadingIcon && !trailingIcon) return control;

  return (
    <div className="relative">
      {leadingIcon && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
        >
          {leadingIcon}
        </span>
      )}
      {control}
      {trailingIcon && (
        <span className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-text-secondary">
          {trailingIcon}
        </span>
      )}
    </div>
  );
});
