'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCreateEmployee } from '../../../../modules/employee/hooks/use-employees';
import { employeeApi } from '../../../../modules/employee/api/employee-api';
import { useLegalEntities } from '../../../../modules/organisation/hooks/use-legal-entities';
import { useBranches } from '../../../../modules/organisation/hooks/use-branches';
import { useDepartments } from '../../../../modules/organisation/hooks/use-departments';
import { usePositions } from '../../../../modules/organisation/hooks/use-positions';
import { SearchableSelect, type SelectOption } from '../../../../components/common/searchable-select';
import { ManagerSelect } from '../../../../modules/employee/components/manager-select';
import { ROUTES } from '../../../../constants/routes.constants';
import type {
  CreateEmployeePayload,
  UpsertPersonalDetailPayload,
  EmploymentType,
  EmployeeGender,
  MaritalStatus,
} from '../../../../modules/employee/types/employee.types';

const INITIAL_EMPLOYEE: CreateEmployeePayload = {
  legalEntityId: '',
  firstName: '',
  lastName: '',
  emailWork: '',
  hireDate: '',
  employmentType: 'FULL_TIME',
};

const INITIAL_PERSONAL: UpsertPersonalDetailPayload = {};

const EMPLOYMENT_TYPES: EmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];
const GENDERS: EmployeeGender[] = ['MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED'];
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

