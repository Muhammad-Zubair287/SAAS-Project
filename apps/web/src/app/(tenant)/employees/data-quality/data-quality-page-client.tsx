'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { StatCard } from '../../../../components/common/stat-card';
import { ROUTES } from '../../../../constants/routes.constants';
import { useEmployeeDataQuality } from '../../../../modules/employee/hooks/use-employees';

type QualitySampleKey =
  | 'missingManager'
  | 'missingDepartment'
  | 'missingShift'
  | 'missingMandatoryFields'
  | 'missingCompensation';

export function DataQualityPageClient() {
  const t = useTranslations();
  const quality = useEmployeeDataQuality();

  if (quality.isLoading) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center text-text-secondary">
        {t('common.loading')}
      </div>
    );
  }

  if (!quality.data) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-primary p-8 text-center text-text-secondary">
        {t('errors.generic')}
      </div>
    );
  }

  const { totals, samples } = quality.data.data;

  const cards: Array<{
    key: string;
    title: string;
    value: number;
    variant?: 'default' | 'warning' | 'danger';
    sampleKey?: QualitySampleKey;
  }> = [
    {
      key: 'active',
      title: t('employees.dataQuality.activeEmployeesLabel'),
      value: totals.activeEmployees,
    },
    {
      key: 'missingManager',
      title: t('employees.dataQuality.missingManager'),
      value: totals.missingManager,
      variant: 'warning',
      sampleKey: 'missingManager',
    },
    {
      key: 'missingDepartment',
      title: t('employees.dataQuality.missingDepartment'),
      value: totals.missingDepartment,
      variant: 'warning',
      sampleKey: 'missingDepartment',
    },
    {
      key: 'missingShift',
      title: t('employees.dataQuality.missingShift'),
      value: totals.missingShift,
      variant: 'warning',
      sampleKey: 'missingShift',
    },
    {
      key: 'missingMandatoryFields',
      title: t('employees.dataQuality.missingMandatoryFields'),
      value: totals.missingMandatoryFields,
      variant: 'danger',
      sampleKey: 'missingMandatoryFields',
    },
    {
      key: 'duplicateIdentifiers',
      title: t('employees.dataQuality.duplicateIdentifiers'),
      value: totals.duplicateIdentifiers,
      variant: 'danger',
    },
    {
      key: 'expiredDocuments',
      title: t('employees.dataQuality.expiredDocuments'),
      value: totals.expiredDocuments,
      variant: 'warning',
    },
    {
      key: 'inactiveStructure',
      title: t('employees.dataQuality.inactiveStructureAssignments'),
      value: totals.inactiveStructureAssignments,
    },
    {
      key: 'missingCompensation',
      title: t('employees.dataQuality.missingCompensation'),
      value: totals.missingCompensation,
      variant: 'warning',
      sampleKey: 'missingCompensation',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard
            key={card.key}
            title={card.title}
            value={card.value}
            variant={card.variant}
          />
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="text-title-md font-semibold text-text-primary">
          {t('employees.dataQuality.samplesTitle')}
        </h2>
        <p className="text-body-sm text-text-secondary">
          {t('employees.dataQuality.samplesDescription')}
        </p>
        {(
          [
            'missingManager',
            'missingDepartment',
            'missingShift',
            'missingMandatoryFields',
            'missingCompensation',
          ] as QualitySampleKey[]
        ).map((sampleKey) => {
          const ids = samples?.[sampleKey] ?? [];
          if (ids.length === 0) return null;
          return (
            <div
              key={sampleKey}
              className="rounded-xl border border-border-default bg-surface-primary p-4"
            >
              <h3 className="mb-2 text-body-md font-semibold text-text-primary">
                {t(`employees.dataQuality.${sampleKey}`)}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {ids.map((id) => (
                  <li key={id}>
                    <Link
                      href={ROUTES.TENANT.EMPLOYEES.DETAIL(id)}
                      className="rounded-md bg-surface-canvas px-3 py-1.5 text-body-sm font-medium text-brand-blue-700 hover:underline"
                    >
                      {t('employees.dataQuality.openEmployee')}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
