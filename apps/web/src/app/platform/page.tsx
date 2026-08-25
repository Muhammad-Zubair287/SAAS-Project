import { redirect } from 'next/navigation';
import { ROUTES } from '../../constants/routes.constants';

export default function PlatformIndexPage() {
  redirect(ROUTES.PLATFORM.DASHBOARD);
}
