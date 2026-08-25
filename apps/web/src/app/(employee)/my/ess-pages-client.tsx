'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../components/common/page-header';
import { StatCard } from '../../../components/common/stat-card';
import { ROUTES } from '../../../constants/routes.constants';
import {
  useAcknowledgeEssPolicy,
  useCancelEssRequest,
  useCancelEssLeaveRequest,
  useCreateEssLeaveRequest,
  useCreateEssRequest,
  useEssAttendanceRecords,
  useEssDashboard,
  useEssDocuments,
  useEssLeaveBalances,
  useEssLeaveRequest,
  useEssLeaveRequests,
  useEssLeaveTypes,
  useEssNotifications,
  useEssPayslip,
  useEssPayslips,
  useEssPolicies,
  useEssProfile,
  useEssRequest,
  useEssRequests,
  useEssRoster,
  useEssTodayAttendance,
  useMarkAllEssNotificationsRead,
  useMarkEssNotificationRead,
  usePatchEssProfile,
  useSubmitEssLeaveRequest,
  useSubmitEssRequest,
} from '../../../modules/employee-self-service/hooks/use-ess';
import type {
  CreateEssLeaveRequestPayload,
  CreateEssRequestPayload,
  EssProfileResponse,
  EssRequestType,
  PatchEssProfilePayload,
} from '../../../modules/employee-self-service/types/ess.types';

const CARD_CLASS = 'rounded-xl border border-border-default bg-surface-primary p-5';
const BUTTON_PRIMARY =
  'rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-semibold text-white transition-colors hover:bg-brand-blue-500 disabled:cursor-not-allowed disabled:opacity-50';
const BUTTON_SECONDARY =
  'rounded-md border border-border-default bg-surface-primary px-4 py-2 text-body-md font-medium text-text-primary transition-colors hover:bg-surface-canvas disabled:cursor-not-allowed disabled:opacity-50';
const INPUT_CLASS =
  'w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20';

function formatDate(value?: string | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatTime(value?: string | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(value));
}

