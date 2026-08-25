'use client';

import { useState, forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '../../../components/ui/input';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> & {
  invalid?: boolean;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ invalid, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    const t = useTranslations('auth');

    return (
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        invalid={invalid}
        autoComplete={props.autoComplete ?? 'current-password'}
        trailingIcon={
          <button
            type="button"
            className="text-body-sm font-medium text-brand-blue-600 hover:text-brand-blue-500"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? t('hidePassword') : t('showPassword')}
            tabIndex={0}
          >
            {visible ? t('hide') : t('show')}
          </button>
        }
        className="pr-14"
        {...props}
      />
    );
  },
);
