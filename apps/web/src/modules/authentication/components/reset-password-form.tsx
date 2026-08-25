'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Field } from '../../../components/ui/field';
import { Button } from '../../../components/ui/button';
import { AuthShell } from './auth-shell';
import { PasswordInput } from './password-input';
import { authApi } from '../api/auth-api';
import { ApiError } from '../../../lib/api/types';
import { ROUTES } from '../../../constants/routes.constants';

interface FormValues {
  newPassword: string;
  confirmPassword: string;
}

export function ResetPasswordForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    if (!token) {
      setServerError(t('errors.resetInvalid'));
      return;
    }
    try {
      await authApi.confirmPasswordReset({
        token,
        newPassword: values.newPassword,
      });
      setSuccess(true);
      setTimeout(() => router.replace(ROUTES.AUTH.LOGIN), 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'PASSWORD_RESET_TOKEN_EXPIRED') {
          setServerError(t('errors.resetExpired'));
        } else {
          setServerError(t('errors.resetInvalid'));
        }
        return;
      }
      setServerError(t('errors.generic'));
    }
  });

  return (
    <AuthShell title={t('reset.title')} subtitle={t('reset.subtitle')}>
      {success ? (
        <p role="status" className="text-body-md text-brand-teal-600">
          {t('reset.success')}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <p className="text-body-sm text-text-secondary">{t('reset.policy')}</p>
          <Field
            label={t('fields.newPassword')}
            required
            error={errors.newPassword?.message}
          >
            <PasswordInput
              autoComplete="new-password"
              {...register('newPassword', {
                required: t('validation.passwordRequired'),
                minLength: { value: 8, message: t('validation.passwordMin') },
              })}
            />
          </Field>
          <Field
            label={t('fields.confirmPassword')}
            required
            error={errors.confirmPassword?.message}
          >
            <PasswordInput
              autoComplete="new-password"
              {...register('confirmPassword', {
                required: t('validation.passwordRequired'),
                validate: (v) =>
                  v === watch('newPassword') || t('validation.passwordMatch'),
              })}
            />
          </Field>
          {serverError ? (
            <p role="alert" className="text-body-sm text-semantic-danger">
              {serverError}
            </p>
          ) : null}
          <Button type="submit" fullWidth isLoading={isSubmitting} disabled={!token}>
            {t('reset.submit')}
          </Button>
          <Link
            href={ROUTES.AUTH.LOGIN}
            className="block text-center text-body-sm text-text-secondary hover:text-brand-blue-600"
          >
            {t('backToSignIn')}
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
