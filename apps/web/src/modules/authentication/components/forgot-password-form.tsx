'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Field } from '../../../components/ui/field';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { AuthShell } from './auth-shell';
import { authApi } from '../api/auth-api';
import { ROUTES } from '../../../constants/routes.constants';

interface FormValues {
  email: string;
}

export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await authApi.requestPasswordReset(values.email.trim());
    } catch {
      // Always show generic success to avoid account enumeration.
    }
    setSubmitted(true);
  });

  return (
    <AuthShell title={t('forgot.title')} subtitle={t('forgot.subtitle')}>
      {submitted ? (
        <div className="space-y-4">
          <p role="status" className="text-body-md text-text-secondary">
            {t('forgot.genericSuccess')}
          </p>
          <Link
            href={ROUTES.AUTH.LOGIN}
            className="inline-flex text-body-sm font-medium text-brand-blue-600"
          >
            {t('backToSignIn')}
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label={t('fields.email')} required error={errors.email?.message}>
            <Input
              type="email"
              autoComplete="username"
              {...register('email', { required: t('validation.emailRequired') })}
            />
          </Field>
          <Button type="submit" fullWidth isLoading={isSubmitting}>
            {t('forgot.submit')}
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
