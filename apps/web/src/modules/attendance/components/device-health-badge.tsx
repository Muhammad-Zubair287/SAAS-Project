'use client';

import { useTranslations } from 'next-intl';
import { Badge, type BadgeVariant } from '../../../components/ui/badge';
import type { AttendanceDeviceHealthStatus } from '../types/attendance-capture.types';

const HEALTH_VARIANT: Record<AttendanceDeviceHealthStatus, BadgeVariant> = {
  HEALTHY: 'success',
  DEGRADED: 'warning',
  UNHEALTHY: 'danger',
  OFFLINE: 'neutral',
  SUSPENDED: 'warning',
  DECOMMISSIONED: 'neutral',
};

interface DeviceHealthBadgeProps {
  status: string;
  /** Compact sizing for dense tables. */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Localized device health badge for live API healthStatus values only.
 * Label carries meaning; semantic tokens provide colour support.
 */
export function DeviceHealthBadge({
  status,
  size = 'sm',
  className,
}: DeviceHealthBadgeProps) {
  const t = useTranslations('attendance.deviceHealth.status');
  const known = status as AttendanceDeviceHealthStatus;
  const variant = HEALTH_VARIANT[known] ?? 'neutral';
  const label = HEALTH_VARIANT[known] ? t(known) : status;

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
