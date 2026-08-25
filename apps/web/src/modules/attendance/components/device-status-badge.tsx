'use client';

import { useTranslations } from 'next-intl';
import { Badge, type BadgeVariant } from '../../../components/ui/badge';
import type { AttendanceDeviceStatus } from '../types/attendance-capture.types';

const STATUS_VARIANT: Record<AttendanceDeviceStatus, BadgeVariant> = {
  PENDING: 'info',
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  DECOMMISSIONED: 'neutral',
};

interface DeviceStatusBadgeProps {
  status: string;
  /** Compact sizing for dense tables. */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Localized device lifecycle status badge.
 * Meaning is carried by the label text; color is secondary (WCAG + design tokens).
 */
export function DeviceStatusBadge({
  status,
  size = 'sm',
  className,
}: DeviceStatusBadgeProps) {
  const t = useTranslations('attendance.devices.status');
  const known = status as AttendanceDeviceStatus;
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
