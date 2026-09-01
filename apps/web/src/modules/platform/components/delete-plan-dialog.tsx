'use client';

import { useTranslations } from 'next-intl';
import { ConfirmDialog } from '../../../components/ui/dialog';
import { useDeletePlan } from '../hooks/use-plan-mutations';
import { toastApiSuccess } from '../lib/platform-toast';
import type { Plan } from '../types/platform.types';

interface DeletePlanDialogProps {
  plan: Plan | null;
  open: boolean;
  onClose: () => void;
}

export function DeletePlanDialog({ plan, open, onClose }: DeletePlanDialogProps) {
  const t = useTranslations();
  const deletePlan = useDeletePlan();

  async function handleConfirm() {
    if (!plan) return;
    try {
      await deletePlan.mutateAsync(plan.id);
      toastApiSuccess(t('platform.plans.toast.deleted'));
      onClose();
    } catch {
      // toast handled by mutation hook
    }
  }

  return (
    <ConfirmDialog
      open={open && Boolean(plan)}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t('platform.plans.delete.title')}
      description={t('platform.plans.delete.description', { name: plan?.name ?? '' })}
      confirmLabel={t('platform.plans.delete.confirm')}
      cancelLabel={t('common.cancel')}
      variant="danger"
      isLoading={deletePlan.isPending}
      onConfirm={handleConfirm}
    />
  );
}
