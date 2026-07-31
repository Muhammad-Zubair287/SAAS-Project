'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useEmployee,
  useUpdateEmployee,
  useEmployeePersonalDetail,
  useUpsertPersonalDetail,
} from '../../../../../modules/employee/hooks/use-employees';
import { useLegalEntities } from '../../../../../modules/organisation/hooks/use-legal-entities';
import { useBranches } from '../../../../../modules/organisation/hooks/use-branches';
import { useDepartments } from '../../../../../modules/organisation/hooks/use-departments';
import { usePositions } from '../../../../../modules/organisation/hooks/use-positions';
import { SearchableSelect, type SelectOption } from '../../../../../components/common/searchable-select';
import { ManagerSelect } from '../../../../../modules/employee/components/manager-select';
import { LoadingSpinner } from '../../../../../components/feedback/loading-spinner';
import { ROUTES } from '../../../../../constants/routes.constants';
import type {
  UpdateEmployeePayload,
  UpsertPersonalDetailPayload,
  EmploymentType,
  EmployeeGender,
  EmployeeStatus,
  MaritalStatus,
} from '../../../../../modules/employee/types/employee.types';

interface Props {
  id: string;
}

const EMPLOYMENT_TYPES: EmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];
const GENDERS: EmployeeGender[] = ['MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED'];
const STATUSES: EmployeeStatus[] = ['ACTIVE', 'PROBATION', 'ON_LEAVE', 'INACTIVE'];
const MARITAL_STATUSES: MaritalStatus[] = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED', 'UNDISCLOSED'];

