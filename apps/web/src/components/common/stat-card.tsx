'use client';

import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const VARIANT_CLASSES: Record<NonNullable<StatCardProps['variant']>, string> = {
  default: 'border-border-default',
  success: 'border-l-4 border-semantic-success',
  warning: 'border-l-4 border-semantic-warning',
  danger: 'border-l-4 border-semantic-danger',
  info: 'border-l-4 border-semantic-info',
};

const TREND_CLASSES: Record<'up' | 'down' | 'neutral', string> = {
  up: 'text-semantic-success',
  down: 'text-semantic-danger',
  neutral: 'text-text-secondary',
};

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  variant = 'default',
  className = '',
}: StatCardProps) {
  return (
    <div
      className={`rounded-lg border bg-surface-primary p-6 shadow-0 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-label-md text-text-secondary truncate">{title}</p>
          <p className="mt-1 text-metric-lg font-bold text-text-primary tabular-nums">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {description && (
            <p className="mt-1 text-body-sm text-text-secondary">{description}</p>
          )}
          {trend && (
            <p className={`mt-2 text-body-sm font-medium ${TREND_CLASSES[trend.direction]}`}>
              {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '—'}{' '}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 rounded-md bg-surface-canvas p-2 text-text-secondary">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
