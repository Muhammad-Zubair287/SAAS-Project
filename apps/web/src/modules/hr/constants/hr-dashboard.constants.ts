import { ROUTES } from '../../../constants/routes.constants';
import type { HrActionCentreKey } from '../types/hr.types';

export const HR_ACTION_CENTRE_ROUTES: Record<HrActionCentreKey, string> = {
  attendanceExceptions: ROUTES.TENANT.ATTENDANCE.EXCEPTIONS,
  onboardingJoiners: ROUTES.TENANT.DOCUMENTS.ONBOARDING,
  probationReviews: ROUTES.TENANT.EMPLOYEES.ROOT,
  documentExpiry: ROUTES.TENANT.DOCUMENTS.ROOT,
  leavePending: ROUTES.TENANT.LEAVE.REQUESTS,
  docsPendingReview: ROUTES.TENANT.DOCUMENTS.ROOT,
};

export const HR_QUICK_ACTIONS = [
  {
    key: 'addEmployee',
    href: ROUTES.TENANT.EMPLOYEES.NEW,
  },
  {
    key: 'startOnboarding',
    href: ROUTES.TENANT.DOCUMENTS.ONBOARDING_NEW,
  },
  {
    key: 'reviewExceptions',
    href: ROUTES.TENANT.ATTENDANCE.EXCEPTIONS,
  },
  {
    key: 'approveLeave',
    href: ROUTES.TENANT.LEAVE.REQUESTS,
  },
  {
    key: 'uploadDocument',
    href: ROUTES.TENANT.DOCUMENTS.ROOT,
  },
  {
    key: 'runReports',
    href: ROUTES.TENANT.REPORTS.ROOT,
  },
] as const;
