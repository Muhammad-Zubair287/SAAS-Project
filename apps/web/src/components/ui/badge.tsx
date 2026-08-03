'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';

/**
 * Variant names mirror TENANT_STATUS_VARIANTS in platform.constants.ts, which
 * already mapped statuses onto these names but had no component to feed.
 */
export type BadgeVariant =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'locked'
  | 'ai';

/**
 * Every pairing clears 4.5:1. The previous `bg-<colour>/10 text-<colour>`
 * approach used across the status badges measured as low as 2.96:1.
 */
const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-canvas text-text-secondary',
  info: 'bg-semantic-info-bg text-semantic-info-fg',
  success: 'bg-semantic-success-bg text-semantic-success-fg',
  warning: 'bg-semantic-warning-bg text-semantic-warning-fg',
  danger: 'bg-semantic-danger-bg text-semantic-danger-fg',
  locked: 'bg-border-default text-text-primary',
  ai: 'bg-semantic-ai-bg text-semantic-ai-fg',
};

const DOT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-text-secondary',
  info: 'bg-semantic-info',
  success: 'bg-semantic-success',
  warning: 'bg-semantic-warning',
  danger: 'bg-semantic-danger',
  locked: 'bg-text-secondary',
  ai: 'bg-semantic-ai',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  /** Adds a status dot. Decorative — the label still carries the meaning. */
  dot?: boolean;
  children: ReactNode;
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-caption' : 'px-2.5 py-1 text-label-sm',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', DOT_CLASSES[variant])}
        />
      )}
      {children}
    </span>
  );
}
