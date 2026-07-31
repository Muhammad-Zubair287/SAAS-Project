import type { TenantStatus } from '../types/platform.types';
import { TENANT_STATUS_LABELS, TENANT_STATUS_VARIANTS } from '../constants/platform.constants';

const VARIANT_CLASSES = {
  neutral: 'bg-slate-100 text-slate-600',
  info: 'bg-blue-50 text-semantic-info',
  success: 'bg-green-50 text-semantic-success',
  warning: 'bg-amber-50 text-semantic-warning',
  danger: 'bg-red-50 text-semantic-danger',
  locked: 'bg-slate-200 text-slate-500',
} as const;

interface TenantStatusBadgeProps {
  status: TenantStatus;
  className?: string;
}

export function TenantStatusBadge({ status, className = '' }: TenantStatusBadgeProps) {
  const variant = TENANT_STATUS_VARIANTS[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-label-md font-semibold ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {TENANT_STATUS_LABELS[status]}
    </span>
  );
}
