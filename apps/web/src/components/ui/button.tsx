'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-blue-600 text-white hover:bg-brand-blue-500 active:bg-brand-blue-600',
  secondary:
    'border border-border-default bg-surface-primary text-text-primary hover:bg-surface-canvas',
  ghost: 'text-text-secondary hover:bg-surface-canvas hover:text-text-primary',
  danger: 'bg-semantic-danger text-white hover:bg-semantic-danger/90',
  link: 'text-brand-blue-600 underline-offset-4 hover:underline',
};

/**
 * Heights meet the 44px touch minimum except `sm`, which is for dense desktop
 * toolbars only — do not use it for primary mobile actions.
 */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-body-sm',
  md: 'h-11 px-4 text-body-md',
  lg: 'h-12 px-6 text-body-lg',
  icon: 'h-11 w-11',
};

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-600 focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50';

export interface ButtonVariantProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

/**
 * Class-string form, for elements that are not <button> — chiefly `next/link`
 * "Create X" actions, which are a large share of the button-shaped elements in
 * the app. Avoids needing a polymorphic `asChild` (Radix Slot is not installed).
 *
 *   <Link href={...} className={buttonVariants({ variant: 'primary' })}>
 */
export function buttonVariants({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: ButtonVariantProps & { className?: string } = {}): string {
  return cn(
    BASE_CLASSES,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth && 'w-full',
    className,
  );
}

export interface ButtonProps
  extends ButtonVariantProps,
    ButtonHTMLAttributes<HTMLButtonElement> {
  /** Shows a spinner and disables the button. Width stays stable. */
  isLoading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant,
      size,
      fullWidth,
      className,
      isLoading = false,
      leadingIcon,
      trailingIcon,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled ?? isLoading}
        aria-busy={isLoading || undefined}
        className={buttonVariants({ variant, size, fullWidth, className })}
        {...props}
      >
        {/*
          The spinner replaces the leading icon rather than the label, so the
          button does not change width mid-submit. Existing forms swap the label
          to "Saving..." and visibly jump.
        */}
        {isLoading ? (
          <span
            aria-hidden="true"
            className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : (
          leadingIcon && (
            <span aria-hidden="true" className="flex-shrink-0">
              {leadingIcon}
            </span>
          )
        )}
        {children}
        {trailingIcon && !isLoading && (
          <span aria-hidden="true" className="flex-shrink-0">
            {trailingIcon}
          </span>
        )}
      </button>
    );
  },
);
