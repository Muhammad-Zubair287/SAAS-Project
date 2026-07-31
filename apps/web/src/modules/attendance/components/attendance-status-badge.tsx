'use client';

import type { AttendanceStatus } from '../types/attendance.types';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; className: string }> = {
  PRESENT:         { label: 'Present',         className: 'bg-green-100 text-green-700' },
  ABSENT:          { label: 'Absent',           className: 'bg-red-100 text-red-700' },
  LATE:            { label: 'Late',             className: 'bg-yellow-100 text-yellow-700' },
  HALF_DAY:        { label: 'Half Day',         className: 'bg-orange-100 text-orange-700' },
  EARLY_DEPARTURE: { label: 'Early Departure',  className: 'bg-amber-100 text-amber-700' },
  MISSING_PUNCH:   { label: 'Missing Punch',    className: 'bg-purple-100 text-purple-700' },
  ON_LEAVE:        { label: 'On Leave',         className: 'bg-blue-100 text-blue-700' },
  HOLIDAY:         { label: 'Holiday',          className: 'bg-teal-100 text-teal-700' },
  WEEKEND:         { label: 'Weekend',          className: 'bg-gray-100 text-gray-500' },
  REMOTE_WORK:     { label: 'Remote',           className: 'bg-indigo-100 text-indigo-700' },
  BUSINESS_TRIP:   { label: 'Business Trip',    className: 'bg-sky-100 text-sky-700' },
};

interface Props {
  status: string;
  size?: 'sm' | 'md';
}

export function AttendanceStatusBadge({ status, size = 'md' }: Props) {
  const cfg =
    STATUS_CONFIG[status as AttendanceStatus] ?? {
      label: status,
      className: 'bg-gray-100 text-gray-600',
    };
  const sz = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-body-sm';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sz} ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
