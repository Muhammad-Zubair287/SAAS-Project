'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Field } from '../../../components/ui/field';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { AuthShell } from './auth-shell';
import { authApi } from '../api/auth-api';
import { useAuth } from '../../../lib/auth/auth-provider';
import { resolvePostLoginPath } from '../../../lib/auth/auth-gate';
import { tokenStore } from '../../../lib/auth/token-store';
import { ApiError } from '../../../lib/api/types';
import { ROUTES } from '../../../constants/routes.constants';
import Link from 'next/link';

interface FormValues {
  code: string;
}

export function MfaChallengeForm() {
  const t = useTranslations('auth');
  const { completeSession } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const [serverError, setServerError] = useState<string | null>(null);
  const [useBackup, setUseBackup] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { code: '' } });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const challengeToken = tokenStore.getChallengeToken();
    if (!challengeToken) {
      router.replace(ROUTES.AUTH.LOGIN);
      return;
    }
    try {
      const result = await authApi.completeMfaChallenge({
        challengeToken,
        code: values.code.trim(),
      });
      const user = await completeSession(result.accessToken);
      router.replace(resolvePostLoginPath(user, returnTo));
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(t('errors.mfaInvalid'));
        return;
      }
      setServerError(t('errors.generic'));
    }
  });

  return (
    <AuthShell title={t('mfa.title')} subtitle={t('mfa.subtitle')}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          label={useBackup ? t('mfa.backupCode') : t('mfa.code')}
          required
          error={errors.code?.message}
          description={useBackup ? t('mfa.backupHint') : t('mfa.totpHint')}
        >
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            {...register('code', { required: t('validation.codeRequired') })}
          />
        </Field>

        {serverError ? (
          <p role="alert" className="text-body-sm text-semantic-danger">
            {serverError}
          </p>
        ) : null}

        <Button type="submit" fullWidth isLoading={isSubmitting}>
          {t('mfa.submit')}
        </Button>

        <button
          type="button"
          className="w-full text-body-sm font-medium text-brand-blue-600"
          onClick={() => setUseBackup((v) => !v)}
        >
          {useBackup ? t('mfa.useTotp') : t('mfa.useBackup')}
        </button>

        <Link
          href={ROUTES.AUTH.LOGIN}
          className="block text-center text-body-sm text-text-secondary hover:text-brand-blue-600"
        >
          {t('backToSignIn')}
        </Link>
      </form>
    </AuthShell>
  );
}
