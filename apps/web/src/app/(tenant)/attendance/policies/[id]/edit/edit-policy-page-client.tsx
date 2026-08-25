'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AttendancePolicyForm } from '@/modules/attendance/components/attendance-policy-form';
import { useAttendancePolicy, useUpdateAttendancePolicy } from '@/modules/attendance/hooks/use-attendance-policies';
import type { AttendancePolicy, CreateAttendancePolicyPayload } from '@/modules/attendance/types/attendance-policy.types';

interface Props {
  id: string;
}

function toFormDefaults(policy: AttendancePolicy): Partial<CreateAttendancePolicyPayload> {
  return {
    legalEntityId: policy.legalEntityId ?? undefined,
    branchId: policy.branchId ?? undefined,
    name: policy.name,
    description: policy.description ?? undefined,
    effectiveFrom: policy.effectiveFrom.slice(0, 10),
    effectiveTo: policy.effectiveTo ? policy.effectiveTo.slice(0, 10) : undefined,
    workingMinutesPerDay: policy.workingMinutesPerDay,
    workStartTime: policy.workStartTime,
    workEndTime: policy.workEndTime,
    graceMinutes: policy.graceMinutes,
    lateToleranceMinutes: policy.lateToleranceMinutes,
    earlyDepartureToleranceMinutes: policy.earlyDepartureToleranceMinutes,
    halfDayMinutes: policy.halfDayMinutes,
    minimumWorkingMinutes: policy.minimumWorkingMinutes,
    overtimeThresholdMinutes: policy.overtimeThresholdMinutes,
    weekendDefinition: policy.weekendDefinition,
    timezone: policy.timezone,
    allowManualAttendance: policy.allowManualAttendance,
    allowEarlyCheckIn: policy.allowEarlyCheckIn,
    allowLateCheckOut: policy.allowLateCheckOut,
    allowOvertime: policy.allowOvertime,
    allowedIpRanges: policy.allowedIpRanges ?? undefined,
  };
}

export function EditPolicyPageClient({ id }: Props) {
  const t = useTranslations('attendance.policy');
  const router = useRouter();
  const { data, isLoading, error } = useAttendancePolicy(id);
  const { mutate, isPending } = useUpdateAttendancePolicy(id);

  const policy = (data as { data?: AttendancePolicy } | undefined)?.data;
  const defaultValues = useMemo(() => (policy ? toFormDefaults(policy) : undefined), [policy]);

  if (isLoading) {
    return <div className="p-8 text-sm text-gray-500">{t('detail.loading')}</div>;
  }

  if (error || !policy) {
    return <div className="p-8 text-sm text-red-600">{t('detail.error')}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('edit.title')}</h1>
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <AttendancePolicyForm
          defaultValues={defaultValues}
          isLoading={isPending}
          onSubmit={(payload) => {
            mutate(payload, {
              onSuccess: () => {
                router.push(`/attendance/policies/${id}`);
              },
            });
          }}
        />
      </div>
    </div>
  );
}