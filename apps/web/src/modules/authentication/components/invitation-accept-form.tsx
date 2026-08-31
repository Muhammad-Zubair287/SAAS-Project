'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Field } from '../../../components/ui/field';
import { Button } from '../../../components/ui/button';
import { AuthShell } from './auth-shell';
import { PasswordInput } from './password-input';
import { authApi } from '../api/auth-api';
import { useAuth } from '../../../lib/auth/auth-provider';
import { resolvePostLoginPath } from '../../../lib/auth/post-login-path';
import { rememberTenantLoginSlug } from '../../../lib/auth/login-context';
import { ApiError } from '../../../lib/api/types';
import { ROUTES } from '../../../constants/routes.constants';

interface FormValues {
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface InvitationAcceptFormProps {
  invitationToken: string;
}

export function InvitationAcceptForm({ invitationToken }: InvitationAcceptFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [token, setToken] = useState(invitationToken);
  const { completeSession } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (invitationToken) {
      setToken(invitationToken);
    }
  }, [invitationToken]);

  useEffect(() => {
    if (!token || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('token')) return;
    url.searchParams.delete('token');
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  }, [token]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { password: '', confirmPassword: '', acceptTerms: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    if (!token) {
      setServerError(t('errors.invitationInvalid'));
      return;
    }
    try {
      const result = await authApi.acceptInvitation({
        token,
        password: values.password,
      });
      if (result.tenantSlug) {
        rememberTenantLoginSlug(result.tenantSlug);
      }
      const sessionUser = await completeSession(result.accessToken);
      router.replace(resolvePostLoginPath(sessionUser));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'INVITATION_EXPIRED') {
          setServerError(t('errors.invitationExpired'));
        } else if (err.code === 'INVITATION_ALREADY_ACCEPTED') {
          setServerError(t('errors.invitationAccepted'));
        } else {
          setServerError(t('errors.invitationInvalid'));
        }
        return;
      }
      setServerError(t('errors.generic'));
    }
  });

  return (
    <AuthShell title={t('invite.title')} subtitle={t('invite.subtitle')}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <p className="text-body-sm text-text-secondary">{t('reset.policy')}</p>
        <Field
          label={t('fields.newPassword')}
          required
          error={errors.password?.message}
        >
          <PasswordInput
            autoComplete="new-password"
            {...register('password', {
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
                v === watch('password') || t('validation.passwordMatch'),
            })}
          />
        </Field>
        <label className="flex items-start gap-3 text-body-sm text-text-primary">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-border-default"
            {...register('acceptTerms', {
              required: t('validation.termsRequired'),
            })}
          />
          <span>{t('invite.terms')}</span>
        </label>
        {errors.acceptTerms ? (
          <p className="text-body-sm text-semantic-danger">{errors.acceptTerms.message}</p>
        ) : null}
        {serverError ? (
          <p role="alert" className="text-body-sm text-semantic-danger">
            {serverError}
          </p>
        ) : null}
        <Button type="submit" fullWidth isLoading={isSubmitting} disabled={!token}>
          {t('invite.submit')}
        </Button>
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