export function CreateEmployeeForm() {
  const t = useTranslations();
  const router = useRouter();
  const create = useCreateEmployee();

  const [form, setForm] = useState<CreateEmployeePayload>(INITIAL_EMPLOYEE);
  const [personal, setPersonal] = useState<UpsertPersonalDetailPayload>(INITIAL_PERSONAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: leData, isLoading: leLoading } = useLegalEntities({ pageSize: 100, status: 'ACTIVE' });
  const { data: brData, isLoading: brLoading } = useBranches({
    legalEntityId: form.legalEntityId || undefined,
    pageSize: 100,
    status: 'ACTIVE',
  });
  const { data: deptData, isLoading: deptLoading } = useDepartments({
    legalEntityId: form.legalEntityId || undefined,
    pageSize: 100,
    status: 'ACTIVE',
  });
  const { data: posData, isLoading: posLoading } = usePositions({
    legalEntityId: form.legalEntityId || undefined,
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

  function update<K extends keyof CreateEmployeePayload>(key: K, value: CreateEmployeePayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updatePersonal<K extends keyof UpsertPersonalDetailPayload>(key: K, value: UpsertPersonalDetailPayload[K]) {
    setPersonal((prev) => ({ ...prev, [key]: value }));
  }

  function handleLegalEntityChange(id: string | undefined) {
    setForm((prev) => ({
      ...prev,
      legalEntityId: id ?? '',
      branchId: undefined,
      departmentId: undefined,
      positionId: undefined,
    }));
  }

  function hasPersonalData() {
    return Object.values(personal).some((v) => v !== undefined && v !== '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await create.mutateAsync({
        ...form,
        branchId: form.branchId || undefined,
        departmentId: form.departmentId || undefined,
        positionId: form.positionId || undefined,
        managerId: form.managerId || undefined,
        gender: form.gender || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        nationalId: form.nationalId || undefined,
        emailPersonal: form.emailPersonal || undefined,
        phoneWork: form.phoneWork || undefined,
        phoneMobile: form.phoneMobile || undefined,
      });
      const newId = result.data.id;
      if (hasPersonalData()) {
        await employeeApi.personalDetails.upsert(newId, personal);
      }
      router.push(ROUTES.TENANT.EMPLOYEES.DETAIL(newId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="mx-auto max-w-2xl space-y-6">
      {error && (
        <div className="rounded-lg border border-semantic-danger/30 bg-semantic-danger/5 p-4 text-body-md text-semantic-danger">
          {error}
        </div>
      )}

      {/* Identity */}
      <Section title={t('employees.create.sectionIdentity')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('employees.fields.firstName')} required>
            <input
              type="text"
              required
              maxLength={100}
              value={form.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              placeholder={t('employees.fields.firstNamePlaceholder')}
              className={INPUT_CLS}
            />
          </Field>
          <Field label={t('employees.fields.lastName')} required>
            <input
              type="text"
              required
              maxLength={100}
              value={form.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              placeholder={t('employees.fields.lastNamePlaceholder')}
              className={INPUT_CLS}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('employees.fields.gender')}>
            <select
              value={form.gender ?? ''}
              onChange={(e) => update('gender', (e.target.value as EmployeeGender) || undefined)}
              className={INPUT_CLS}
            >
              <option value="">{t('employees.fields.genderPlaceholder')}</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>{t(`employees.gender.${g}`)}</option>
              ))}
            </select>
          </Field>
          <Field label={t('employees.fields.dateOfBirth')}>
            <input
              type="date"
              value={form.dateOfBirth ?? ''}
              onChange={(e) => update('dateOfBirth', e.target.value || undefined)}
              className={INPUT_CLS}
            />
          </Field>
        </div>
        <Field label={t('employees.fields.nationalId')}>
          <input
            type="text"
            maxLength={20}
            value={form.nationalId ?? ''}
            onChange={(e) => update('nationalId', e.target.value || undefined)}
            placeholder={t('employees.fields.nationalIdPlaceholder')}
            className={INPUT_CLS}
          />
        </Field>
      </Section>

      {/* Contact */}
      <Section title={t('employees.create.sectionContact')}>
        <Field label={t('employees.fields.emailWork')} required>
          <input
            type="email"
            required
            value={form.emailWork}
            onChange={(e) => update('emailWork', e.target.value)}
            placeholder={t('employees.fields.emailWorkPlaceholder')}
            className={INPUT_CLS}
          />
        </Field>
        <Field label={t('employees.fields.emailPersonal')}>
          <input
            type="email"
            value={form.emailPersonal ?? ''}
            onChange={(e) => update('emailPersonal', e.target.value || undefined)}
            placeholder={t('employees.fields.emailPersonalPlaceholder')}
            className={INPUT_CLS}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('employees.fields.phoneWork')}>
            <input
              type="tel"
              maxLength={30}
              value={form.phoneWork ?? ''}
              onChange={(e) => update('phoneWork', e.target.value || undefined)}
              placeholder={t('employees.fields.phoneWorkPlaceholder')}
              className={INPUT_CLS}
            />
          </Field>
          <Field label={t('employees.fields.phoneMobile')}>
            <input
              type="tel"
              maxLength={30}
              value={form.phoneMobile ?? ''}
              onChange={(e) => update('phoneMobile', e.target.value || undefined)}
              placeholder={t('employees.fields.phoneMobilePlaceholder')}
              className={INPUT_CLS}
            />
          </Field>
        </div>
      </Section>

      {/* Employment */}
      <Section title={t('employees.create.sectionEmployment')}>
        <Field label={t('employees.fields.legalEntity')} required>
          <SearchableSelect
            value={form.legalEntityId || undefined}
            onChange={handleLegalEntityChange}
            options={legalEntityOptions}
            placeholder={t('employees.fields.legalEntityPlaceholder')}
            isLoading={leLoading}
            required
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('employees.fields.hireDate')} required>
            <input
              type="date"
              required
              value={form.hireDate}
              onChange={(e) => update('hireDate', e.target.value)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label={t('employees.fields.employmentType')} required>
            <select
              required
              value={form.employmentType}
              onChange={(e) => update('employmentType', e.target.value as EmploymentType)}
              className={INPUT_CLS}
            >
              {EMPLOYMENT_TYPES.map((et) => (
                <option key={et} value={et}>{t(`employees.employmentType.${et}`)}</option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* Organisation Assignment */}
      <Section title={t('employees.create.sectionOrgAssignment')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('employees.fields.branch')}>
            <SearchableSelect
              value={form.branchId}
              onChange={(v) => update('branchId', v)}
              options={branchOptions}
              placeholder={t('employees.fields.branchPlaceholder')}
              isLoading={brLoading && !!form.legalEntityId}
              disabled={!form.legalEntityId}
            />
          </Field>
          <Field label={t('employees.fields.department')}>
            <SearchableSelect
              value={form.departmentId}
              onChange={(v) => update('departmentId', v)}
              options={deptOptions}
              placeholder={t('employees.fields.departmentPlaceholder')}
              isLoading={deptLoading && !!form.legalEntityId}
              disabled={!form.legalEntityId}
            />
          </Field>
        </div>
        <Field label={t('employees.fields.position')}>
          <SearchableSelect
            value={form.positionId}
            onChange={(v) => update('positionId', v)}
            options={posOptions}
            placeholder={t('employees.fields.positionPlaceholder')}
            isLoading={posLoading && !!form.legalEntityId}
            disabled={!form.legalEntityId}
          />
        </Field>
        <Field label={t('employees.fields.manager')}>
          <ManagerSelect
            value={form.managerId}
            onChange={(v) => update('managerId', v)}
            placeholder={t('employees.fields.managerPlaceholder')}
          />
        </Field>
      </Section>

      {/* Personal Detail */}
      <Section title={t('employees.create.sectionPersonalDetail')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('employees.personalDetail.fields.nationality')}>
            <input
              type="text"
              maxLength={2}
              placeholder="PK"
              value={personal.nationality ?? ''}
              onChange={(e) => updatePersonal('nationality', e.target.value.toUpperCase() || undefined)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label={t('employees.personalDetail.fields.countryOfBirth')}>
            <input
              type="text"
              maxLength={2}
              placeholder="PK"
              value={personal.countryOfBirth ?? ''}
              onChange={(e) => updatePersonal('countryOfBirth', e.target.value.toUpperCase() || undefined)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label={t('employees.personalDetail.fields.maritalStatus')}>
            <select
              value={personal.maritalStatus ?? ''}
              onChange={(e) => updatePersonal('maritalStatus', (e.target.value as MaritalStatus) || undefined)}
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
            value={personal.addressLine1 ?? ''}
            onChange={(e) => updatePersonal('addressLine1', e.target.value || undefined)}
            className={INPUT_CLS}
          />
        </Field>
        <Field label={t('employees.personalDetail.fields.addressLine2')}>
          <input
            type="text"
            maxLength={200}
            value={personal.addressLine2 ?? ''}
            onChange={(e) => updatePersonal('addressLine2', e.target.value || undefined)}
            className={INPUT_CLS}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={t('employees.personalDetail.fields.city')}>
            <input
              type="text"
              maxLength={100}
              value={personal.city ?? ''}
              onChange={(e) => updatePersonal('city', e.target.value || undefined)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label={t('employees.personalDetail.fields.postalCode')}>
            <input
              type="text"
              maxLength={20}
              value={personal.postalCode ?? ''}
              onChange={(e) => updatePersonal('postalCode', e.target.value || undefined)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label={t('employees.personalDetail.fields.countryCode')}>
            <input
              type="text"
              maxLength={2}
              placeholder="PK"
              value={personal.countryCode ?? ''}
              onChange={(e) => updatePersonal('countryCode', e.target.value.toUpperCase() || undefined)}
              className={INPUT_CLS}
            />
          </Field>
        </div>
        <Field label={t('employees.personalDetail.fields.nextOfKinName')}>
          <input
            type="text"
            maxLength={200}
            value={personal.nextOfKinName ?? ''}
            onChange={(e) => updatePersonal('nextOfKinName', e.target.value || undefined)}
            className={INPUT_CLS}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('employees.personalDetail.fields.nextOfKinRelationship')}>
            <input
              type="text"
              maxLength={40}
              value={personal.nextOfKinRelationship ?? ''}
              onChange={(e) => updatePersonal('nextOfKinRelationship', e.target.value || undefined)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label={t('employees.personalDetail.fields.nextOfKinPhone')}>
            <input
              type="tel"
              maxLength={30}
              value={personal.nextOfKinPhone ?? ''}
              onChange={(e) => updatePersonal('nextOfKinPhone', e.target.value || undefined)}
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
          disabled={submitting}
          className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-medium text-white hover:bg-brand-blue-500 disabled:opacity-50 transition-colors"
        >
          {submitting ? t('common.loading') : t('employees.create.submitButton')}
        </button>
      </div>
    </form>
  );
}
