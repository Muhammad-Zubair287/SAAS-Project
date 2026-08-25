'use client';

import { useTranslations } from 'next-intl';
import { Badge, type BadgeVariant } from '../../../components/ui/badge';
import type { AttendanceStatus } from '../types/attendance.types';

const STATUS_VARIANT: Record<AttendanceStatus, BadgeVariant> = {
  PRESENT: 'success',
  ABSENT: 'danger',
  LATE: 'warning',
  HALF_DAY: 'warning',
  EARLY_DEPARTURE: 'warning',
  MISSING_PUNCH: 'danger',
  ON_LEAVE: 'info',
  HOLIDAY: 'info',
  WEEKEND: 'neutral',
  REMOTE_WORK: 'info',
  BUSINESS_TRIP: 'info',
};

interface AttendanceStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Localized attendance record status badge.
 * Visual remediation: design-system Badge + i18n (no raw Tailwind palette colours).
 * Business status semantics are unchanged.
 */
export function AttendanceStatusBadge({
  status,
  size = 'md',
  className,
}: AttendanceStatusBadgeProps) {
  const t = useTranslations('attendance.status');
  const known = status as AttendanceStatus;
  const variant = STATUS_VARIANT[known] ?? 'neutral';
  const label = STATUS_VARIANT[known] ? t(known) : status;

  return (
    <Badge
      variant={variant}
      size={size}
      dot
      className={className}
      title={label}
    >
      {label}
    </Badge>
  );
}
