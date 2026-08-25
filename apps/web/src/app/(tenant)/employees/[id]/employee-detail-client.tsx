'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHeader } from '../../../../components/common/page-header';
import { LoadingSpinner } from '../../../../components/feedback/loading-spinner';
import { EmployeeStatusBadge } from '../../../../modules/employee/components/employee-status-badge';
import { EmployeeAvatar } from '../../../../modules/employee/components/employee-avatar';
import {
  useEmployee,
  useEmployeeEmployment,
  useEmployeeEmploymentHistory,
  useEmployeePersonalDetail,
  useEmployeeTimeline,
} from '../../../../modules/employee/hooks/use-employees';
import { useEmployeeDocuments, useOnboardingInstances } from '../../../../modules/documents/hooks/use-documents';
import { ROUTES } from '../../../../constants/routes.constants';

interface Labels {
  dashboard: string;
  employees: string;
  detail: string;
}

interface Props {
  id: string;
  labels: Labels;
}

type Tab = 'overview' | 'employment' | 'personal' | 'documents' | 'onboarding' | 'timeline' | 'leave' | 'payroll';

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-label-md font-medium text-text-secondary">{label}</dt>
      <dd className="mt-0.5 text-body-md text-text-primary">{value || '—'}</dd>
    </div>
  );
}

