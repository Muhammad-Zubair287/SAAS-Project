'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AttendancePolicyForm } from '@/modules/attendance/components/attendance-policy-form';
import { useCreateAttendancePolicy } from '@/modules/attendance/hooks/use-attendance-policies';
import type { CreateAttendancePolicyPayload } from '@/modules/attendance/types/attendance-policy.types';

export function NewPolicyPageClient() {
  const t = useTranslations('attendance.policy');
  const router = useRouter();
  const { mutate, isPending } = useCreateAttendancePolicy();

  const handleSubmit = (data: CreateAttendancePolicyPayload) => {
    mutate(data, {
      onSuccess: (created) => {
        const policy = (created as { data?: { id?: string } })?.data;
        router.push(`/attendance/policies/${policy?.id ?? ''}`);
      },
    });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('create.title')}</h1>
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <AttendancePolicyForm onSubmit={handleSubmit} isLoading={isPending} />
      </div>
    </div>
  );
}
