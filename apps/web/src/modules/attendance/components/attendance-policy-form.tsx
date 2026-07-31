'use client';

import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import type { CreateAttendancePolicyPayload } from '../types/attendance-policy.types';

interface Props {
  defaultValues?: Partial<CreateAttendancePolicyPayload>;
  onSubmit: (data: CreateAttendancePolicyPayload) => void;
  isLoading?: boolean;
}

const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export function AttendancePolicyForm({ defaultValues, onSubmit, isLoading }: Props) {
  const t = useTranslations('attendance.policy');
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateAttendancePolicyPayload>({
    defaultValues: {
      graceMinutes: 0,
      lateToleranceMinutes: 0,
      earlyDepartureToleranceMinutes: 0,
      overtimeThresholdMinutes: 0,
      timezone: 'UTC',
      weekendDefinition: [0, 6],
      allowManualAttendance: true,
      allowEarlyCheckIn: true,
      allowLateCheckOut: true,
      allowOvertime: false,
      ...defaultValues,
    },
  });

  const weekendDef = watch('weekendDefinition') ?? [];

  const toggleWeekend = (day: number) => {
    const current = weekendDef as number[];
    if (current.includes(day)) {
      setValue('weekendDefinition', current.filter((d) => d !== day));
    } else {
      setValue('weekendDefinition', [...current, day].sort());
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700">{t('fields.name')} *</label>
        <input
          {...register('name', { required: true })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{t('errors.nameRequired')}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700">{t('fields.description')}</label>
        <textarea
          {...register('description')}
          rows={2}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
        />
      </div>

      {/* Effective dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('fields.effectiveFrom')} *</label>
          <input type="date" {...register('effectiveFrom', { required: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('fields.effectiveTo')}</label>
          <input type="date" {...register('effectiveTo')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
        </div>
      </div>

      {/* Work hours */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('fields.workStart')} *</label>
          <input type="time" {...register('workStartTime', { required: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('fields.workEnd')} *</label>
          <input type="time" {...register('workEndTime', { required: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('fields.workingMinutes')} *</label>
          <input type="number" {...register('workingMinutesPerDay', { required: true, min: 1, max: 1440, valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
        </div>
      </div>

      {/* Thresholds */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('fields.graceMinutes')}</label>
          <input type="number" {...register('graceMinutes', { min: 0, valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('fields.lateToleranceMinutes')}</label>
          <input type="number" {...register('lateToleranceMinutes', { min: 0, valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('fields.halfDayMinutes')} *</label>
          <input type="number" {...register('halfDayMinutes', { required: true, min: 1, valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('fields.minimumWorkingMinutes')} *</label>
          <input type="number" {...register('minimumWorkingMinutes', { required: true, min: 1, valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('fields.overtimeThresholdMinutes')}</label>
          <input type="number" {...register('overtimeThresholdMinutes', { min: 0, valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t('fields.earlyDepartureToleranceMinutes')}</label>
          <input type="number" {...register('earlyDepartureToleranceMinutes', { min: 0, valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
        </div>
      </div>

      {/* Weekend definition */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('fields.weekendDays')}</label>
        <div className="flex gap-2">
          {WEEKDAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleWeekend(day.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                (weekendDef as number[]).includes(day.value)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Flags */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { name: 'allowManualAttendance', label: t('flags.allowManualAttendance') },
          { name: 'allowEarlyCheckIn', label: t('flags.allowEarlyCheckIn') },
          { name: 'allowLateCheckOut', label: t('flags.allowLateCheckOut') },
          { name: 'allowOvertime', label: t('flags.allowOvertime') },
        ].map(({ name, label }) => (
          <label key={name} className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register(name as keyof CreateAttendancePolicyPayload)} className="rounded border-gray-300" />
            {label}
          </label>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
        >
          {isLoading ? t('actions.saving') : t('actions.save')}
        </button>
      </div>
    </form>
  );
}
