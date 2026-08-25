'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Field } from '../../../components/ui/field';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { useAuth } from '../../../lib/auth/auth-provider';
import { resolvePostLoginPath } from '../../../lib/auth/auth-gate';
import {
  clearPreferredTenantSlug,
  rememberTenantLoginSlug,
} from '../../../lib/auth/login-context';
import { ApiError } from '../../../lib/api/types';
import { PasswordInput } from './password-input';
import { AuthShell } from './auth-shell';
import { ROUTES } from '../../../constants/routes.constants';

const EMAIL_PREF_COOKIE = 'wcos_remember_email';

function readRememberedEmail(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${EMAIL_PREF_COOKIE}=`));
  if (!match) return '';
  try {
    return decodeURIComponent(match.slice(EMAIL_PREF_COOKIE.length + 1));
  } catch {
    return '';
  }
}

function writeRememberedEmail(email: string | null) {
  if (typeof document === 'undefined') return;
  if (!email) {
    document.cookie = `${EMAIL_PREF_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `${EMAIL_PREF_COOKIE}=${encodeURIComponent(email)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

interface LoginFormValues {
  email: string;
  password: string;
  rememberDevice: boolean;
}

export interface SignInFormProps {
  /**
   * When set, this is a tenant-specific SCR-AUTH-01 entry.
   * Tenant context is resolved from the URL slug — never shown as a UUID field.
   */
  tenantSlug?: string;
}

export function SignInForm({ tenantSlug }: SignInFormProps) {
  const t = useTranslations('auth');
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const reason = searchParams.get('reason');
  const sessionExpired = reason === 'session-expired';
  const maintenance = reason === 'maintenance';
  const ssoOnly = reason === 'sso-only';
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (tenantSlug) {
      rememberTenantLoginSlug(tenantSlug);
    }
  }, [tenantSlug]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
      rememberDevice: false,
    },
  });

  useEffect(() => {
    const rememberedEmail = readRememberedEmail();
    if (!rememberedEmail) return;
    setValue('email', rememberedEmail);
    setValue('rememberDevice', true);
  }, [setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const result = await login({
        email: values.email.trim(),
        password: values.password,
        ...(tenantSlug ? { tenantSlug } : {}),
      });

      // Convenience only — stores work email for next visit. Does not extend
      // session lifetime or skip MFA (backend remember-device is not available).
      if (values.rememberDevice) {
        writeRememberedEmail(values.email.trim().toLowerCase());
      } else {
        writeRememberedEmail(null);
      }

      if (tenantSlug) {
        rememberTenantLoginSlug(tenantSlug);
      } else {
        clearPreferredTenantSlug();
      }

      if (result.mfaRequired) {
        const q = returnTo
          ? `?returnTo=${encodeURIComponent(returnTo)}`
          : '';
        router.push(`${ROUTES.AUTH.MFA_VERIFY}${q}`);
        return;
      }

      router.replace(resolvePostLoginPath(result.user, returnTo));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'ACCOUNT_LOCKED') {
          setServerError(t('errors.accountLocked'));
        } else if (
          err.code === 'TENANT_SUSPENDED' ||
          err.code === 'TENANT_NOT_FOUND'
        ) {
          setServerError(t('errors.tenantSuspended'));
        } else if (err.code === 'TENANT_MEMBERSHIP_REQUIRED') {
          setServerError(t('errors.membershipRequired'));
        } else if (err.code === 'AUTHENTICATION_REQUIRED' && !tenantSlug) {
          setServerError(t('errors.tenantContextRequired'));
        } else {
          setServerError(t('errors.invalidCredentials'));
        }
        return;
      }
      setServerError(t('errors.generic'));
    }
  });

  const onSsoClick = (provider: 'microsoft' | 'google') => {
    setServerError(t('signIn.ssoNotConfigured', { provider: provider === 'microsoft' ? 'Microsoft' : 'Google' }));
  };

  return (
    <AuthShell
      title={t('signIn.title')}
      subtitle={t('signIn.subtitle')}
      organisationLabel={tenantSlug}
      surface="signIn"
    >
      {sessionExpired ? (
        <div
          role="status"
          className="mb-4 rounded-md border border-brand-blue-100 bg-brand-blue-100/40 px-3 py-2 text-body-sm text-brand-navy-950"
        >
          {t('sessionExpired.banner')}
        </div>
      ) : null}

      {maintenance ? (
        <div
          role="status"
          className="mb-4 rounded-md border border-border-default bg-surface-canvas px-3 py-2 text-body-sm text-text-primary"
        >
          {t('signIn.maintenance')}
        </div>
      ) : null}

      {ssoOnly ? (
        <div
          role="status"
          className="mb-4 rounded-md border border-border-default bg-surface-canvas px-3 py-2 text-body-sm text-text-primary"
        >
          {t('signIn.ssoOnly')}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field label={t('fields.email')} required error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="username"
            autoFocus
            placeholder={t('signIn.emailPlaceholder')}
            {...register('email', {
              required: t('validation.emailRequired'),
            })}
          />
        </Field>

        <Field
          label={t('fields.password')}
          required
          error={errors.password?.message}
        >
          <PasswordInput
            {...register('password', {
              required: t('validation.passwordRequired'),
            })}
          />
        </Field>

        {serverError ? (
          <p role="alert" className="text-body-sm text-semantic-danger">
            {serverError}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-body-sm text-text-primary">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border-default text-brand-blue-600 focus-visible:ring-2 focus-visible:ring-brand-blue-600"
              {...register('rememberDevice')}
            />
            <span>{t('signIn.rememberDevice')}</span>
          </label>
          <Link
            href={ROUTES.AUTH.PASSWORD_RESET}
            className="text-body-sm font-medium text-brand-blue-600 hover:text-brand-blue-500"
          >
            {t('signIn.forgotPassword')}
          </Link>
        </div>

        <Button type="submit" fullWidth isLoading={isSubmitting}>
          {t('signIn.submit')}
        </Button>

        {/* Visual SCR-AUTH-01 SSO row — no live SSO endpoints yet; buttons do not authenticate. */}
        {!ssoOnly ? (
          <div className="pt-1">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border-default" />
              <span className="text-body-sm text-text-secondary">
                {t('signIn.orContinueWith')}
              </span>
              <div className="h-px flex-1 bg-border-default" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                leadingIcon={<MicrosoftMark />}
                onClick={() => onSsoClick('microsoft')}
              >
                {t('signIn.ssoMicrosoft')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                fullWidth
                leadingIcon={<GoogleMark />}
                onClick={() => onSsoClick('google')}
              >
                {t('signIn.ssoGoogle')}
              </Button>
            </div>
          </div>
        ) : null}
      </form>
    </AuthShell>
  );
}

function MicrosoftMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1" y="1" width="6.5" height="6.5" fill="#F25022" />
      <rect x="8.5" y="1" width="6.5" height="6.5" fill="#7FBA00" />
      <rect x="1" y="8.5" width="6.5" height="6.5" fill="#00A4EF" />
      <rect x="8.5" y="8.5" width="6.5" height="6.5" fill="#FFB900" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
