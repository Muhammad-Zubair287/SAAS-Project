'use client';

import { useTranslations } from 'next-intl';
import type { Plan } from '../types/platform.types';
import {
  PLAN_COMPARISON_ROWS,
  type SupportTier,
} from '../constants/create-tenant.constants';
import { formatPlanComparisonCell, findEntitlementValue } from '../utils/plan-pricing';

interface PlanComparisonTableProps {
  plans: Plan[];
  selectedPlanId?: string;
}

export function PlanComparisonTable({ plans, selectedPlanId }: PlanComparisonTableProps) {
  const t = useTranslations();
  const labels = {
    included: t('platform.tenants.create.product.included'),
    notIncluded: t('platform.tenants.create.product.notIncluded'),
    optional: t('platform.tenants.create.commercial.optionalFeature'),
    custom: t('platform.tenants.create.commercial.custom'),
  };

  if (plans.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-border-default">
      <table className="min-w-full divide-y divide-border-default text-body-sm">
        <thead className="bg-surface-canvas">
          <tr>
            <th scope="col" className="px-3 py-2 text-start font-semibold text-text-primary">
              {t('platform.tenants.create.commercial.comparisonFeature')}
            </th>
            {plans.map((plan) => (
              <th
                key={plan.id}
                scope="col"
                className={`px-3 py-2 text-center font-semibold ${
                  plan.id === selectedPlanId ? 'text-brand-blue-600' : 'text-text-primary'
                }`}
              >
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default bg-surface-primary">
          {PLAN_COMPARISON_ROWS.map((row) => (
            <tr key={row.key}>
              <td className="px-3 py-2 text-text-secondary">
                {t(`platform.tenants.create.commercial.features.${row.key}`)}
              </td>
              {plans.map((plan) => {
                const value = findEntitlementValue(plan.entitlements, row.code);
                return (
                  <td key={plan.id} className="px-3 py-2 text-center font-medium text-text-primary">
                    {formatPlanComparisonCell(row.code, value, labels)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PricingSummaryProps {
  currency: string;
  perEmployeeFee: number;
  minimumPlatformFee: number;
  seatLimit: number;
  seatTotal: number;
  estimatedMonthly: number;
}

export function PricingSummary({
  currency,
  perEmployeeFee,
  minimumPlatformFee,
  seatLimit,
  seatTotal,
  estimatedMonthly,
}: PricingSummaryProps) {
  const t = useTranslations();

  return (
    <div className="rounded-lg border border-border-default bg-surface-canvas p-4">
      <h4 className="text-label-md font-semibold text-text-primary">
        {t('platform.tenants.create.commercial.estimatedCost')}
      </h4>
      <dl className="mt-3 space-y-2 text-body-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">{t('platform.tenants.create.commercial.minimumFee')}</dt>
          <dd className="font-medium tabular-nums text-text-primary">
            {currency} {minimumPlatformFee.toLocaleString()}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">{t('platform.tenants.create.commercial.perEmployeeLine')}</dt>
          <dd className="font-medium tabular-nums text-text-primary">
            {currency} {perEmployeeFee.toLocaleString()} × {seatLimit.toLocaleString()} = {currency}{' '}
            {seatTotal.toLocaleString()}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-border-default pt-2">
          <dt className="font-semibold text-text-primary">{t('platform.tenants.create.commercial.estimatedMonthly')}</dt>
          <dd className="font-bold tabular-nums text-brand-blue-600">
            {currency} {estimatedMonthly.toLocaleString()}/{t('platform.billing.monthly').toLowerCase()}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function supportTierFromPlan(plan: Plan | undefined): SupportTier {
  const dedicated = findEntitlementValue(plan?.entitlements, 'feature_dedicated_support');
  if (dedicated === true || dedicated === 'true' || dedicated === 1) return 'enterprise';
  const api = findEntitlementValue(plan?.entitlements, 'feature_api_access');
  if (api === true || api === 'true' || api === 1) return 'premium';
  return 'standard';
}
