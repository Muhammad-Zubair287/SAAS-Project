'use client';

import { useEffect, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { DEVICE_FIELD_LIMITS } from '../utils/device-lifecycle';

export type DeviceLifecycleDialogAction =
  | 'activate'
  | 'suspend'
  | 'decommission'
  | 'replace';

export interface DeviceLifecycleConfirmPayload {
  reason?: string;
  newSerialNumber?: string;
  newDeviceFingerprint?: string;
  newPublicKeyFingerprint?: string;
}

interface DeviceLifecycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: DeviceLifecycleDialogAction | null;
  deviceName: string;
  isLoading?: boolean;
  onConfirm: (payload: DeviceLifecycleConfirmPayload) => void | Promise<void>;
}

const inputClass =
  'w-full rounded-md border border-border-default bg-surface-primary px-3 py-2.5 text-body-md text-text-primary placeholder:text-text-secondary focus:border-brand-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue-600/20';

/**
 * Confirmation / collection dialog for high-impact device lifecycle actions.
 * No transition rules here — the parent decides which action is offered.
 */
export function DeviceLifecycleDialog({
  open,
  onOpenChange,
  action,
  deviceName,
  isLoading = false,
  onConfirm,
}: DeviceLifecycleDialogProps) {
  const t = useTranslations('attendance.devices');
  const formId = useId();
  const [reason, setReason] = useState('');
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [newDeviceFingerprint, setNewDeviceFingerprint] = useState('');
  const [newPublicKeyFingerprint, setNewPublicKeyFingerprint] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setReason('');
      setNewSerialNumber('');
      setNewDeviceFingerprint('');
      setNewPublicKeyFingerprint('');
      setError(null);
    }
  }, [open]);

  if (!action) return null;

  const needsReason = action === 'suspend' || action === 'decommission';
  const isReplace = action === 'replace';
  const isDanger = action === 'suspend' || action === 'decommission' || action === 'replace';

  const title =
    action === 'activate'
      ? t('actions.activate')
      : action === 'suspend'
        ? t('actions.suspend')
        : action === 'decommission'
          ? t('actions.decommission')
          : t('replaceForm.title');

  const description =
    action === 'activate'
      ? t('confirm.activateNamed', { name: deviceName })
      : action === 'suspend'
        ? t('confirm.suspendNamed', { name: deviceName })
        : action === 'decommission'
          ? t('confirm.decommissionNamed', { name: deviceName })
          : t('confirm.replaceNamed', { name: deviceName });

  async function handleConfirm() {
    setError(null);
    if (needsReason) {
      const trimmed = reason.trim();
      if (!trimmed) {
        setError(t('validation.reasonRequired'));
        return;
      }
      if (trimmed.length > DEVICE_FIELD_LIMITS.reason) {
        setError(t('validation.reasonMax'));
        return;
      }
    }
    if (isReplace) {
      const serial = newSerialNumber.trim();
      if (!serial) {
        setError(t('validation.newSerialRequired'));
        return;
      }
      if (serial.length > DEVICE_FIELD_LIMITS.serialNumber) {
        setError(t('validation.serialMax'));
        return;
      }
      if (
        newDeviceFingerprint.trim().length > DEVICE_FIELD_LIMITS.fingerprint ||
        newPublicKeyFingerprint.trim().length > DEVICE_FIELD_LIMITS.fingerprint
      ) {
        setError(t('validation.fingerprintMax'));
        return;
      }
    }

    await onConfirm({
      ...(needsReason ? { reason: reason.trim() } : {}),
      ...(isReplace
        ? {
            newSerialNumber: newSerialNumber.trim(),
            ...(newDeviceFingerprint.trim()
              ? { newDeviceFingerprint: newDeviceFingerprint.trim() }
              : {}),
            ...(newPublicKeyFingerprint.trim()
              ? { newPublicKeyFingerprint: newPublicKeyFingerprint.trim() }
              : {}),
          }
        : {}),
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size={isReplace ? 'md' : 'sm'}
      closeOnBackdropClick={!isLoading}
      closeLabel={t('actions.cancel')}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            variant={isDanger ? 'danger' : 'primary'}
            onClick={() => void handleConfirm()}
            isLoading={isLoading}
          >
            {t('actions.confirm')}
          </Button>
        </>
      }
    >
      {(needsReason || isReplace) && (
        <div className="space-y-4">
          {needsReason && (
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
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={t('fields.reasonPlaceholder')}
                className={inputClass}
                disabled={isLoading}
                required
              />
            </div>
          )}
          {isReplace && (
            <>
              <p className="text-body-sm text-text-secondary">
                {t('replaceForm.description')}
              </p>
              <div>
                <label
                  htmlFor={`${formId}-serial`}
                  className="mb-1.5 block text-label-md font-medium text-text-primary"
                >
                  {t('fields.newSerialNumber')}
                </label>
                <input
                  id={`${formId}-serial`}
                  dir="ltr"
                  value={newSerialNumber}
                  maxLength={DEVICE_FIELD_LIMITS.serialNumber}
                  onChange={(e) => setNewSerialNumber(e.target.value)}
                  className={`${inputClass} font-mono`}
                  disabled={isLoading}
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <label
                  htmlFor={`${formId}-ndfp`}
                  className="mb-1.5 block text-label-md font-medium text-text-primary"
                >
                  {t('fields.newDeviceFingerprint')}
                </label>
                <input
                  id={`${formId}-ndfp`}
                  dir="ltr"
                  value={newDeviceFingerprint}
                  maxLength={DEVICE_FIELD_LIMITS.fingerprint}
                  onChange={(e) => setNewDeviceFingerprint(e.target.value)}
                  className={`${inputClass} font-mono`}
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>
              <div>
                <label
                  htmlFor={`${formId}-npk`}
                  className="mb-1.5 block text-label-md font-medium text-text-primary"
                >
                  {t('fields.newPublicKeyFingerprint')}
                </label>
                <input
                  id={`${formId}-npk`}
                  dir="ltr"
                  value={newPublicKeyFingerprint}
                  maxLength={DEVICE_FIELD_LIMITS.fingerprint}
                  onChange={(e) => setNewPublicKeyFingerprint(e.target.value)}
                  className={`${inputClass} font-mono`}
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>
            </>
          )}
          {error && (
            <p role="alert" className="text-body-sm text-semantic-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
