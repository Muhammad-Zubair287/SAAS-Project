'use client';

import { useTranslations } from 'next-intl';
import { ConfirmDialog } from '../../../components/ui/dialog';
import { toast } from '../../../lib/toast/store';
import { toApiError } from '../../../lib/api/errors';
import { useReplayOfflineSession } from '../hooks/use-attendance-offline';
import { shortenDeviceId } from '../utils/capture-health';

interface OfflineReplayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
}

/**
 * Confirms synchronous replay request (OfflineQueueService.replayQueue).
 * Response includes processed/success/error/deduplicated counts when returned.
 */
export function OfflineReplayDialog({
  open,
  onOpenChange,
  sessionId,
}: OfflineReplayDialogProps) {
  const t = useTranslations('attendance.offline');
  const replay = useReplayOfflineSession();

  async function handleConfirm() {
    try {
      const res = await replay.mutateAsync(sessionId);
      const result = res.data;
      toast.success({
        title: t('success.replayStarted'),
        description: t('success.replaySummary', {
          processed: result.processedCount,
          success: result.successCount,
          errors: result.errorCount,
          deduplicated: result.deduplicatedCount,
        }),
      });
      onOpenChange(false);
    } catch (err) {
      const apiErr = toApiError(err);
      toast.error(apiErr.message || t('errors.replayFailed'));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('actions.replay')}
      description={t('confirm.replayNamed', {
        id: shortenDeviceId(sessionId),
      })}
      confirmLabel={t('actions.confirm')}
      cancelLabel={t('actions.cancel')}
      variant="default"
      isLoading={replay.isPending}
      onConfirm={handleConfirm}
    />
  );
}
