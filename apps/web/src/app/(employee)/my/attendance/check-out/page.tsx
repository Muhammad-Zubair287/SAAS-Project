'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toastApiError, maybeToastSuccess } from '../../../../../lib/api/toast-api';
import { ROUTES } from '../../../../../constants/routes.constants';
import {
  useEssCheckOut,
  useEssDashboard,
  useEssTodayAttendance,
} from '../../../../../modules/employee-self-service/hooks/use-ess';

const CARD = 'rounded-xl border border-border-default bg-surface-primary p-5';
const PRIMARY =
  'flex min-h-11 w-full items-center justify-center rounded-md bg-brand-blue-600 px-4 py-3 text-body-md font-semibold text-white transition-colors hover:bg-brand-blue-500 disabled:cursor-not-allowed disabled:opacity-50';
const SECONDARY =
  'flex min-h-11 w-full items-center justify-center rounded-md border border-border-default px-4 py-3 text-body-md font-medium text-text-primary';

function formatTime(value?: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(value));
}

function formatMinutes(value: number): string {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${hours}h ${minutes}m`;
}

/** SCR-ATT-03 — Check-out confirmation */
export default function AttendanceCheckOutPage() {
  const t = useTranslations();
  const router = useRouter();
  const dashboard = useEssDashboard();
  const today = useEssTodayAttendance();
  const checkOut = useEssCheckOut();
  const record = today.data?.data.record;
  const action = today.data?.data.suggestedAction ?? dashboard.data?.data.attendance.suggestedAction;

  const onConfirm = async () => {
    try {
      const res = await checkOut.mutateAsync();
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
          {t('ess.attendance.checkOutTitle')}
        </h1>
        <p className="mt-1 text-body-sm text-text-secondary">
          {t('ess.attendance.checkOutDescription')}
        </p>
      </div>

      <section className={`${CARD} space-y-3`}>
        <p className="text-body-md text-text-primary">
          <span className="font-semibold">{t('ess.dashboard.firstCheckIn')}: </span>
          {formatTime(record?.firstCheckIn)}
        </p>
        <p className="text-body-md text-text-primary">
          <span className="font-semibold">{t('ess.attendance.worked')}: </span>
          {formatMinutes(record?.totalWorkedMinutes ?? 0)}
        </p>
        <p className="text-body-md text-text-primary">
          <span className="font-semibold">{t('ess.attendance.overtime')}: </span>
          {formatMinutes(record?.overtimeMinutes ?? 0)}
        </p>
        <p className="text-body-sm text-text-secondary">
          {t('ess.attendance.checkOutWarning')}
        </p>
      </section>

      {action !== 'CHECK_OUT' ? (
        <div className={`${CARD} text-body-md text-semantic-warning`}>
          {t('ess.attendance.cannotCheckOut')}
        </div>
      ) : (
        <button type="button" onClick={() => void onConfirm()} disabled={checkOut.isPending} className={PRIMARY}>
          {checkOut.isPending ? t('common.saving') : t('ess.actions.checkOut')}
        </button>
      )}

      <Link href={ROUTES.EMPLOYEE.DASHBOARD} className={SECONDARY}>
        {t('common.cancel')}
      </Link>
    </div>
  );
}
