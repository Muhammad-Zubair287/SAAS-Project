import { redirect } from 'next/navigation';
import { ROUTES } from '../constants/routes.constants';

/**
 * Root entry point. There is no authentication yet ((auth) is empty), so this
 * redirects unconditionally to the tenant workspace. Once sessions exist this
 * becomes a role branch: platform admins -> ROUTES.PLATFORM.DASHBOARD,
 * employees -> ROUTES.EMPLOYEE.DASHBOARD, everyone else -> tenant dashboard.
 */
export default function RootPage() {
  redirect(ROUTES.TENANT.DASHBOARD);
}
