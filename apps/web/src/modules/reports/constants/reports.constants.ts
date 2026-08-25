import { ROUTES } from '../../../constants/routes.constants';
import {
  EMPLOYEE_PERMISSIONS,
  LEAVE_PERMISSIONS,
  ATTENDANCE_PERMISSIONS,
} from '../../../lib/permissions/constants';
import { TENANT_ADMIN_PERMISSIONS } from '../../tenant/constants/tenant-admin.permissions';

export interface ReportCatalogueItem {
  code: string;
  titleKey: string;
  descriptionKey: string;
  permission: string;
  href: string;
}

/** Report centre catalogue — Run navigates to existing filtered routes. */
export const REPORT_CATALOGUE: ReportCatalogueItem[] = [
  {
    code: 'hr-employee-directory',
    titleKey: 'tenant.reports.catalogue.hrDirectory.title',
    descriptionKey: 'tenant.reports.catalogue.hrDirectory.description',
    permission: EMPLOYEE_PERMISSIONS.EMPLOYEE_READ,
    href: ROUTES.TENANT.EMPLOYEES.ROOT,
  },
  {
    code: 'attendance-daily',
    titleKey: 'tenant.reports.catalogue.attendanceDaily.title',
    descriptionKey: 'tenant.reports.catalogue.attendanceDaily.description',
    permission: ATTENDANCE_PERMISSIONS.RECORD_READ,
    href: ROUTES.TENANT.ATTENDANCE.RECORDS,
  },
  {
    code: 'leave-pending',
    titleKey: 'tenant.reports.catalogue.leavePending.title',
    descriptionKey: 'tenant.reports.catalogue.leavePending.description',
    permission: LEAVE_PERMISSIONS.REQUEST_READ,
    href: `${ROUTES.TENANT.LEAVE.REQUESTS}?status=SUBMITTED`,
  },
  {
    code: 'audit',
    titleKey: 'tenant.reports.catalogue.audit.title',
    descriptionKey: 'tenant.reports.catalogue.audit.description',
    permission: TENANT_ADMIN_PERMISSIONS.AUDIT_READ,
    href: ROUTES.TENANT.AUDIT,
  },
];
