/**
 * HR Console Scope A — permission catalogue & isolation contract tests.
 */
import {
  EMPLOYEE_PERMISSIONS,
  HR_CONSOLE_PERMISSION_CODES,
  ORGANISATION_PERMISSIONS,
  ATTENDANCE_PERMISSIONS,
} from '../../common/constants/permissions.constants';

describe('HR Console permissions catalogue', () => {
  it('includes employee lifecycle permissions', () => {
    expect(EMPLOYEE_PERMISSIONS.EMPLOYEE_TRANSFER).toBe('employee.transfer');
    expect(EMPLOYEE_PERMISSIONS.EMPLOYEE_STATUS_CHANGE).toBe('employee.status.change');
    expect(EMPLOYEE_PERMISSIONS.EMPLOYEE_IMPORT).toBe('employee.import');
    expect(EMPLOYEE_PERMISSIONS.EMPLOYEE_QUALITY_READ).toBe('employee.quality.read');
    expect(EMPLOYEE_PERMISSIONS.HR_DASHBOARD_READ).toBe('hr.dashboard.read');
  });

  it('includes organisation grade and overview permissions', () => {
    expect(ORGANISATION_PERMISSIONS.GRADE_READ).toBe('read:grade:tenant');
    expect(ORGANISATION_PERMISSIONS.ORG_OVERVIEW_READ).toBe('read:organisation_overview:tenant');
    expect(ORGANISATION_PERMISSIONS.ORG_HISTORY_READ).toBe('read:organisation_history:tenant');
  });

  it('includes attendance period lock permissions', () => {
    expect(ATTENDANCE_PERMISSIONS.PERIOD_LOCK).toBe('attendance.period.lock');
    expect(ATTENDANCE_PERMISSIONS.PERIOD_UNLOCK).toBe('attendance.period.unlock');
  });

  it('HR_CONSOLE_PERMISSION_CODES covers M03–M07 surfaces', () => {
    expect(HR_CONSOLE_PERMISSION_CODES.length).toBeGreaterThan(50);
    expect(HR_CONSOLE_PERMISSION_CODES).toContain(EMPLOYEE_PERMISSIONS.EMPLOYEE_CREATE);
    expect(HR_CONSOLE_PERMISSION_CODES).toContain(ORGANISATION_PERMISSIONS.DEPARTMENT_READ);
    expect(HR_CONSOLE_PERMISSION_CODES).toContain(ATTENDANCE_PERMISSIONS.EXCEPTION_READ);
  });

  it('never includes platform-scoped permissions', () => {
    for (const code of HR_CONSOLE_PERMISSION_CODES) {
      expect(code.startsWith('platform.')).toBe(false);
    }
  });
});

describe('HR tenant isolation contract', () => {
  it('documents JWT-derived tenant scoping for HR APIs', () => {
    expect(EMPLOYEE_PERMISSIONS.EMPLOYEE_READ).toContain(':tenant');
    expect(ORGANISATION_PERMISSIONS.GRADE_CREATE).toContain(':tenant');
  });
});
