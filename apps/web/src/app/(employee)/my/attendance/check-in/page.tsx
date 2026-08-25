'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toastApiError, maybeToastSuccess } from '../../../../../lib/api/toast-api';
import { ROUTES } from '../../../../../constants/routes.constants';
import {
  useEssCheckIn,
  useEssDashboard,
  useEssTodayAttendance,
} from '../../../../../modules/employee-self-service/hooks/use-ess';

const CARD = 'rounded-xl border border-border-default bg-surface-primary p-5';
const PRIMARY =
  'flex min-h-11 w-full items-center justify-center rounded-md bg-brand-blue-600 px-4 py-3 text-body-md font-semibold text-white transition-colors hover:bg-brand-blue-500 disabled:cursor-not-allowed disabled:opacity-50';
const SECONDARY =
  'flex min-h-11 w-full items-center justify-center rounded-md border border-border-default px-4 py-3 text-body-md font-medium text-text-primary';

/** SCR-ATT-02 — Check-in confirmation */
export default function AttendanceCheckInPage() {
  const t = useTranslations();
  const router = useRouter();
  const dashboard = useEssDashboard();
  const today = useEssTodayAttendance();
  const checkIn = useEssCheckIn();
  const action = today.data?.data.suggestedAction ?? dashboard.data?.data.attendance.suggestedAction;
  const shift = dashboard.data?.data.todayShift;
  const location = dashboard.data?.data.location;

  const onConfirm = async () => {
    try {
      const res = await checkIn.mutateAsync();
      maybeToastSuccess(res);
      router.replace(ROUTES.EMPLOYEE.ATTENDANCE);
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
          {t('ess.attendance.checkInTitle')}
        </h1>
        <p className="mt-1 text-body-sm text-text-secondary">
          {t('ess.attendance.checkInDescription')}
        </p>
      </div>

      <section className={`${CARD} space-y-3`}>
        <p className="text-body-md text-text-primary">
          <span className="font-semibold">{t('ess.dashboard.location')}: </span>
          {location?.name ?? t('ess.dashboard.locationUnavailable')}
        </p>
        <p className="text-body-md text-text-primary">
          <span className="font-semibold">{t('ess.attendance.currentTime')}: </span>
          {new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date())}
        </p>
        <p className="text-body-md text-text-primary">
          <span className="font-semibold">{t('ess.dashboard.todayShift')}: </span>
          {shift?.isRestDay
            ? t('ess.roster.restDay')
            : shift?.shift
              ? `${shift.shift.startLocalTime} – ${shift.shift.endLocalTime}`
              : t('ess.dashboard.noShift')}
        </p>
        <p className="text-body-sm text-text-secondary">
          {t('ess.attendance.locationConsent')}
        </p>
      </section>

      {action !== 'CHECK_IN' ? (
        <div className={`${CARD} text-body-md text-semantic-warning`}>
          {t('ess.attendance.alreadyCheckedIn')}
        </div>
      ) : (
        <button type="button" onClick={() => void onConfirm()} disabled={checkIn.isPending} className={PRIMARY}>
          {checkIn.isPending ? t('common.saving') : t('ess.actions.checkIn')}
        </button>
      )}

      <Link href={ROUTES.EMPLOYEE.DASHBOARD} className={SECONDARY}>
        {t('common.cancel')}
      </Link>
    </div>
  );
}
