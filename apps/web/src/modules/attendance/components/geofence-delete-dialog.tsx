'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ConfirmDialog, Dialog } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { toast } from '../../../lib/toast/store';
import { toApiError } from '../../../lib/api/errors';
import { ROUTES } from '../../../constants/routes.constants';
import { useDeleteAttendanceGeofence } from '../hooks/use-attendance-geofences';
import { isVersionConflict } from '../utils/geofence-format';

interface GeofenceDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  geofenceId: string;
  geofenceName: string;
  rowVersion: string;
  onVersionConflict?: () => void;
}

export function GeofenceDeleteDialog({
  open,
  onOpenChange,
  geofenceId,
  geofenceName,
  rowVersion,
  onVersionConflict,
}: GeofenceDeleteDialogProps) {
  const t = useTranslations('attendance.geofences');
  const router = useRouter();
  const deleteMutation = useDeleteAttendanceGeofence();
  const [conflictOpen, setConflictOpen] = useState(false);

  async function handleConfirm() {
    try {
      await deleteMutation.mutateAsync({
        geofenceId,
        ifMatch: rowVersion,
      });
      toast.success(t('success.deleted'));
      onOpenChange(false);
      router.push(ROUTES.TENANT.ATTENDANCE.GEOFENCES);
    } catch (err) {
      if (isVersionConflict(err)) {
        onOpenChange(false);
        setConflictOpen(true);
        onVersionConflict?.();
        return;
      }
      const apiErr = toApiError(err);
      toast.error(apiErr.message || t('error'));
    }
  }

  return (
    <>
      <ConfirmDialog
        open={open}
        onOpenChange={onOpenChange}
        title={t('actions.confirmDelete')}
        description={t('confirm.deleteNamed', { name: geofenceName })}
        confirmLabel={t('actions.delete')}
        cancelLabel={t('actions.cancel')}
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirm}
      />

      <Dialog
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        title={t('conflict.title')}
        description={t('conflict.description')}
        closeOnBackdropClick={false}
        closeLabel={t('conflict.cancel')}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setConflictOpen(false);
                router.push(ROUTES.TENANT.ATTENDANCE.GEOFENCE_DETAIL(geofenceId));
              }}
            >
              {t('conflict.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setConflictOpen(false);
                onVersionConflict?.();
                router.refresh();
              }}
            >
              {t('conflict.reload')}
            </Button>
          </>
        }
      />
    </>
  );
}
