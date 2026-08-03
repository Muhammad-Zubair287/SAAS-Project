'use client';

import { useTranslations } from 'next-intl';
import type { AttendanceException } from '../types/attendance.types';

interface Props {
  exceptions: AttendanceException[];
}

export function AttendanceExceptionsTable({ exceptions }: Props) {
  const t = useTranslations();

  if (exceptions.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary text-body-md">
        {t('attendance.exceptions.empty.title')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[620px] w-full text-body-sm">
        <thead>
          <tr className="border-b border-border-default text-text-secondary text-left">
            <th className="py-3 px-4 font-medium">{t('attendance.columns.type')}</th>
            <th className="py-3 px-4 font-medium">{t('attendance.columns.date')}</th>
            <th className="py-3 px-4 font-medium">{t('common.actions')}</th>
            <th className="py-3 px-4 font-medium">{t('attendance.columns.severity')}</th>
            <th className="py-3 px-4 font-medium">{t('attendance.columns.resolved')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {exceptions.map((ex) => (
            <tr key={ex.id} className="hover:bg-surface-canvas">
              <td className="py-3 px-4 text-text-primary font-medium">{ex.exceptionType}</td>
              <td className="py-3 px-4 text-text-primary">{ex.exceptionDate}</td>
              <td className="py-3 px-4 text-text-secondary">{ex.description ?? '—'}</td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    ex.severity === 'ERROR'
                      ? 'bg-red-100 text-red-700'
                      : ex.severity === 'INFO'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {ex.severity}
                </span>
              </td>
              <td className="py-3 px-4">
                {ex.isResolved ? (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                    {t('common.yes')}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
                    {t('common.no')}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