const INPUT_CLS =
  'w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md text-text-primary placeholder:text-text-secondary focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border-default bg-surface-primary p-6 space-y-4">
      <h2 className="text-heading-h3 font-semibold text-text-primary">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-label-md font-medium text-text-primary mb-1">
        {label} {required && <span className="text-semantic-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

function toOptions<T extends { id: string; name?: string; title?: string; code?: string }>(
  items: T[],
): SelectOption[] {
  return items.map((item) => ({
    value: item.id,
    label: (item.name ?? item.title ?? item.id),
    sublabel: item.code ?? undefined,
  }));
}

export function EditEmployeeForm({ id }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'personal' ? 'personal' : 'profile';

  const { data, isLoading } = useEmployee(id);
  const { data: personalData } = useEmployeePersonalDetail(id);
  const updateEmployee = useUpdateEmployee(id, data?.data.rowVersion);
  const upsertPersonal = useUpsertPersonalDetail(id);

  const [activeTab, setActiveTab] = useState<'profile' | 'personal'>(initialTab);
  const [profileForm, setProfileForm] = useState<UpdateEmployeePayload & { legalEntityId?: string }>({});
  const [personalForm, setPersonalForm] = useState<UpsertPersonalDetailPayload>({});
  const [error, setError] = useState<string | null>(null);

  const legalEntityId = profileForm.legalEntityId ?? data?.data.legalEntityId;

  const { data: leData, isLoading: leLoading } = useLegalEntities({ pageSize: 100, status: 'ACTIVE' });
  const { data: brData, isLoading: brLoading } = useBranches({
    legalEntityId: legalEntityId || undefined,
    pageSize: 100,
    status: 'ACTIVE',
  });
  const { data: deptData, isLoading: deptLoading } = useDepartments({
    legalEntityId: legalEntityId || undefined,
    pageSize: 100,
    status: 'ACTIVE',
  });
  const { data: posData, isLoading: posLoading } = usePositions({
    legalEntityId: legalEntityId || undefined,
    pageSize: 100,
    status: 'ACTIVE',
  });

  const legalEntityOptions = toOptions(leData?.data ?? []);
  const branchOptions = toOptions(brData?.data ?? []);
  const deptOptions = toOptions(deptData?.data ?? []);
  const posOptions = (posData?.data ?? []).map((p) => ({
    value: p.id,
    label: p.title,
    sublabel: p.code,
  }));

  useEffect(() => {
    if (data?.data) {
      const emp = data.data;
      setProfileForm({
        firstName: emp.firstName,
        lastName: emp.lastName,
        gender: (emp.gender as EmployeeGender) ?? undefined,
        emailWork: emp.emailWork,
        emailPersonal: emp.emailPersonal ?? undefined,
        phoneWork: emp.phoneWork ?? undefined,
        phoneMobile: emp.phoneMobile ?? undefined,
        employmentType: emp.employmentType as EmploymentType,
        status: emp.status as EmployeeStatus,
        managerId: emp.managerId ?? undefined,
        branchId: emp.branchId ?? undefined,
        departmentId: emp.departmentId ?? undefined,
        positionId: emp.positionId ?? undefined,
        legalEntityId: emp.legalEntityId,
      });
    }
  }, [data]);

  useEffect(() => {
    if (personalData?.data) {
      const pd = personalData.data;
      setPersonalForm({
        nationality: pd.nationality ?? undefined,
        countryOfBirth: pd.countryOfBirth ?? undefined,
        maritalStatus: (pd.maritalStatus as MaritalStatus) ?? undefined,
        addressLine1: pd.addressLine1 ?? undefined,
        addressLine2: pd.addressLine2 ?? undefined,
        city: pd.city ?? undefined,
        stateProvince: pd.stateProvince ?? undefined,
        postalCode: pd.postalCode ?? undefined,
        countryCode: pd.countryCode ?? undefined,
        nextOfKinName: pd.nextOfKinName ?? undefined,
        nextOfKinRelationship: pd.nextOfKinRelationship ?? undefined,
        nextOfKinPhone: pd.nextOfKinPhone ?? undefined,
      });
    }
  }, [personalData]);

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  function pUpdate<K extends keyof (UpdateEmployeePayload & { legalEntityId?: string })>(
    key: K,
    value: (UpdateEmployeePayload & { legalEntityId?: string })[K],
  ) {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
  }

  function pdUpdate<K extends keyof UpsertPersonalDetailPayload>(key: K, value: UpsertPersonalDetailPayload[K]) {
    setPersonalForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { legalEntityId: _le, ...payload } = profileForm;
      await updateEmployee.mutateAsync(payload);
      router.push(ROUTES.TENANT.EMPLOYEES.DETAIL(id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    }
  }

  async function handlePersonalSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await upsertPersonal.mutateAsync(personalForm);
      router.push(`${ROUTES.TENANT.EMPLOYEES.DETAIL(id)}?tab=personal`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="border-b border-border-default">
        <nav className="-mb-px flex gap-6">
          {(['profile', 'personal'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-body-md font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-brand-blue-600 text-brand-blue-600'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab === 'profile' ? t('employees.detail.tabProfile') : t('employees.detail.tabPersonal')}
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <div className="rounded-lg border border-semantic-danger/30 bg-semantic-danger/5 p-4 text-body-md text-semantic-danger">
          {error}
        </div>
      )}

      {activeTab === 'profile' && (
        <form onSubmit={(e) => { void handleProfileSubmit(e); }} className="space-y-6">
          <Section title={t('employees.create.sectionIdentity')}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('employees.fields.firstName')} required>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={profileForm.firstName ?? ''}
                  onChange={(e) => pUpdate('firstName', e.target.value)}
                  className={INPUT_CLS}
                />
              </Field>
              <Field label={t('employees.fields.lastName')} required>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={profileForm.lastName ?? ''}
                  onChange={(e) => pUpdate('lastName', e.target.value)}
                  className={INPUT_CLS}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('employees.fields.gender')}>
                <select
                  value={profileForm.gender ?? ''}
                  onChange={(e) => pUpdate('gender', (e.target.value as EmployeeGender) || undefined)}
                  className={INPUT_CLS}
                >
                  <option value="">{t('employees.fields.genderPlaceholder')}</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>{t(`employees.gender.${g}`)}</option>
                  ))}
                </select>
              </Field>
              <Field label={t('employees.fields.status')}>
                <select
                  value={profileForm.status ?? ''}
                  onChange={(e) => pUpdate('status', e.target.value as EmployeeStatus)}
                  className={INPUT_CLS}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{t(`employees.status.${s}`)}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section title={t('employees.create.sectionContact')}>
            <Field label={t('employees.fields.emailWork')} required>
              <input
                type="email"
                required
                value={profileForm.emailWork ?? ''}
                onChange={(e) => pUpdate('emailWork', e.target.value)}
                className={INPUT_CLS}
              />
            </Field>
            <Field label={t('employees.fields.emailPersonal')}>
              <input
                type="email"
                value={profileForm.emailPersonal ?? ''}
                onChange={(e) => pUpdate('emailPersonal', e.target.value || undefined)}
                className={INPUT_CLS}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('employees.fields.phoneWork')}>
                <input
                  type="tel"
                  maxLength={30}
                  value={profileForm.phoneWork ?? ''}
                  onChange={(e) => pUpdate('phoneWork', e.target.value || undefined)}
                  className={INPUT_CLS}
                />
              </Field>
              <Field label={t('employees.fields.phoneMobile')}>
                <input
                  type="tel"
                  maxLength={30}
                  value={profileForm.phoneMobile ?? ''}
                  onChange={(e) => pUpdate('phoneMobile', e.target.value || undefined)}
                  className={INPUT_CLS}
                />
              </Field>
            </div>
          </Section>

          <Section title={t('employees.create.sectionEmployment')}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('employees.fields.employmentType')}>
                <select
                  value={profileForm.employmentType ?? ''}
                  onChange={(e) => pUpdate('employmentType', e.target.value as EmploymentType)}
                  className={INPUT_CLS}
                >
                  {EMPLOYMENT_TYPES.map((et) => (
                    <option key={et} value={et}>{t(`employees.employmentType.${et}`)}</option>
                  ))}
                </select>
              </Field>
              <Field label={t('employees.fields.legalEntity')}>
                <SearchableSelect
                  value={legalEntityId}
                  onChange={(v) => pUpdate('legalEntityId', v)}
                  options={legalEntityOptions}
                  placeholder={t('employees.fields.legalEntityPlaceholder')}
                  isLoading={leLoading}
                  required
                />
              </Field>
            </div>
          </Section>

          <Section title={t('employees.create.sectionOrgAssignment')}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('employees.fields.branch')}>
                <SearchableSelect
                  value={profileForm.branchId}
                  onChange={(v) => pUpdate('branchId', v)}
                  options={branchOptions}
                  placeholder={t('employees.fields.branchPlaceholder')}
                  isLoading={brLoading}
                />
              </Field>
              <Field label={t('employees.fields.department')}>
                <SearchableSelect
                  value={profileForm.departmentId}
                  onChange={(v) => pUpdate('departmentId', v)}
                  options={deptOptions}
                  placeholder={t('employees.fields.departmentPlaceholder')}
                  isLoading={deptLoading}
                />
              </Field>
            </div>
            <Field label={t('employees.fields.position')}>
              <SearchableSelect
                value={profileForm.positionId}
                onChange={(v) => pUpdate('positionId', v)}
                options={posOptions}
                placeholder={t('employees.fields.positionPlaceholder')}
                isLoading={posLoading}
              />
            </Field>
            <Field label={t('employees.fields.manager')}>
              <ManagerSelect
                value={profileForm.managerId}
                onChange={(v) => pUpdate('managerId', v)}
                excludeId={id}
                placeholder={t('employees.fields.managerPlaceholder')}
              />
            </Field>
          </Section>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-border-default bg-surface-primary px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={updateEmployee.isPending}
              className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-medium text-white hover:bg-brand-blue-500 disabled:opacity-50 transition-colors"
            >
              {updateEmployee.isPending ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'personal' && (
        <form onSubmit={(e) => { void handlePersonalSubmit(e); }} className="space-y-6">
          <Section title={t('employees.personalDetail.sectionDetails')}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('employees.personalDetail.fields.nationality')}>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="PK"
                  value={personalForm.nationality ?? ''}
                  onChange={(e) => pdUpdate('nationality', e.target.value.toUpperCase() || undefined)}
                  className={INPUT_CLS}
                />
              </Field>
              <Field label={t('employees.personalDetail.fields.countryOfBirth')}>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="PK"
                  value={personalForm.countryOfBirth ?? ''}
                  onChange={(e) => pdUpdate('countryOfBirth', e.target.value.toUpperCase() || undefined)}
                  className={INPUT_CLS}
                />
              </Field>
              <Field label={t('employees.personalDetail.fields.maritalStatus')}>
                <select
                  value={personalForm.maritalStatus ?? ''}
                  onChange={(e) => pdUpdate('maritalStatus', (e.target.value as MaritalStatus) || undefined)}
                  className={INPUT_CLS}
                >
                  <option value="">—</option>
                  {MARITAL_STATUSES.map((ms) => (
                    <option key={ms} value={ms}>{t(`employees.maritalStatus.${ms}`)}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={t('employees.personalDetail.fields.addressLine1')}>
              <input
                type="text"
                maxLength={200}
                value={personalForm.addressLine1 ?? ''}
                onChange={(e) => pdUpdate('addressLine1', e.target.value || undefined)}
                className={INPUT_CLS}
              />
            </Field>
            <Field label={t('employees.personalDetail.fields.addressLine2')}>
              <input
                type="text"
                maxLength={200}
                value={personalForm.addressLine2 ?? ''}
                onChange={(e) => pdUpdate('addressLine2', e.target.value || undefined)}
                className={INPUT_CLS}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label={t('employees.personalDetail.fields.city')}>
                <input
                  type="text"
                  maxLength={100}
                  value={personalForm.city ?? ''}
                  onChange={(e) => pdUpdate('city', e.target.value || undefined)}
                  className={INPUT_CLS}
                />
              </Field>
              <Field label={t('employees.personalDetail.fields.postalCode')}>
                <input
                  type="text"
                  maxLength={20}
                  value={personalForm.postalCode ?? ''}
                  onChange={(e) => pdUpdate('postalCode', e.target.value || undefined)}
                  className={INPUT_CLS}
                />
              </Field>
              <Field label={t('employees.personalDetail.fields.countryCode')}>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="PK"
                  value={personalForm.countryCode ?? ''}
                  onChange={(e) => pdUpdate('countryCode', e.target.value.toUpperCase() || undefined)}
                  className={INPUT_CLS}
                />
              </Field>
            </div>
          </Section>

          <Section title={t('employees.personalDetail.sectionNextOfKin')}>
            <Field label={t('employees.personalDetail.fields.nextOfKinName')}>
              <input
                type="text"
                maxLength={200}
                value={personalForm.nextOfKinName ?? ''}
                onChange={(e) => pdUpdate('nextOfKinName', e.target.value || undefined)}
                className={INPUT_CLS}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('employees.personalDetail.fields.nextOfKinRelationship')}>
                <input
                  type="text"
                  maxLength={40}
                  value={personalForm.nextOfKinRelationship ?? ''}
                  onChange={(e) => pdUpdate('nextOfKinRelationship', e.target.value || undefined)}
                  className={INPUT_CLS}
                />
              </Field>
              <Field label={t('employees.personalDetail.fields.nextOfKinPhone')}>
                <input
                  type="tel"
                  maxLength={30}
                  value={personalForm.nextOfKinPhone ?? ''}
                  onChange={(e) => pdUpdate('nextOfKinPhone', e.target.value || undefined)}
                  className={INPUT_CLS}
                />
              </Field>
            </div>
          </Section>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-border-default bg-surface-primary px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={upsertPersonal.isPending}
              className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-medium text-white hover:bg-brand-blue-500 disabled:opacity-50 transition-colors"
            >
              {upsertPersonal.isPending ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
