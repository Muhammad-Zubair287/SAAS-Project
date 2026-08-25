'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ROUTES } from '../../../../constants/routes.constants';
import { useCreateEmployee } from '../../../../modules/employee/hooks/use-employees';
import { employeeApi } from '../../../../modules/employee/api/employee-api';
import type {
  CreateEmployeePayload,
  EmploymentType,
  UpsertPersonalDetailPayload,
} from '../../../../modules/employee/types/employee.types';
import { useLegalEntities } from '../../../../modules/organisation/hooks/use-legal-entities';
import { useBranches } from '../../../../modules/organisation/hooks/use-branches';
import { useDepartments } from '../../../../modules/organisation/hooks/use-departments';
import { usePositions } from '../../../../modules/organisation/hooks/use-positions';
import { useShifts } from '../../../../modules/shifts/hooks/use-shifts';
import { useAttendancePolicies } from '../../../../modules/attendance/hooks/use-attendance-policies';

const INPUT_CLS =
  'w-full rounded-md border border-border-default bg-surface-primary px-3 py-2 text-body-md text-text-primary placeholder:text-text-secondary focus:border-brand-blue-600 focus:outline-none focus:ring-1 focus:ring-brand-blue-600';

const STEPS = ['basic', 'employment', 'workConfig', 'personal', 'review'] as const;
type Step = (typeof STEPS)[number];

const EMPLOYMENT_TYPES: EmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];

const INITIAL_EMPLOYEE: CreateEmployeePayload = {
  legalEntityId: '',
  firstName: '',
  lastName: '',
  emailWork: '',
  hireDate: '',
  employmentType: 'FULL_TIME',
};

const INITIAL_PERSONAL: UpsertPersonalDetailPayload = {};