export function EmployeeDetailClient({ id, labels }: Props) {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { data, isLoading, error } = useEmployee(id);
  const { data: personalData, isLoading: personalLoading } = useEmployeePersonalDetail(activeTab === 'personal' ? id : undefined);
  const employment = useEmployeeEmployment(activeTab === 'employment' ? id : undefined);
  const employmentHistory = useEmployeeEmploymentHistory(activeTab === 'employment' ? id : undefined);
  const timeline = useEmployeeTimeline(activeTab === 'timeline' ? id : undefined);
  const documents = useEmployeeDocuments(activeTab === 'documents' ? id : undefined, { pageSize: 20 });
  const onboarding = useOnboardingInstances(activeTab === 'onboarding' ? { employeeId: id, pageSize: 20 } : undefined);

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-border-default bg-surface-primary">
        <p className="text-body-md text-text-secondary">{t('errors.notFound')}</p>
      </div>
    );
  }

  const emp = data.data;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'employment', label: 'Employment' },
    { key: 'personal', label: 'Personal' },
    { key: 'documents', label: 'Documents' },
    { key: 'onboarding', label: 'Onboarding' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'leave', label: 'Leave' },
    { key: 'payroll', label: 'Payroll' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={emp.displayName}
        breadcrumbs={[
          { label: labels.dashboard, href: ROUTES.TENANT.DASHBOARD },
          { label: labels.employees, href: ROUTES.TENANT.EMPLOYEES.ROOT },
          { label: labels.detail },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <EmployeeStatusBadge status={emp.status} />
            <Link
              href={ROUTES.TENANT.EMPLOYEES.EDIT(id)}
              className="rounded-md border border-border-default bg-surface-primary px-3 py-1.5 text-body-sm font-medium text-text-primary hover:bg-surface-canvas transition-colors"
            >
              {t('common.edit')}
            </Link>
            <Link
              href={ROUTES.TENANT.EMPLOYEES.TRANSFER(id)}
              className="rounded-md border border-border-default bg-surface-primary px-3 py-1.5 text-body-sm font-medium text-text-primary hover:bg-surface-canvas transition-colors"
            >
              {t('employees.actions.transfer')}
            </Link>
            <Link
              href={ROUTES.TENANT.EMPLOYEES.STATUS(id)}
              className="rounded-md border border-border-default bg-surface-primary px-3 py-1.5 text-body-sm font-medium text-text-primary hover:bg-surface-canvas transition-colors"
            >
              {t('employees.actions.changeStatus')}
            </Link>
          </div>
        }
      />

      {/* Employee card */}
      <div className="rounded-xl border border-border-default bg-surface-primary p-6">
        <div className="flex items-center gap-4">
          <EmployeeAvatar displayName={emp.displayName} size="lg" />
          <div>
            <p className="text-heading-h3 font-semibold text-text-primary">{emp.displayName}</p>
            <p className="text-body-sm text-text-secondary">{emp.employeeNumber}</p>
            <p className="text-body-sm text-text-secondary">{emp.emailWork}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-default">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-body-md font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-brand-blue-600 text-brand-blue-600'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border-default bg-surface-primary p-6">
            <h2 className="mb-4 text-heading-h3 font-semibold text-text-primary">
              {t('employees.detail.sectionEmployment')}
            </h2>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label={t('employees.fields.employmentType')} value={t(`employees.employmentType.${emp.employmentType}`)} />
              <Field label={t('employees.fields.hireDate')} value={new Date(emp.hireDate).toLocaleDateString()} />
              {emp.terminationDate && (
                <Field label={t('employees.fields.terminationDate')} value={new Date(emp.terminationDate).toLocaleDateString()} />
              )}
              <Field label={t('employees.fields.gender')} value={emp.gender ? t(`employees.gender.${emp.gender}`) : null} />
              <Field label={t('employees.fields.dateOfBirth')} value={emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString() : null} />
              <Field label={t('employees.fields.nationalId')} value={emp.nationalId} />
            </dl>
          </div>

          <div className="rounded-xl border border-border-default bg-surface-primary p-6">
            <h2 className="mb-4 text-heading-h3 font-semibold text-text-primary">
              {t('employees.detail.sectionContact')}
            </h2>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <Field label={t('employees.fields.emailWork')} value={emp.emailWork} />
              <Field label={t('employees.fields.emailPersonal')} value={emp.emailPersonal} />
              <Field label={t('employees.fields.phoneWork')} value={emp.phoneWork} />
              <Field label={t('employees.fields.phoneMobile')} value={emp.phoneMobile} />
            </dl>
          </div>

          <div className="rounded-xl border border-border-default bg-surface-primary p-6">
            <h2 className="mb-4 text-heading-h3 font-semibold text-text-primary">
              {t('organisation.detail.sectionMeta')}
            </h2>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <Field label={t('organisation.detail.id')} value={emp.id} />
              <Field label={t('organisation.detail.created')} value={new Date(emp.createdAt).toLocaleString()} />
              <Field label={t('organisation.detail.updated')} value={new Date(emp.updatedAt).toLocaleString()} />
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'personal' && (
        <div className="rounded-xl border border-border-default bg-surface-primary p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-heading-h3 font-semibold text-text-primary">
              {t('employees.detail.tabPersonal')}
            </h2>
            <Link
              href={`${ROUTES.TENANT.EMPLOYEES.EDIT(id)}?tab=personal`}
              className="rounded-md border border-border-default bg-surface-primary px-3 py-1.5 text-body-sm font-medium text-text-primary hover:bg-surface-canvas transition-colors"
            >
              {t('common.edit')}
            </Link>
          </div>

          {personalLoading ? (
            <div className="flex min-h-32 items-center justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : personalData ? (
            <div className="space-y-6">
              <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label={t('employees.personalDetail.fields.nationality')} value={personalData.data.nationality} />
                <Field label={t('employees.personalDetail.fields.countryOfBirth')} value={personalData.data.countryOfBirth} />
                <Field label={t('employees.personalDetail.fields.maritalStatus')} value={personalData.data.maritalStatus ? t(`employees.maritalStatus.${personalData.data.maritalStatus}`) : null} />
                <Field label={t('employees.personalDetail.fields.addressLine1')} value={personalData.data.addressLine1} />
                <Field label={t('employees.personalDetail.fields.city')} value={personalData.data.city} />
                <Field label={t('employees.personalDetail.fields.countryCode')} value={personalData.data.countryCode} />
              </dl>
              <div>
                <h3 className="mb-3 text-body-md font-semibold text-text-primary">
                  {t('employees.personalDetail.sectionNextOfKin')}
                </h3>
                <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                  <Field label={t('employees.personalDetail.fields.nextOfKinName')} value={personalData.data.nextOfKinName} />
                  <Field label={t('employees.personalDetail.fields.nextOfKinRelationship')} value={personalData.data.nextOfKinRelationship} />
                  <Field label={t('employees.personalDetail.fields.nextOfKinPhone')} value={personalData.data.nextOfKinPhone} />
                </dl>
              </div>
            </div>
          ) : (
            <p className="text-body-md text-text-secondary">{t('employees.personalDetail.notFound')}</p>
          )}
        </div>
      )}

      {activeTab === 'employment' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border-default bg-surface-primary p-6">
            <h2 className="mb-4 text-heading-h3 font-semibold text-text-primary">Employment</h2>
            {employment.isLoading ? (
              <LoadingSpinner size="md" />
            ) : employment.data ? (
              <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <Field label={t('employees.fields.legalEntity')} value={employment.data.data.legalEntityId} />
                <Field label={t('employees.fields.department')} value={employment.data.data.departmentId} />
                <Field label={t('employees.fields.position')} value={employment.data.data.positionId} />
                <Field label={t('employees.fields.manager')} value={employment.data.data.managerId} />
                <Field label={t('employees.fields.hireDate')} value={employment.data.data.effectiveFrom} />
              </dl>
            ) : (
              <p className="text-body-md text-text-secondary">{t('common.noData')}</p>
            )}
          </div>
          <div className="rounded-xl border border-border-default bg-surface-primary p-6">
            <h3 className="mb-4 text-heading-h3 font-semibold text-text-primary">Employment history</h3>
            <div className="space-y-2">
              {(employmentHistory.data?.data ?? []).map((record) => (
                <div key={record.id} className="rounded-md border border-border-default p-3">
                  <p className="text-body-sm font-semibold">{record.changeType}</p>
                  <p className="text-caption text-text-secondary">{record.effectiveFrom} - {record.effectiveTo ?? 'Present'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="rounded-xl border border-border-default bg-surface-primary p-6">
          <h2 className="mb-4 text-heading-h3 font-semibold text-text-primary">Documents</h2>
          <div className="space-y-2">
            {(documents.data?.data ?? []).map((doc) => (
              <div key={doc.id} className="rounded-md border border-border-default p-3">
                <p className="text-body-sm font-semibold">{doc.title}</p>
                <p className="text-caption text-text-secondary">{doc.documentType} - {doc.status}</p>
              </div>
            ))}
            {documents.data?.data?.length === 0 && <p className="text-text-secondary">{t('common.noData')}</p>}
          </div>
        </div>
      )}

      {activeTab === 'onboarding' && (
        <div className="rounded-xl border border-border-default bg-surface-primary p-6">
          <h2 className="mb-4 text-heading-h3 font-semibold text-text-primary">Onboarding</h2>
          <div className="space-y-2">
            {(onboarding.data?.data ?? []).map((item) => (
              <div key={item.id} className="rounded-md border border-border-default p-3">
                <p className="text-body-sm font-semibold">{item.title}</p>
                <p className="text-caption text-text-secondary">{item.status}</p>
              </div>
            ))}
            {onboarding.data?.data?.length === 0 && <p className="text-text-secondary">{t('common.noData')}</p>}
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="rounded-xl border border-border-default bg-surface-primary p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-heading-h3 font-semibold text-text-primary">Timeline</h2>
            <Link href={ROUTES.TENANT.EMPLOYEES.TIMELINE(id)} className="text-body-sm text-brand-blue-600 hover:underline">
              {t('common.view')}
            </Link>
          </div>
          <div className="space-y-2">
            {(timeline.data?.data ?? []).map((event) => (
              <div key={event.id} className="rounded-md border border-border-default p-3">
                <p className="text-body-sm font-semibold">{event.summary}</p>
                <p className="text-caption text-text-secondary">{new Date(event.occurredAt).toLocaleString()}</p>
              </div>
            ))}
            {timeline.data?.data?.length === 0 && <p className="text-text-secondary">{t('common.noData')}</p>}
          </div>
        </div>
      )}

      {(activeTab === 'leave' || activeTab === 'payroll') && (
        <div className="rounded-xl border border-border-default bg-surface-primary p-10 text-center text-text-secondary">
          This section is unavailable in Scope A.
        </div>
      )}
    </div>
  );
}
