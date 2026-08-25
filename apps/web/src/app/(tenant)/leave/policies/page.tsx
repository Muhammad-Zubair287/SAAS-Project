import { redirect } from 'next/navigation';
import { ROUTES } from '../../../../constants/routes.constants';

export default function LeavePoliciesPage() {
  redirect(ROUTES.TENANT.LEAVE.TYPES);
}