export function EmployeeOnboardingWizard() {
  const t = useTranslations();
  const router = useRouter();
  const create = useCreateEmployee();
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [employee, setEmployee] = useState<CreateEmployeePayload>(INITIAL_EMPLOYEE);
  const [personal, setPersonal] = useState<UpsertPersonalDetailPayload>(INITIAL_PERSONAL);
  const [workConfig, setWorkConfig] = useState<{ shiftId?: string; attendancePolicyId?: string }>({});

  const activeStep = STEPS[stepIndex] as Step;
  const isLastStep = stepIndex === STEPS.length - 1;

  const legalEntities = useLegalEntities({ pageSize: 100, status: 'ACTIVE' });
  const branches = useBranches({ pageSize: 100, status: 'ACTIVE', legalEntityId: employee.legalEntityId || undefined });
  const departments = useDepartments({ pageSize: 100, status: 'ACTIVE', legalEntityId: employee.legalEntityId || undefined });
  const positions = usePositions({ pageSize: 100, status: 'ACTIVE', legalEntityId: employee.legalEntityId || undefined });
  const shifts = useShifts({ pageSize: 100, status: 'ACTIVE' });
  const policies = useAttendancePolicies({ page: 1, limit: 100 });

  const policyOptions = useMemo(() => {
    const raw = policies.data as { data?: unknown } | undefined;
    const body = raw?.data;
    if (Array.isArray(body)) return body as Array<{ id: string; name: string }>;
    if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)) {
      return (body as { data: Array<{ id: string; name: string }> }).data;
    }
    return [];
  }, [policies.data]);

  function update<K extends keyof CreateEmployeePayload>(key: K, value: CreateEmployeePayload[K]) {
    setEmployee((prev) => ({ ...prev, [key]: value }));
  }

  function updatePersonal<K extends keyof UpsertPersonalDetailPayload>(
    key: K,
    value: UpsertPersonalDetailPayload[K],
  ) {
    setPersonal((prev) => ({ ...prev, [key]: value }));
  }

  function canContinue() {
    if (activeStep === 'basic') {
      return Boolean(employee.firstName && employee.lastName && employee.emailWork);
    }
    if (activeStep === 'employment') {
      return Boolean(employee.legalEntityId && employee.hireDate && employee.employmentType);
    }
    return true;
  }

  async function submitAll() {
    setError(null);
    setSubmitting(true);
    try {
      const created = await create.mutateAsync({
        ...employee,
        branchId: employee.branchId || undefined,
        departmentId: employee.departmentId || undefined,
        positionId: employee.positionId || undefined,
      });
      const employeeId = created.data.id;

      const hasPersonalData = Object.values(personal).some((value) => value !== undefined && value !== '');
      if (hasPersonalData) {
        await employeeApi.personalDetails.upsert(employeeId, personal);
      }

      router.push(ROUTES.TENANT.EMPLOYEES.DETAIL(employeeId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <ol className="grid grid-cols-2 gap-2 rounded-lg border border-border-default bg-surface-primary p-3 sm:grid-cols-5">
        {STEPS.map((step, idx) => (
          <li key={step} className={`rounded-md px-3 py-2 text-center text-body-sm ${idx === stepIndex ? 'bg-brand-blue-600 text-white' : 'text-text-secondary'}`}>
            {step === 'basic' ? 'Basic' : step === 'employment' ? 'Employment' : step === 'workConfig' ? 'Work config' : step === 'personal' ? 'Personal' : 'Review'}
          </li>
        ))}
      </ol>

      {error && (
        <div className="rounded-lg border border-semantic-danger/30 bg-semantic-danger/5 p-4 text-body-md text-semantic-danger">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-border-default bg-surface-primary p-6">
        {activeStep === 'basic' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input className={INPUT_CLS} placeholder={t('employees.fields.firstName')} value={employee.firstName} onChange={(e) => update('firstName', e.target.value)} />
            <input className={INPUT_CLS} placeholder={t('employees.fields.lastName')} value={employee.lastName} onChange={(e) => update('lastName', e.target.value)} />
            <input className={INPUT_CLS} placeholder={t('employees.fields.emailWork')} type="email" value={employee.emailWork} onChange={(e) => update('emailWork', e.target.value)} />
            <input className={INPUT_CLS} placeholder={t('employees.fields.phoneMobile')} value={employee.phoneMobile ?? ''} onChange={(e) => update('phoneMobile', e.target.value || undefined)} />
          </div>
        )}

        {activeStep === 'employment' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <select className={INPUT_CLS} value={employee.legalEntityId} onChange={(e) => update('legalEntityId', e.target.value)}>
              <option value="">{t('employees.fields.legalEntity')}</option>
              {(legalEntities.data?.data ?? []).map((entity) => (
                <option key={entity.id} value={entity.id}>{entity.name}</option>
              ))}
            </select>
            <input className={INPUT_CLS} type="date" value={employee.hireDate} onChange={(e) => update('hireDate', e.target.value)} />
            <select className={INPUT_CLS} value={employee.employmentType} onChange={(e) => update('employmentType', e.target.value as EmploymentType)}>
              {EMPLOYMENT_TYPES.map((type) => <option key={type} value={type}>{t(`employees.employmentType.${type}`)}</option>)}
            </select>
            <select className={INPUT_CLS} value={employee.branchId ?? ''} onChange={(e) => update('branchId', e.target.value || undefined)}>
              <option value="">{t('employees.fields.branch')}</option>
              {(branches.data?.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className={INPUT_CLS} value={employee.departmentId ?? ''} onChange={(e) => update('departmentId', e.target.value || undefined)}>
              <option value="">{t('employees.fields.department')}</option>
              {(departments.data?.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className={INPUT_CLS} value={employee.positionId ?? ''} onChange={(e) => update('positionId', e.target.value || undefined)}>
              <option value="">{t('employees.fields.position')}</option>
              {(positions.data?.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </div>
        )}

        {activeStep === 'workConfig' && (
          <div className="space-y-4">
            <select className={INPUT_CLS} value={workConfig.shiftId ?? ''} onChange={(e) => setWorkConfig((prev) => ({ ...prev, shiftId: e.target.value || undefined }))}>
              <option value="">Default shift (optional)</option>
              {(shifts.data?.data ?? []).map((shift) => (
                <option key={shift.id} value={shift.id}>{shift.name}</option>
              ))}
            </select>
            <select className={INPUT_CLS} value={workConfig.attendancePolicyId ?? ''} onChange={(e) => setWorkConfig((prev) => ({ ...prev, attendancePolicyId: e.target.value || undefined }))}>
              <option value="">Attendance policy (optional)</option>
              {policyOptions.map((policy) => (
                <option key={policy.id} value={policy.id}>{policy.name}</option>
              ))}
            </select>
            <p className="text-body-sm text-text-secondary">Shift/policy assignment can be adjusted after employee creation.</p>
          </div>
        )}

        {activeStep === 'personal' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input className={INPUT_CLS} placeholder={t('employees.personalDetail.fields.nationality')} value={personal.nationality ?? ''} onChange={(e) => updatePersonal('nationality', e.target.value || undefined)} />
            <input className={INPUT_CLS} placeholder={t('employees.personalDetail.fields.city')} value={personal.city ?? ''} onChange={(e) => updatePersonal('city', e.target.value || undefined)} />
            <input className={INPUT_CLS} placeholder={t('employees.personalDetail.fields.nextOfKinName')} value={personal.nextOfKinName ?? ''} onChange={(e) => updatePersonal('nextOfKinName', e.target.value || undefined)} />
            <input className={INPUT_CLS} placeholder={t('employees.personalDetail.fields.nextOfKinPhone')} value={personal.nextOfKinPhone ?? ''} onChange={(e) => updatePersonal('nextOfKinPhone', e.target.value || undefined)} />
          </div>
        )}

        {activeStep === 'review' && (
          <div className="space-y-3 text-body-md">
            <p><span className="font-semibold">{t('employees.fields.firstName')}:</span> {employee.firstName}</p>
            <p><span className="font-semibold">{t('employees.fields.lastName')}:</span> {employee.lastName}</p>
            <p><span className="font-semibold">{t('employees.fields.emailWork')}:</span> {employee.emailWork}</p>
            <p><span className="font-semibold">{t('employees.fields.hireDate')}:</span> {employee.hireDate}</p>
            <p><span className="font-semibold">{t('employees.fields.employmentType')}:</span> {t(`employees.employmentType.${employee.employmentType}`)}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
          disabled={stepIndex === 0}
          className="rounded-md border border-border-default bg-surface-primary px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas disabled:opacity-50"
        >
          {t('common.previous')}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(ROUTES.TENANT.EMPLOYEES.ROOT)}
            className="rounded-md border border-border-default bg-surface-primary px-4 py-2 text-body-md font-medium text-text-primary hover:bg-surface-canvas"
          >
            {t('common.cancel')}
          </button>
          {!isLastStep ? (
            <button
              type="button"
              onClick={() => setStepIndex((prev) => Math.min(STEPS.length - 1, prev + 1))}
              disabled={!canContinue()}
              className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-medium text-white hover:bg-brand-blue-500 disabled:opacity-50"
            >
              {t('common.next')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void submitAll()}
              disabled={submitting}
              className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-md font-medium text-white hover:bg-brand-blue-500 disabled:opacity-50"
            >
              {submitting ? t('common.loading') : t('employees.create.submitButton')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
