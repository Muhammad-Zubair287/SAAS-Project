'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { toastApiError, maybeToastSuccess } from '../../../../../lib/api/toast-api';
import { ROUTES } from '../../../../../constants/routes.constants';
import { useCreateEssRequest } from '../../../../../modules/employee-self-service/hooks/use-ess';

const CARD = 'rounded-xl border border-border-default bg-surface-primary p-5';
const INPUT =
  'w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20';
const PRIMARY =
  'flex min-h-11 w-full items-center justify-center rounded-md bg-brand-blue-600 px-4 py-3 text-body-md font-semibold text-white disabled:opacity-50';

const CORRECTION_TYPES = [
  'ADD_EVENT',
  'CHANGE_TIME',
  'REMOVE_EVENT',
  'STATUS_CORRECTION',
] as const;

/** SCR-ATT-06 — Request attendance correction (employee). */
export default function AttendanceCorrectionPage() {
  const t = useTranslations();
  const router = useRouter();
  const create = useCreateEssRequest();
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [requestedCheckIn, setRequestedCheckIn] = useState('');
  const [requestedCheckOut, setRequestedCheckOut] = useState('');
  const [correctionType, setCorrectionType] = useState<(typeof CORRECTION_TYPES)[number]>('CHANGE_TIME');
  const [reason, setReason] = useState('');

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const res = await create.mutateAsync({
        requestType: 'ATTENDANCE_CORRECTION',
        section: 'ATTENDANCE',
        fieldPath: correctionType,
        currentValue: attendanceDate,
        requestedValue: JSON.stringify({
          attendanceDate,
          requestedCheckIn,
          requestedCheckOut,
          correctionType,
        }),
        reason: reason.trim(),
      });
      maybeToastSuccess(res);
      router.push(ROUTES.EMPLOYEE.REQUEST_DETAIL(res.data.id));
    } catch (error) {
      toastApiError(error, t('errors.generic'));
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <Link href={ROUTES.EMPLOYEE.ATTENDANCE} className="text-body-sm font-semibold text-brand-blue-600">
          {t('common.back')}
        </Link>
        <h1 className="mt-2 text-heading-h2 font-bold text-text-primary">
          {t('ess.attendance.correctionTitle')}
        </h1>
        <p className="mt-1 text-body-sm text-text-secondary">
          {t('ess.attendance.correctionDescription')}
        </p>
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className={`${CARD} space-y-4`}>
        <label className="block space-y-1">
          <span className="text-label-md text-text-secondary">{t('ess.attendance.attendanceDate')}</span>
          <input
            type="date"
            required
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            className={INPUT}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-label-md text-text-secondary">{t('ess.attendance.correctionType')}</span>
          <select
            value={correctionType}
            onChange={(e) => setCorrectionType(e.target.value as (typeof CORRECTION_TYPES)[number])}
            className={INPUT}
          >
            {CORRECTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`ess.attendance.correctionTypes.${type}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-label-md text-text-secondary">{t('ess.attendance.requestedCheckIn')}</span>
          <input
            type="time"
            required
            value={requestedCheckIn}
            onChange={(e) => setRequestedCheckIn(e.target.value)}
            className={INPUT}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-label-md text-text-secondary">{t('ess.attendance.requestedCheckOut')}</span>
          <input
            type="time"
            required
            value={requestedCheckOut}
            onChange={(e) => setRequestedCheckOut(e.target.value)}
            className={INPUT}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-label-md text-text-secondary">{t('ess.fields.reason')}</span>
          <textarea
            required
            maxLength={500}
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={INPUT}
          />
        </label>
        <button type="submit" disabled={create.isPending} className={PRIMARY}>
          {create.isPending ? t('common.saving') : t('ess.actions.submit')}
        </button>
      </form>
    </div>
  );
}
