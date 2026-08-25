'use client';

import { useEffect, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { toast } from '../../../lib/toast/store';
import { toApiError } from '../../../lib/api/errors';
import { useCloseOfflineSession } from '../hooks/use-attendance-offline';
import { DEVICE_FIELD_LIMITS } from '../utils/device-lifecycle';
import { shortenDeviceId } from '../utils/capture-health';

interface OfflineCloseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  deviceName?: string | null;
  /** When true, copy notes that close may queue async replay for remaining pending events. */
  hasPendingEvents?: boolean;
}

const inputClass =
  'w-full rounded-md border border-border-default bg-surface-primary px-3 py-2.5 text-body-md text-text-primary placeholder:text-text-secondary focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20';

/**
 * Close requires DeviceReasonDto.reason (max 500).
 * Backend may publish OfflineReplayRequested.v1 when pending events remain.
 */
export function OfflineCloseDialog({
  open,
  onOpenChange,
  sessionId,
  deviceName,
  hasPendingEvents = false,
}: OfflineCloseDialogProps) {
  const t = useTranslations('attendance.offline');
  const close = useCloseOfflineSession();
  const formId = useId();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  async function handleConfirm() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(t('validation.reasonRequired'));
      return;
    }
    if (trimmed.length > DEVICE_FIELD_LIMITS.reason) {
      setError(t('validation.reasonMax'));
      return;
    }

    try {
      await close.mutateAsync({
        sessionId,
        payload: { reason: trimmed },
      });
      toast.success(
        hasPendingEvents
          ? {
              title: t('success.closed'),
              description: t('success.closedWithPending'),
            }
          : t('success.closed'),
      );
      onOpenChange(false);
    } catch (err) {
      const apiErr = toApiError(err);
      toast.error(apiErr.message || t('errors.closeFailed'));
    }
  }

  const deviceLabel = deviceName || shortenDeviceId(sessionId);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('actions.close')}
      description={t('confirm.closeNamed', {
        id: shortenDeviceId(sessionId),
        device: deviceLabel,
      })}
      size="sm"
      closeOnBackdropClick={!close.isPending}
      closeLabel={t('actions.cancel')}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={close.isPending}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => void handleConfirm()}
            isLoading={close.isPending}
          >
            {t('actions.confirm')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {hasPendingEvents && (
          <p
            role="status"
            className="rounded-md border border-semantic-warning/40 bg-surface-canvas px-3 py-2 text-body-sm text-text-primary"
          >
            {t('confirm.closeWithPending')}
          </p>
        )}
        <div>
          <label
            htmlFor={`${formId}-reason`}
            className="mb-1.5 block text-label-md font-medium text-text-primary"
          >
            {t('fields.reason')}
          </label>
          <textarea
            id={`${formId}-reason`}
            value={reason}
            maxLength={DEVICE_FIELD_LIMITS.reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            rows={3}
            placeholder={t('fields.reasonPlaceholder')}
            className={inputClass}
            disabled={close.isPending}
            required
          />
          {error && (
            <p role="alert" className="mt-1 text-body-sm text-semantic-danger">
              {error}
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
