import { redirect } from 'next/navigation';
import { ROUTES } from '../../../constants/routes.constants';

/** SCR-SUB-01 — subscription lives under settings; top-level nav aliases here. */
export default function SubscriptionAliasPage() {
  redirect(ROUTES.TENANT.SETTINGS_SUBSCRIPTION);
}