function formatMinutes(value: number): string {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${hours}h ${minutes}m`;
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function priorIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const tone =
    ['APPROVED', 'ACTIVE', 'PRESENT', 'READ', 'SUBMITTED', 'PUBLISHED'].includes(normalized)
      ? 'bg-green-50 text-semantic-success'
      : ['CANCELLED', 'REJECTED', 'ABSENT'].includes(normalized)
        ? 'bg-red-50 text-semantic-danger'
        : 'bg-amber-50 text-semantic-warning';

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-label-md font-semibold ${tone}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}

function LoadingPanel() {
  const t = useTranslations();
  return (
    <div className={`${CARD_CLASS} p-8 text-center text-text-secondary`}>
      {t('common.loading')}
    </div>
  );
}

function ErrorPanel() {
  const t = useTranslations();
  return (
    <div className="rounded-xl border border-semantic-danger/30 bg-semantic-danger/5 p-8 text-center text-semantic-danger">
      {t('errors.generic')}
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return <div className={`${CARD_CLASS} text-center text-text-secondary`}>{message}</div>;
}

function EmployeeHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  const t = useTranslations();
  return (
    <PageHeader
      title={title}
      description={description}
      breadcrumbs={[
        { label: t('employee.nav.home'), href: ROUTES.EMPLOYEE.DASHBOARD },
        { label: title },
      ]}
      actions={actions}
    />
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  const t = useTranslations();
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="flex h-11 min-w-11 items-center justify-center rounded-md border border-border-default px-3 text-body-sm disabled:opacity-40"
        aria-label={t('pagination.previousPage')}
      >
        &lt;
      </button>
      <span className="text-body-sm text-text-secondary">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPage(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="flex h-11 min-w-11 items-center justify-center rounded-md border border-border-default px-3 text-body-sm disabled:opacity-40"
        aria-label={t('pagination.nextPage')}
      >
        &gt;
      </button>
    </div>
  );
}

function FieldValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-label-md text-text-secondary">{label}</dt>
      <dd className="mt-1 text-body-md font-medium text-text-primary">{value || '-'}</dd>
    </div>
  );
}

export function EssDashboardPageClient() {
  const t = useTranslations();
  const { data, isLoading, isError } = useEssDashboard();
  const dashboard = data?.data;
  const action = dashboard?.attendance.suggestedAction;
  const leaveTotalDays = (dashboard?.leaveBalances ?? []).reduce(
    (sum, balance) => sum + Number(balance.available ?? 0),
    0,
  );

  return (
    <div className="space-y-5">
      {isLoading && <LoadingPanel />}
      {isError && <ErrorPanel />}

      {!isLoading && !isError && dashboard && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-heading-h2 font-bold text-text-primary">
                {t('ess.dashboard.greeting', { name: dashboard.greetingName })}
              </h1>
              <p className="mt-1 text-body-sm text-text-secondary">
                {formatDate(dashboard.todayDate)}
              </p>
            </div>
          </div>

          <section className={`${CARD_CLASS} space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge
                status={
                  action === 'CHECK_OUT'
                    ? t('ess.dashboard.checkedIn')
                    : action === 'NONE'
                      ? t('ess.dashboard.checkedOut')
                      : t('ess.dashboard.notCheckedIn')
                }
              />
              {action === 'CHECK_IN' && (
                <Link href={ROUTES.EMPLOYEE.ATTENDANCE_CHECK_IN} className={`${BUTTON_PRIMARY} min-h-11`}>
                  {t('ess.actions.checkIn')}
                </Link>
              )}
              {action === 'CHECK_OUT' && (
                <Link href={ROUTES.EMPLOYEE.ATTENDANCE_CHECK_OUT} className={`${BUTTON_PRIMARY} min-h-11`}>
                  {t('ess.actions.checkOut')}
                </Link>
              )}
            </div>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldValue
                label={t('ess.dashboard.todayShift')}
                value={
                  dashboard.todayShift.isRestDay
                    ? t('ess.roster.restDay')
                    : dashboard.todayShift.shift
                      ? `${dashboard.todayShift.shift.startLocalTime} – ${dashboard.todayShift.shift.endLocalTime}`
                      : t('ess.dashboard.noShift')
                }
              />
              <FieldValue
                label={t('ess.dashboard.location')}
                value={dashboard.location?.name ?? t('ess.dashboard.locationUnavailable')}
              />
              <FieldValue
                label={t('ess.dashboard.firstCheckIn')}
                value={formatTime(dashboard.attendance.firstCheckIn)}
              />
              <FieldValue
                label={t('ess.dashboard.workedToday')}
                value={formatMinutes(dashboard.attendance.workedTodayMinutes ?? 0)}
              />
            </dl>
          </section>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Link href={ROUTES.EMPLOYEE.ATTENDANCE} className="block">
              <StatCard
                title={t('ess.dashboard.weeklyWorked')}
                value={formatMinutes(dashboard.weeklyWorkedMinutes ?? 0)}
                className="h-full transition-shadow hover:shadow-elevation-2"
              />
            </Link>
            <Link href={ROUTES.EMPLOYEE.LEAVE} className="block">
              <StatCard
                title={t('ess.dashboard.leaveBalance')}
                value={leaveTotalDays}
                description={t('ess.dashboard.leaveBalanceUnit')}
                className="h-full transition-shadow hover:shadow-elevation-2"
              />
            </Link>
            <Link href={ROUTES.EMPLOYEE.REQUESTS} className="block">
              <StatCard
                title={t('ess.dashboard.pendingRequests')}
                value={dashboard.pendingRequestsCount}
                variant={dashboard.pendingRequestsCount > 0 ? 'warning' : 'default'}
                className="h-full transition-shadow hover:shadow-elevation-2"
              />
            </Link>
            <Link href={ROUTES.EMPLOYEE.PAYSLIPS} className="block">
              <StatCard
                title={t('ess.dashboard.latestPayslip')}
                value={
                  dashboard.payslip
                    ? dashboard.payslip.periodLabel
                    : t('ess.payslips.empty')
                }
                className="h-full transition-shadow hover:shadow-elevation-2"
              />
            </Link>
          </div>

          <section className={CARD_CLASS}>
            <h2 className="text-title-md font-semibold text-text-primary">
              {t('ess.dashboard.quickActions.title')}
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {action === 'CHECK_IN' && (
                <Link href={ROUTES.EMPLOYEE.ATTENDANCE_CHECK_IN} className={`${BUTTON_PRIMARY} min-h-11 text-center`}>
                  {t('ess.actions.checkIn')}
                </Link>
              )}
              {action === 'CHECK_OUT' && (
                <Link href={ROUTES.EMPLOYEE.ATTENDANCE_CHECK_OUT} className={`${BUTTON_PRIMARY} min-h-11 text-center`}>
                  {t('ess.actions.checkOut')}
                </Link>
              )}
              <Link href={ROUTES.EMPLOYEE.LEAVE_NEW} className={`${BUTTON_SECONDARY} min-h-11 text-center`}>
                {t('ess.dashboard.quickActions.requestLeave')}
              </Link>
              <Link href={ROUTES.EMPLOYEE.ATTENDANCE_CORRECTION} className={`${BUTTON_SECONDARY} min-h-11 text-center`}>
                {t('ess.dashboard.quickActions.correctAttendance')}
              </Link>
              <Link href={ROUTES.EMPLOYEE.PAYSLIPS} className={`${BUTTON_SECONDARY} min-h-11 text-center`}>
                {t('ess.dashboard.quickActions.viewPayslip')}
              </Link>
              <Link href={ROUTES.EMPLOYEE.NOTIFICATIONS} className={`${BUTTON_SECONDARY} min-h-11 text-center`}>
                {t('ess.dashboard.quickActions.viewNotifications')}
              </Link>
            </div>
          </section>

          {(dashboard.documentReminder.count > 0 || dashboard.onboardingTask) && (
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {dashboard.documentReminder.count > 0 && (
                <Link href={ROUTES.EMPLOYEE.POLICIES} className={`${CARD_CLASS} block hover:border-brand-blue-300`}>
                  <h3 className="text-title-md font-semibold text-text-primary">
                    {t('ess.dashboard.documents')}
                  </h3>
                  <p className="mt-2 text-body-md text-text-secondary">
                    {t('ess.dashboard.documentReminder', { count: dashboard.documentReminder.count })}
                  </p>
                </Link>
              )}
              {dashboard.onboardingTask && (
                <div className={CARD_CLASS}>
                  <h3 className="text-title-md font-semibold text-text-primary">
                    {t('ess.dashboard.onboarding')}
                  </h3>
                  <p className="mt-2 text-body-md font-medium text-text-primary">
                    {dashboard.onboardingTask.title}
                  </p>
                  <p className="mt-1 text-body-sm text-text-secondary">
                    {t('ess.fields.dueDate')}: {formatDate(dashboard.onboardingTask.dueDate)}
                  </p>
                </div>
              )}
            </section>
          )}

          {dashboard.announcements.length > 0 && (
            <section className={CARD_CLASS}>
              <h2 className="text-title-md font-semibold text-text-primary">
                {t('ess.dashboard.announcements.title')}
              </h2>
              <ul className="mt-3 space-y-2">
                {dashboard.announcements.map((item, index) => (
                  <li key={item.id ?? index} className="text-body-md text-text-secondary">
                    <span className="font-medium text-text-primary">{item.title}</span>
                    {item.body ? ` — ${item.body}` : null}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export function EssAttendancePageClient() {
  const t = useTranslations();
  const [from, setFrom] = useState(priorIso(30));
  const [to, setTo] = useState(todayIso());
  const [page, setPage] = useState(1);
  const today = useEssTodayAttendance();
  const records = useEssAttendanceRecords({ from, to, page, pageSize: 20 });
  const data = records.data?.data ?? [];
  const action = today.data?.data.suggestedAction;

  return (
    <div className="space-y-6">
      <EmployeeHeader
        title={t('ess.attendance.title')}
        description={t('ess.attendance.description')}
        actions={(
          <div className="flex flex-wrap gap-2">
            {action === 'CHECK_IN' && (
              <Link href={ROUTES.EMPLOYEE.ATTENDANCE_CHECK_IN} className={`${BUTTON_PRIMARY} min-h-11`}>
                {t('ess.actions.checkIn')}
              </Link>
            )}
            {action === 'CHECK_OUT' && (
              <Link href={ROUTES.EMPLOYEE.ATTENDANCE_CHECK_OUT} className={`${BUTTON_PRIMARY} min-h-11`}>
                {t('ess.actions.checkOut')}
              </Link>
            )}
            <Link href={ROUTES.EMPLOYEE.ATTENDANCE_CORRECTION} className={`${BUTTON_SECONDARY} min-h-11`}>
              {t('ess.dashboard.quickActions.correctAttendance')}
            </Link>
          </div>
        )}
      />

      {today.isLoading ? (
        <LoadingPanel />
      ) : today.isError ? (
        <ErrorPanel />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title={t('ess.attendance.todayStatus')}
            value={today.data?.data.record?.status ?? t('ess.common.notRecorded')}
          />
          <StatCard
            title={t('ess.dashboard.firstCheckIn')}
            value={formatTime(today.data?.data.record?.firstCheckIn)}
          />
          <StatCard
            title={t('ess.dashboard.lastCheckOut')}
            value={formatTime(today.data?.data.record?.lastCheckOut)}
          />
          <StatCard
            title={t('ess.attendance.worked')}
            value={formatMinutes(today.data?.data.record?.totalWorkedMinutes ?? 0)}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-primary p-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-body-sm font-medium text-text-primary">
          {t('ess.filters.from')}
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={`${INPUT_CLASS} mt-1`} />
        </label>
        <label className="flex-1 text-body-sm font-medium text-text-primary">
          {t('ess.filters.to')}
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={`${INPUT_CLASS} mt-1`} />
        </label>
      </div>

      {records.isLoading && <LoadingPanel />}
      {records.isError && <ErrorPanel />}
      {!records.isLoading && !records.isError && data.length === 0 && <EmptyPanel message={t('ess.attendance.empty')} />}
      {!records.isLoading && !records.isError && data.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border-default bg-surface-primary">
          <table className="min-w-full divide-y divide-border-default text-body-sm">
            <thead className="bg-surface-canvas text-left text-label-md text-text-secondary">
              <tr>
                <th className="px-4 py-3">{t('ess.fields.date')}</th>
                <th className="px-4 py-3">{t('ess.fields.status')}</th>
                <th className="px-4 py-3">{t('ess.dashboard.firstCheckIn')}</th>
                <th className="px-4 py-3">{t('ess.dashboard.lastCheckOut')}</th>
                <th className="px-4 py-3">{t('ess.attendance.worked')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {data.map((record) => (
                <tr key={record.id}>
                  <td className="px-4 py-3">{formatDate(record.attendanceDate)}</td>
                  <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                  <td className="px-4 py-3">{formatTime(record.firstCheckIn)}</td>
                  <td className="px-4 py-3">{formatTime(record.lastCheckOut)}</td>
                  <td className="px-4 py-3">{formatMinutes(record.totalWorkedMinutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={records.data?.meta?.totalPages ?? 1} onPage={setPage} />
    </div>
  );
}

export function EssRequestsPageClient() {
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const requests = useEssRequests({ page, pageSize: 20, type: type || undefined, status: status || undefined });
  const data = requests.data?.data ?? [];

  return (
    <div className="space-y-6">
      <EmployeeHeader
        title={t('ess.requests.title')}
        description={t('ess.requests.description')}
        actions={<Link href={ROUTES.EMPLOYEE.REQUEST_NEW} className={BUTTON_PRIMARY}>{t('ess.actions.newRequest')}</Link>}
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-primary p-4 sm:flex-row">
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className={INPUT_CLASS}>
          <option value="">{t('ess.filters.allTypes')}</option>
          <option value="PROFILE_CHANGE">{t('ess.requestTypes.PROFILE_CHANGE')}</option>
          <option value="ATTENDANCE_CORRECTION">{t('ess.requestTypes.ATTENDANCE_CORRECTION')}</option>
          <option value="DOCUMENT">{t('ess.requestTypes.DOCUMENT')}</option>
          <option value="OTHER">{t('ess.requestTypes.OTHER')}</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={INPUT_CLASS}>
          <option value="">{t('ess.filters.allStatuses')}</option>
          <option value="DRAFT">DRAFT</option>
          <option value="SUBMITTED">SUBMITTED</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      {requests.isLoading && <LoadingPanel />}
      {requests.isError && <ErrorPanel />}
      {!requests.isLoading && !requests.isError && data.length === 0 && <EmptyPanel message={t('ess.requests.empty')} />}
      {!requests.isLoading && !requests.isError && data.length > 0 && (
        <div className="space-y-3">
          {data.map((request) => {
            const content = (
              <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-primary p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-body-md font-semibold text-text-primary">{request.title}</p>
                  <p className="mt-1 text-body-sm text-text-secondary">
                    {request.category.replaceAll('_', ' ')} - {formatDateTime(request.submittedAt)}
                  </p>
                </div>
                <StatusBadge status={request.status} />
              </div>
            );
            return request.type === 'EMPLOYEE_CHANGE_REQUEST' ? (
              <Link key={request.id} href={ROUTES.EMPLOYEE.REQUEST_DETAIL(request.id)} className="block">
                {content}
              </Link>
            ) : (
              <div key={request.id}>{content}</div>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={requests.data?.meta?.totalPages ?? 1} onPage={setPage} />
    </div>
  );
}

export function EssRequestDetailPageClient({ id }: { id: string }) {
  const t = useTranslations();
  const request = useEssRequest(id);
  const submit = useSubmitEssRequest();
  const cancel = useCancelEssRequest();
  const detail = request.data?.data;
  const canSubmit = detail ? ['DRAFT', 'RETURNED'].includes(detail.status) : false;
  const canCancel = detail ? ['SUBMITTED', 'PENDING', 'DRAFT'].includes(detail.status) : false;

  return (
    <div className="space-y-6">
      <EmployeeHeader
        title={t('ess.requests.detailTitle')}
        description={t('ess.requests.detailDescription')}
        actions={<Link href={ROUTES.EMPLOYEE.REQUESTS} className={BUTTON_SECONDARY}>{t('common.back')}</Link>}
      />
      {request.isLoading && <LoadingPanel />}
      {request.isError && <ErrorPanel />}
      {!request.isLoading && !request.isError && detail && (
        <div className={CARD_CLASS}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-heading-h2 font-bold text-text-primary">
                {detail.section || detail.requestType.replaceAll('_', ' ')}
              </h2>
              <p className="mt-1 text-body-md text-text-secondary">{detail.fieldPath ?? detail.requestType}</p>
            </div>
            <StatusBadge status={detail.status} />
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldValue label={t('ess.fields.currentValue')} value={detail.currentValue} />
            <FieldValue label={t('ess.fields.requestedValue')} value={detail.requestedValue} />
            <FieldValue label={t('ess.fields.reason')} value={detail.reason} />
            <FieldValue label={t('ess.fields.createdAt')} value={formatDateTime(detail.timeline.createdAt)} />
            <FieldValue label={t('ess.fields.submittedAt')} value={formatDateTime(detail.timeline.submittedAt)} />
            <FieldValue label={t('ess.fields.decidedAt')} value={formatDateTime(detail.timeline.decidedAt)} />
          </dl>

          {detail.decisionNote && (
            <div className="mt-6 rounded-lg bg-surface-canvas p-4">
              <p className="text-label-md text-text-secondary">{t('ess.fields.decisionNote')}</p>
              <p className="mt-1 text-body-md text-text-primary">{detail.decisionNote}</p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => submit.mutate(id)} disabled={!canSubmit || submit.isPending} className={BUTTON_PRIMARY}>
              {t('ess.actions.submit')}
            </button>
            <button type="button" onClick={() => cancel.mutate(id)} disabled={!canCancel || cancel.isPending} className={BUTTON_SECONDARY}>
              {t('ess.actions.cancelRequest')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function EssNewRequestPageClient() {
  const t = useTranslations();
  const router = useRouter();
  const create = useCreateEssRequest();
  const [requestType, setRequestType] = useState<EssRequestType>('PROFILE_CHANGE');
  const [section, setSection] = useState('');
  const [fieldPath, setFieldPath] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [requestedValue, setRequestedValue] = useState('');
  const [reason, setReason] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: CreateEssRequestPayload = {
      requestType,
      section: emptyToUndefined(section),
      fieldPath: emptyToUndefined(fieldPath),
      currentValue: emptyToUndefined(currentValue),
      requestedValue: emptyToUndefined(requestedValue),
      reason: emptyToUndefined(reason),
      status: 'SUBMITTED',
    };
    create.mutate(payload, {
      onSuccess: (response) => router.push(ROUTES.EMPLOYEE.REQUEST_DETAIL(response.data.id)),
    });
  };

  return (
    <div className="space-y-6">
      <EmployeeHeader title={t('ess.requests.newTitle')} description={t('ess.requests.newDescription')} />
      <form onSubmit={submit} className={`${CARD_CLASS} space-y-4`}>
        <label className="block text-body-sm font-medium text-text-primary">
          {t('ess.fields.requestType')}
          <select value={requestType} onChange={(e) => setRequestType(e.target.value as EssRequestType)} className={`${INPUT_CLASS} mt-1`}>
            <option value="PROFILE_CHANGE">{t('ess.requestTypes.PROFILE_CHANGE')}</option>
            <option value="ATTENDANCE_CORRECTION">{t('ess.requestTypes.ATTENDANCE_CORRECTION')}</option>
            <option value="OTHER">{t('ess.requestTypes.OTHER')}</option>
          </select>
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-body-sm font-medium text-text-primary">
            {t('ess.fields.section')}
            <input value={section} onChange={(e) => setSection(e.target.value)} className={`${INPUT_CLASS} mt-1`} />
          </label>
          <label className="block text-body-sm font-medium text-text-primary">
            {t('ess.fields.fieldPath')}
            <input value={fieldPath} onChange={(e) => setFieldPath(e.target.value)} className={`${INPUT_CLASS} mt-1`} />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-body-sm font-medium text-text-primary">
            {t('ess.fields.currentValue')}
            <input value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} className={`${INPUT_CLASS} mt-1`} />
          </label>
          <label className="block text-body-sm font-medium text-text-primary">
            {t('ess.fields.requestedValue')}
            <input value={requestedValue} onChange={(e) => setRequestedValue(e.target.value)} className={`${INPUT_CLASS} mt-1`} />
          </label>
        </div>
        <label className="block text-body-sm font-medium text-text-primary">
          {t('ess.fields.reason')}
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className={`${INPUT_CLASS} mt-1`} />
        </label>
        {create.isError && <p className="text-body-sm text-semantic-danger">{t('errors.saveFailed')}</p>}
        <button type="submit" disabled={create.isPending} className={BUTTON_PRIMARY}>
          {create.isPending ? t('common.saving') : t('ess.actions.submit')}
        </button>
      </form>
    </div>
  );
}

function profileToForm(profile: EssProfileResponse): Required<PatchEssProfilePayload> {
  return {
    preferredName: profile.personal.preferredName ?? '',
    phoneMobile: profile.contact.phoneMobile ?? '',
    emailPersonal: profile.contact.emailPersonal ?? '',
    addressLine1: profile.contact.address.addressLine1 ?? '',
    addressLine2: profile.contact.address.addressLine2 ?? '',
    city: profile.contact.address.city ?? '',
    stateProvince: profile.contact.address.stateProvince ?? '',
    postalCode: profile.contact.address.postalCode ?? '',
    countryCode: profile.contact.address.countryCode ?? '',
  };
}

export function EssProfilePageClient() {
  const t = useTranslations();
  const profile = useEssProfile();
  const patch = usePatchEssProfile();
  const [form, setForm] = useState<Required<PatchEssProfilePayload> | null>(null);

  useEffect(() => {
    if (profile.data?.data) setForm(profileToForm(profile.data.data));
  }, [profile.data]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
    patch.mutate(form);
  };

  return (
    <div className="space-y-6">
      <EmployeeHeader
        title={t('ess.profile.title')}
        description={t('ess.profile.description')}
        actions={<Link href={ROUTES.EMPLOYEE.REQUEST_NEW} className={BUTTON_SECONDARY}>{t('ess.profile.requestChange')}</Link>}
      />
      {profile.isLoading && <LoadingPanel />}
      {profile.isError && <ErrorPanel />}
      {!profile.isLoading && !profile.isError && profile.data?.data && form && (
        <>
          <div className={CARD_CLASS}>
            <h2 className="text-heading-h2 font-bold text-text-primary">{profile.data.data.personal.displayName}</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FieldValue label={t('ess.fields.employeeNumber')} value={profile.data.data.personal.employeeNumber} />
              <FieldValue label={t('ess.fields.workEmail')} value={profile.data.data.contact.emailWork} />
              <FieldValue label={t('ess.fields.status')} value={<StatusBadge status={profile.data.data.employment.status} />} />
              <FieldValue label={t('ess.fields.department')} value={profile.data.data.location.department?.name} />
              <FieldValue label={t('ess.fields.position')} value={profile.data.data.location.position?.title} />
              <FieldValue label={t('ess.fields.manager')} value={profile.data.data.manager?.displayName} />
            </dl>
          </div>

          <form onSubmit={onSubmit} className={`${CARD_CLASS} space-y-4`}>
            <h3 className="text-title-md font-semibold text-text-primary">{t('ess.profile.directEdit')}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(Object.keys(form) as Array<keyof typeof form>).map((key) => (
                <label key={key} className="block text-body-sm font-medium text-text-primary">
                  {t(`ess.fields.${key}` as Parameters<typeof t>[0])}
                  <input
                    value={form[key]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [key]: key === 'countryCode' ? e.target.value.toUpperCase().slice(0, 2) : e.target.value,
                      })
                    }
                    className={`${INPUT_CLASS} mt-1`}
                  />
                </label>
              ))}
            </div>
            {patch.isError && <p className="text-body-sm text-semantic-danger">{t('errors.saveFailed')}</p>}
            {patch.isSuccess && <p className="text-body-sm text-semantic-success">{t('ess.profile.saved')}</p>}
            <button type="submit" disabled={patch.isPending} className={BUTTON_PRIMARY}>
              {patch.isPending ? t('common.saving') : t('common.save')}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export function EssDocumentsPageClient() {
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const documents = useEssDocuments({ page, pageSize: 20 });
  const data = documents.data?.data ?? [];

  return (
    <div className="space-y-6">
      <EmployeeHeader title={t('ess.documents.title')} description={t('ess.documents.description')} />
      {documents.isLoading && <LoadingPanel />}
      {documents.isError && <ErrorPanel />}
      {!documents.isLoading && !documents.isError && data.length === 0 && <EmptyPanel message={t('ess.documents.empty')} />}
      {!documents.isLoading && !documents.isError && data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((doc) => (
            <div key={doc.id} className={CARD_CLASS}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-title-md font-semibold text-text-primary">{doc.title}</h2>
                  <p className="mt-1 text-body-sm text-text-secondary">{doc.documentType}</p>
                </div>
                <StatusBadge status={doc.status} />
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-3 text-body-sm">
                <FieldValue label={t('ess.fields.issuedDate')} value={formatDate(doc.issuedDate)} />
                <FieldValue label={t('ess.fields.expiryDate')} value={formatDate(doc.expiryDate)} />
                <FieldValue label={t('ess.fields.file')} value={doc.hasFile ? t('ess.documents.fileAvailable') : t('ess.documents.noFile')} />
              </dl>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={documents.data?.meta?.totalPages ?? 1} onPage={setPage} />
    </div>
  );
}

export function EssNotificationsPageClient() {
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'READ' | 'UNREAD' | ''>('');
  const notifications = useEssNotifications({ page, pageSize: 20, status: status || undefined });
  const markRead = useMarkEssNotificationRead();
  const markAll = useMarkAllEssNotificationsRead();
  const data = notifications.data?.data ?? [];

  return (
    <div className="space-y-6">
      <EmployeeHeader
        title={t('ess.notifications.title')}
        description={t('ess.notifications.description')}
        actions={<button type="button" onClick={() => markAll.mutate()} disabled={markAll.isPending} className={BUTTON_SECONDARY}>{t('ess.actions.markAllRead')}</button>}
      />
      <select value={status} onChange={(e) => { setStatus(e.target.value as 'READ' | 'UNREAD' | ''); setPage(1); }} className={`${INPUT_CLASS} max-w-xs`}>
        <option value="">{t('ess.filters.allStatuses')}</option>
        <option value="UNREAD">{t('ess.notifications.unread')}</option>
        <option value="READ">{t('ess.notifications.read')}</option>
      </select>
      {notifications.isLoading && <LoadingPanel />}
      {notifications.isError && <ErrorPanel />}
      {!notifications.isLoading && !notifications.isError && data.length === 0 && <EmptyPanel message={t('ess.notifications.empty')} />}
      {!notifications.isLoading && !notifications.isError && data.length > 0 && (
        <div className="space-y-3">
          {data.map((notification) => (
            <div key={notification.id} className={`${CARD_CLASS} flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between`}>
              <div>
                <p className="text-body-md font-semibold text-text-primary">{notification.title}</p>
                {notification.body && <p className="mt-1 text-body-sm text-text-secondary">{notification.body}</p>}
                <p className="mt-2 text-caption text-text-tertiary">{formatDateTime(notification.createdAt)}</p>
              </div>
              {!notification.readAt ? (
                <button type="button" onClick={() => markRead.mutate(notification.id)} disabled={markRead.isPending} className={BUTTON_SECONDARY}>
                  {t('ess.actions.markRead')}
                </button>
              ) : (
                <StatusBadge status={t('ess.notifications.read')} />
              )}
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={notifications.data?.meta?.totalPages ?? 1} onPage={setPage} />
    </div>
  );
}

export function EssPoliciesPageClient() {
  const t = useTranslations();
  const policies = useEssPolicies();
  const acknowledge = useAcknowledgeEssPolicy();
  const data = policies.data?.data ?? [];

  return (
    <div className="space-y-6">
      <EmployeeHeader title={t('ess.policies.title')} description={t('ess.policies.description')} />
      {policies.isLoading && <LoadingPanel />}
      {policies.isError && <ErrorPanel />}
      {!policies.isLoading && !policies.isError && data.length === 0 && <EmptyPanel message={t('ess.policies.empty')} />}
      {!policies.isLoading && !policies.isError && data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.map((policy) => (
            <div key={policy.id} className={CARD_CLASS}>
              <h2 className="text-title-md font-semibold text-text-primary">{policy.policyTitle}</h2>
              <p className="mt-1 text-body-sm text-text-secondary">
                {policy.documentType} - {t('ess.fields.version')} {policy.policyVersion}
              </p>
              <p className="mt-3 text-body-sm text-text-secondary">
                {t('ess.fields.effectiveDate')}: {formatDate(policy.effectiveDate)}
              </p>
              <button
                type="button"
                onClick={() =>
                  acknowledge.mutate({
                    policyKey: policy.policyKey,
                    policyTitle: policy.policyTitle,
                    policyVersion: policy.policyVersion,
                    effectiveDate: policy.effectiveDate ?? undefined,
                    employeeDocumentId: policy.id,
                  })
                }
                disabled={acknowledge.isPending}
                className={`${BUTTON_PRIMARY} mt-4`}
              >
                {t('ess.actions.acknowledge')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EssRosterPageClient() {
  const t = useTranslations();
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().slice(0, 10);
  });
  const roster = useEssRoster({ from, to });
  const data = roster.data?.data ?? [];

  return (
    <div className="space-y-6">
      <EmployeeHeader title={t('ess.roster.title')} description={t('ess.roster.description')} />
      <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-primary p-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-body-sm font-medium text-text-primary">
          {t('ess.filters.from')}
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${INPUT_CLASS} mt-1`} />
        </label>
        <label className="flex-1 text-body-sm font-medium text-text-primary">
          {t('ess.filters.to')}
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${INPUT_CLASS} mt-1`} />
        </label>
      </div>
      {roster.isLoading && <LoadingPanel />}
      {roster.isError && <ErrorPanel />}
      {!roster.isLoading && !roster.isError && data.length === 0 && <EmptyPanel message={t('ess.roster.empty')} />}
      {!roster.isLoading && !roster.isError && data.length > 0 && (
        <div className="space-y-3">
          {data.map((row) => (
            <div key={row.id} className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-primary p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-body-md font-semibold text-text-primary">{formatDate(row.workDate)}</p>
                <p className="mt-1 text-body-sm text-text-secondary">
                  {row.isRestDay
                    ? t('ess.roster.restDay')
                    : row.shift
                      ? `${row.shift.name} (${row.shift.startLocalTime} - ${row.shift.endLocalTime})`
                      : t('ess.dashboard.noShift')}
                </p>
                {row.branch && <p className="mt-1 text-body-sm text-text-secondary">{row.branch.name}</p>}
              </div>
              <StatusBadge status={row.rosterStatus} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EssLeavePageClient() {
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const balances = useEssLeaveBalances();
  const requests = useEssLeaveRequests({ page, pageSize: 20, status: status || undefined });
  const data = requests.data?.data ?? [];
  const pendingCount = data.filter((request) => request.status === 'SUBMITTED').length;
  const upcoming = data.find((request) => request.status === 'APPROVED' && request.startsOn >= todayIso());

  return (
    <div className="space-y-6">
      <EmployeeHeader
        title={t('ess.leave.title')}
        description={t('ess.leave.description')}
        actions={<Link href={ROUTES.EMPLOYEE.LEAVE_NEW} className={BUTTON_PRIMARY}>{t('ess.leave.requestLeave')}</Link>}
      />

      {balances.isLoading && <LoadingPanel />}
      {balances.isError && <ErrorPanel />}
      {!balances.isLoading && !balances.isError && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(balances.data?.data ?? []).map((balance) => (
            <StatCard
              key={balance.leaveTypeId}
              title={balance.name}
              value={`${balance.available} ${balance.unit.toLowerCase()}`}
              description={t('ess.leave.pendingReserved', { count: balance.pendingReserved })}
            />
          ))}
          {(balances.data?.data ?? []).length === 0 && (
            <div className="sm:col-span-2 xl:col-span-4">
              <EmptyPanel message={t('ess.leave.noBalances')} />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard title={t('ess.leave.pendingRequests')} value={pendingCount} />
        <StatCard
          title={t('ess.leave.upcoming')}
          value={upcoming ? `${upcoming.leaveType.name} · ${formatDate(upcoming.startsOn)}` : t('common.empty')}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-primary p-4 sm:flex-row">
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={INPUT_CLASS}>
          <option value="">{t('ess.filters.allStatuses')}</option>
          <option value="DRAFT">DRAFT</option>
          <option value="SUBMITTED">SUBMITTED</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="RETURNED">RETURNED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>
      </div>

      {requests.isLoading && <LoadingPanel />}
      {requests.isError && <ErrorPanel />}
      {!requests.isLoading && !requests.isError && data.length === 0 && <EmptyPanel message={t('ess.leave.empty')} />}
      {!requests.isLoading && !requests.isError && data.length > 0 && (
        <div className="space-y-3">
          {data.map((request) => (
            <Link key={request.id} href={ROUTES.EMPLOYEE.LEAVE_DETAIL(request.id)} className="block">
              <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-primary p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-body-md font-semibold text-text-primary">{request.leaveType.name}</p>
                  <p className="mt-1 text-body-sm text-text-secondary">
                    {formatDate(request.startsOn)} - {formatDate(request.endsOn)} · {request.requestedQuantity}{' '}
                    {request.leaveType.unit.toLowerCase()}
                  </p>
                </div>
                <StatusBadge status={request.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={requests.data?.meta?.totalPages ?? 1} onPage={setPage} />
    </div>
  );
}

export function EssNewLeaveRequestPageClient() {
  const t = useTranslations();
  const router = useRouter();
  const types = useEssLeaveTypes();
  const create = useCreateEssLeaveRequest();
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startsOn, setStartsOn] = useState(todayIso());
  const [endsOn, setEndsOn] = useState(todayIso());
  const [dayPart, setDayPart] = useState<'FULL' | 'FIRST_HALF' | 'SECOND_HALF'>('FULL');
  const [reason, setReason] = useState('');
  const [emergency, setEmergency] = useState(false);

  useEffect(() => {
    const first = types.data?.data[0]?.id;
    if (!leaveTypeId && first) setLeaveTypeId(first);
  }, [leaveTypeId, types.data]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: CreateEssLeaveRequestPayload = {
      leaveTypeId,
      startsOn,
      endsOn,
      dayPart,
      halfDay: dayPart !== 'FULL',
      reason: emptyToUndefined(reason),
      emergency,
      status: 'SUBMITTED',
    };
    create.mutate(payload, {
      onSuccess: (response) => router.push(ROUTES.EMPLOYEE.LEAVE_DETAIL(response.data.id)),
    });
  };

  return (
    <div className="space-y-6">
      <EmployeeHeader
        title={t('ess.leave.newTitle')}
        description={t('ess.leave.newDescription')}
        actions={<Link href={ROUTES.EMPLOYEE.LEAVE} className={BUTTON_SECONDARY}>{t('common.back')}</Link>}
      />
      {types.isLoading && <LoadingPanel />}
      {types.isError && <ErrorPanel />}
      {!types.isLoading && !types.isError && (types.data?.data ?? []).length === 0 && <EmptyPanel message={t('ess.leave.noTypes')} />}
      {!types.isLoading && !types.isError && (types.data?.data ?? []).length > 0 && (
        <form onSubmit={onSubmit} className={`${CARD_CLASS} space-y-4`}>
          <label className="block text-body-sm font-medium text-text-primary">
            {t('ess.leave.leaveType')}
            <select value={leaveTypeId} onChange={(event) => setLeaveTypeId(event.target.value)} className={`${INPUT_CLASS} mt-1`} required>
              {(types.data?.data ?? []).map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-body-sm font-medium text-text-primary">
              {t('ess.filters.from')}
              <input type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} className={`${INPUT_CLASS} mt-1`} required />
            </label>
            <label className="block text-body-sm font-medium text-text-primary">
              {t('ess.filters.to')}
              <input type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} className={`${INPUT_CLASS} mt-1`} required />
            </label>
          </div>
          <label className="block text-body-sm font-medium text-text-primary">
            {t('ess.leave.dayPart')}
            <select value={dayPart} onChange={(event) => setDayPart(event.target.value as typeof dayPart)} className={`${INPUT_CLASS} mt-1`}>
              <option value="FULL">{t('ess.leave.dayParts.FULL')}</option>
              <option value="FIRST_HALF">{t('ess.leave.dayParts.FIRST_HALF')}</option>
              <option value="SECOND_HALF">{t('ess.leave.dayParts.SECOND_HALF')}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-body-sm font-medium text-text-primary">
            <input type="checkbox" checked={emergency} onChange={(event) => setEmergency(event.target.checked)} />
            {t('ess.leave.emergency')}
          </label>
          <label className="block text-body-sm font-medium text-text-primary">
            {t('ess.fields.reason')}
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className={`${INPUT_CLASS} mt-1`} />
          </label>
          {create.isError && <p className="text-body-sm text-semantic-danger">{t('errors.saveFailed')}</p>}
          <button type="submit" disabled={create.isPending || !leaveTypeId} className={BUTTON_PRIMARY}>
            {create.isPending ? t('common.saving') : t('ess.actions.submit')}
          </button>
        </form>
      )}
    </div>
  );
}

export function EssLeaveDetailPageClient({ id }: { id: string }) {
  const t = useTranslations();
  const request = useEssLeaveRequest(id);
  const submit = useSubmitEssLeaveRequest();
  const cancel = useCancelEssLeaveRequest();
  const detail = request.data?.data;
  const canSubmit = detail ? ['DRAFT', 'RETURNED'].includes(detail.status) : false;
  const canCancel = detail ? ['DRAFT', 'SUBMITTED'].includes(detail.status) : false;

  return (
    <div className="space-y-6">
      <EmployeeHeader
        title={t('ess.leave.detailTitle')}
        description={t('ess.leave.detailDescription')}
        actions={<Link href={ROUTES.EMPLOYEE.LEAVE} className={BUTTON_SECONDARY}>{t('common.back')}</Link>}
      />
      {request.isLoading && <LoadingPanel />}
      {request.isError && <ErrorPanel />}
      {!request.isLoading && !request.isError && detail && (
        <div className={CARD_CLASS}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-heading-h2 font-bold text-text-primary">{detail.leaveType.name}</h2>
              <p className="mt-1 text-body-md text-text-secondary">
                {formatDate(detail.startsOn)} - {formatDate(detail.endsOn)}
              </p>
            </div>
            <StatusBadge status={detail.status} />
          </div>
          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldValue label={t('ess.leave.quantity')} value={`${detail.requestedQuantity} ${detail.leaveType.unit.toLowerCase()}`} />
            <FieldValue label={t('ess.fields.reason')} value={detail.reason} />
            <FieldValue label={t('ess.fields.submittedAt')} value={formatDateTime(detail.submittedAt)} />
            <FieldValue label={t('ess.fields.decidedAt')} value={formatDateTime(detail.decidedAt)} />
          </dl>
          <div className="mt-6 overflow-hidden rounded-lg border border-border-default">
            <table className="min-w-full divide-y divide-border-default text-body-sm">
              <thead className="bg-surface-canvas text-left text-label-md text-text-secondary">
                <tr>
                  <th className="px-4 py-3">{t('ess.fields.date')}</th>
                  <th className="px-4 py-3">{t('ess.leave.dayPart')}</th>
                  <th className="px-4 py-3">{t('ess.leave.quantity')}</th>
                  <th className="px-4 py-3">{t('ess.leave.payrollImpact')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {detail.days.map((day) => (
                  <tr key={day.id}>
                    <td className="px-4 py-3">{formatDate(day.leaveDate)}</td>
                    <td className="px-4 py-3">{t(`ess.leave.dayParts.${day.dayPart}` as Parameters<typeof t>[0])}</td>
                    <td className="px-4 py-3">{day.quantity}</td>
                    <td className="px-4 py-3">{day.payrollImpact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => submit.mutate(id)} disabled={!canSubmit || submit.isPending} className={BUTTON_PRIMARY}>
              {t('ess.actions.submit')}
            </button>
            <button type="button" onClick={() => cancel.mutate(id)} disabled={!canCancel || cancel.isPending} className={BUTTON_SECONDARY}>
              {t('ess.actions.cancelRequest')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function EssPayslipsPageClient() {
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const payslips = useEssPayslips({ page, pageSize: 20 });
  const data = payslips.data?.data ?? [];

  return (
    <div className="space-y-6">
      <EmployeeHeader title={t('ess.payslips.title')} description={t('ess.payslips.description')} />
      {payslips.isLoading && <LoadingPanel />}
      {payslips.isError && <ErrorPanel />}
      {!payslips.isLoading && !payslips.isError && data.length === 0 && <EmptyPanel message={t('ess.payslips.empty')} />}
      {!payslips.isLoading && !payslips.isError && data.length > 0 && (
        <div className="space-y-3">
          {data.map((payslip) => (
            <Link key={payslip.id} href={ROUTES.EMPLOYEE.PAYSLIP_DETAIL(payslip.id)} className="block">
              <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-primary p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-body-md font-semibold text-text-primary">{payslip.periodLabel}</p>
                  <p className="mt-1 text-body-sm text-text-secondary">
                    {formatDate(payslip.periodStart)} - {formatDate(payslip.periodEnd)}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-body-md font-semibold text-text-primary">{formatMoney(payslip.netAmount, payslip.currency)}</p>
                  <p className="text-body-sm text-text-secondary">{t('ess.payslips.netPay')}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={payslips.data?.meta?.totalPages ?? 1} onPage={setPage} />
    </div>
  );
}

export function EssPayslipDetailPageClient({ id }: { id: string }) {
  const t = useTranslations();
  const payslip = useEssPayslip(id);
  const detail = payslip.data?.data;
  const earnings = Array.isArray(detail?.earnings) ? detail.earnings : [];
  const deductions = Array.isArray(detail?.deductions) ? detail.deductions : [];
  const lineAmount = (line: unknown) => {
    if (line && typeof line === 'object' && 'amount' in line) return Number((line as { amount?: number }).amount ?? 0);
    return 0;
  };
  const lineLabel = (line: unknown, fallback: string) => {
    if (line && typeof line === 'object' && 'label' in line) return String((line as { label?: string }).label ?? fallback);
    if (line && typeof line === 'object' && 'name' in line) return String((line as { name?: string }).name ?? fallback);
    return fallback;
  };

  return (
    <div className="space-y-6">
      <EmployeeHeader
        title={t('ess.payslips.detailTitle')}
        description={t('ess.payslips.detailDescription')}
        actions={<Link href={ROUTES.EMPLOYEE.PAYSLIPS} className={BUTTON_SECONDARY}>{t('common.back')}</Link>}
      />
      {payslip.isLoading && <LoadingPanel />}
      {payslip.isError && <ErrorPanel />}
      {!payslip.isLoading && !payslip.isError && detail && (
        <>
          <div className={CARD_CLASS}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-heading-h2 font-bold text-text-primary">{detail.periodLabel}</h2>
                <p className="mt-1 text-body-md text-text-secondary">
                  {formatDate(detail.periodStart)} - {formatDate(detail.periodEnd)}
                </p>
              </div>
              <StatusBadge status={detail.status} />
            </div>
            <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FieldValue label={t('ess.payslips.grossPay')} value={formatMoney(detail.grossAmount, detail.currency)} />
              <FieldValue label={t('ess.payslips.netPay')} value={formatMoney(detail.netAmount, detail.currency)} />
              <FieldValue label={t('ess.fields.submittedAt')} value={formatDateTime(detail.publishedAt)} />
            </dl>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={CARD_CLASS}>
              <h3 className="text-title-md font-semibold text-text-primary">{t('ess.payslips.earnings')}</h3>
              <div className="mt-4 space-y-2">
                {earnings.length === 0 && <p className="text-body-sm text-text-secondary">{t('common.empty')}</p>}
                {earnings.map((line, index) => (
                  <div key={index} className="flex justify-between text-body-sm">
                    <span>{lineLabel(line, `${t('ess.payslips.earning')} ${index + 1}`)}</span>
                    <span className="font-semibold">{formatMoney(lineAmount(line), detail.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={CARD_CLASS}>
              <h3 className="text-title-md font-semibold text-text-primary">{t('ess.payslips.deductions')}</h3>
              <div className="mt-4 space-y-2">
                {deductions.length === 0 && <p className="text-body-sm text-text-secondary">{t('common.empty')}</p>}
                {deductions.map((line, index) => (
                  <div key={index} className="flex justify-between text-body-sm">
                    <span>{lineLabel(line, `${t('ess.payslips.deduction')} ${index + 1}`)}</span>
                    <span className="font-semibold">{formatMoney(lineAmount(line), detail.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function EssComingSoonPageClient({ kind }: { kind: 'leave' | 'payslips' }) {
  const t = useTranslations();
  const dashboard = useEssDashboard();
  const available = useMemo(() => {
    if (kind === 'leave') return dashboard.data?.data.modules.leaveAvailable;
    return dashboard.data?.data.modules.payslipAvailable;
  }, [dashboard.data, kind]);

  return (
    <div className="space-y-6">
      <EmployeeHeader
        title={kind === 'leave' ? t('employee.nav.leave') : t('employee.nav.payslips')}
        description={t('ess.comingSoon.description')}
      />
      {dashboard.isLoading && <LoadingPanel />}
      {dashboard.isError && <ErrorPanel />}
      {!dashboard.isLoading && !dashboard.isError && (
        <div className={`${CARD_CLASS} p-8 text-center`}>
          <h2 className="text-heading-h2 font-bold text-text-primary">{t('ess.comingSoon.title')}</h2>
          <p className="mx-auto mt-2 max-w-xl text-body-md text-text-secondary">
            {available ? t('ess.comingSoon.notImplemented') : t('ess.comingSoon.moduleUnavailable')}
          </p>
        </div>
      )}
    </div>
  );
}
