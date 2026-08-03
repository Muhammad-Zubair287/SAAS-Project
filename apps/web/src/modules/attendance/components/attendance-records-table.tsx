'use client';

import { useTranslations } from 'next-intl';
import { AttendanceStatusBadge } from './attendance-status-badge';
import type { AttendanceRecord } from '../types/attendance.types';

function formatMinutes(mins: number): string {
  if (mins === 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  records: AttendanceRecord[];
  onViewDetail?: (id: string) => void;
}

export function AttendanceRecordsTable({ records, onViewDetail }: Props) {
  const t = useTranslations();

  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary text-body-md">
        {t('attendance.records.empty.title')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[620px] w-full text-body-sm">
        <thead>
          <tr className="border-b border-border-default text-text-secondary text-left">
            <th className="py-3 px-4 font-medium">{t('attendance.columns.date')}</th>
            <th className="py-3 px-4 font-medium">{t('attendance.columns.checkIn')}</th>
            <th className="py-3 px-4 font-medium">{t('attendance.columns.checkOut')}</th>
            <th className="py-3 px-4 font-medium">{t('attendance.columns.worked')}</th>
            <th className="py-3 px-4 font-medium">{t('attendance.columns.status')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {records.map((record) => (
            <tr
              key={record.id}
              className="hover:bg-surface-canvas cursor-pointer"
              onClick={() => onViewDetail?.(record.id)}
            >
              <td className="py-3 px-4 text-text-primary">{record.attendanceDate}</td>
              <td className="py-3 px-4 text-text-primary">{formatTime(record.firstCheckIn)}</td>
              <td className="py-3 px-4 text-text-primary">{formatTime(record.lastCheckOut)}</td>
              <td className="py-3 px-4 text-text-secondary">
                {formatMinutes(record.totalWorkedMinutes)}
              </td>
              <td className="py-3 px-4">
                <AttendanceStatusBadge status={record.status} size="sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
