'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { toast } from '../../../lib/toast/store';
import type { AttendanceDeviceTokenIssueResponse } from '../types/attendance-capture.types';
import {
  formatDisplayDateTime,
  TECH_VALUE_CLASS,
} from '../utils/geofence-format';

interface DeviceTokenRevealDialogProps {
  open: boolean;
  /** Clears ephemeral token state in the parent when the dialog closes. */
  onOpenChange: (open: boolean) => void;
  tokenResult: AttendanceDeviceTokenIssueResponse | null;
}

/**
 * One-time raw token reveal. Closing clears parent state — no re-show path.
 * Never write the token into query cache, storage, URL, or toast body.
 */
export function DeviceTokenRevealDialog({
  open,
  onOpenChange,
  tokenResult,
}: DeviceTokenRevealDialogProps) {
  const t = useTranslations('attendance.deviceToken');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const token = tokenResult?.token ?? '';

  async function handleCopy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success(t('actions.copied'));
    } catch {
      toast.error(t('errors.issueFailed'));
    }
  }

  return (
    <Dialog
      open={open && !!tokenResult}
      onOpenChange={onOpenChange}
      title={t('warning.title')}
      description={t('warning.body')}
      size="md"
      closeOnBackdropClick={false}
      closeLabel={t('actions.dismiss')}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => void handleCopy()}
            aria-label={t('a11y.copy')}
          >
            {copied ? t('actions.copied') : t('actions.copy')}
          </Button>
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            {t('actions.dismiss')}
          </Button>
        </>
      }
    >
      {tokenResult && (
        <div className="space-y-4" role="region" aria-label={t('a11y.dialog')}>
          <div
            role="status"
            className="rounded-md border border-semantic-warning/40 bg-surface-canvas px-3 py-2 text-body-sm text-text-primary"
          >
            {t('warning.body')}
          </div>

          <div>
            <p className="mb-1.5 text-label-md font-medium text-text-secondary">
              {t('fields.token')}
            </p>
            <p
              dir="ltr"
              className={`${TECH_VALUE_CLASS} break-all whitespace-pre-wrap rounded-md border border-border-default bg-surface-canvas px-3 py-3 text-body-sm`}
              aria-label={t('a11y.tokenValue')}
            >
              {token}
            </p>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-label-md text-text-secondary">
                {t('fields.tokenType')}
              </dt>
              <dd dir="ltr" className="mt-0.5 text-body-md text-text-primary">
                {tokenResult.tokenType}
              </dd>
            </div>
            <div>
              <dt className="text-label-md text-text-secondary">
                {t('fields.expiresIn')}
              </dt>
              <dd dir="ltr" className="mt-0.5 tabular-nums text-body-md text-text-primary">
                {tokenResult.expiresIn}s
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-label-md text-text-secondary">
                {t('fields.expiresAt')}
              </dt>
              <dd
                dir="ltr"
                className="mt-0.5 tabular-nums text-body-md text-text-primary"
              >
                {formatDisplayDateTime(tokenResult.expiresAt)}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </Dialog>
  );
}
