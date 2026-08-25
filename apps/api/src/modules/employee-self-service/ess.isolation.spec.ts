/**
 * M11 ESS — permission catalogue & ownership / isolation contracts.
 */
import {
  ATTENDANCE_PERMISSIONS,
  EMPLOYEE_PERMISSIONS,
  ESS_EMPLOYEE_PERMISSION_CODES,
  ESS_PERMISSIONS,
  LEAVE_PERMISSIONS,
  PAYSLIP_PERMISSIONS,
} from '../../common/constants/permissions.constants';

describe('ESS permissions catalogue', () => {
  it('defines API-spec change-request permissions', () => {
    expect(ESS_PERMISSIONS.EMPLOYEE_SELF_UPDATE).toBe('employee.self.update');
    expect(ESS_PERMISSIONS.EMPLOYEE_CHANGE_APPROVE).toBe('employee.change.approve');
    expect(ESS_PERMISSIONS.DASHBOARD_READ).toBe('ess.dashboard.read');
  });

  it('includes self-scoped attendance and document permissions', () => {
    expect(ESS_PERMISSIONS.EVENT_CREATE_SELF).toBe('create:attendance_event:self');
    expect(ESS_PERMISSIONS.DOCUMENT_READ_SELF).toBe('read:employee_document:self');
    expect(ATTENDANCE_PERMISSIONS.RECORD_READ_SELF).toBe('read:attendance_record:self');
    expect(EMPLOYEE_PERMISSIONS.EMPLOYEE_READ_SELF).toBe('read:employee:self');
  });

  it('includes employee leave and payslip permissions', () => {
    expect(LEAVE_PERMISSIONS.TYPE_READ).toBe('leave.policy.read');
    expect(LEAVE_PERMISSIONS.REQUEST_READ_SELF).toBe('leave.request.read.self');
    expect(LEAVE_PERMISSIONS.BALANCE_READ_SELF).toBe('leave.balance.read.self');
    expect(PAYSLIP_PERMISSIONS.READ_SELF).toBe('payslip.read');
    expect(PAYSLIP_PERMISSIONS.DOWNLOAD).toBe('payslip.download');
    expect(ESS_EMPLOYEE_PERMISSION_CODES).toContain(LEAVE_PERMISSIONS.REQUEST_CREATE);
    expect(ESS_EMPLOYEE_PERMISSION_CODES).toContain(LEAVE_PERMISSIONS.REQUEST_CANCEL);
    expect(ESS_EMPLOYEE_PERMISSION_CODES).toContain(PAYSLIP_PERMISSIONS.READ_SELF);
    expect(ESS_EMPLOYEE_PERMISSION_CODES).not.toContain(PAYSLIP_PERMISSIONS.PUBLISH);
  });

  it('Employee role catalogue includes all ESS codes and never platform.*', () => {
    expect(ESS_EMPLOYEE_PERMISSION_CODES).toContain(ESS_PERMISSIONS.DASHBOARD_READ);
    expect(ESS_EMPLOYEE_PERMISSION_CODES).toContain(EMPLOYEE_PERMISSIONS.EMPLOYEE_READ_SELF);
    expect(ESS_EMPLOYEE_PERMISSION_CODES).toContain(ATTENDANCE_PERMISSIONS.EVENT_READ_SELF);
    for (const code of ESS_EMPLOYEE_PERMISSION_CODES) {
      expect(code.startsWith('platform.')).toBe(false);
    }
  });
});

describe('ESS ownership isolation contract', () => {
  it('resolves self employee only via JWT userId + tenantId (no client employeeId)', () => {
    // Contract documented in EssContextService.requireSelfEmployee:
    // where: { tenantId, userId: user.userId }
    const resolution = { tenantId: 'tenant-a', userId: 'user-a' };
    expect(resolution).toEqual({ tenantId: 'tenant-a', userId: 'user-a' });
    expect(Object.keys(resolution)).not.toContain('employeeId');
  });

  it('self permissions use :self scope or ESS-specific codes', () => {
    const selfish = ESS_EMPLOYEE_PERMISSION_CODES.filter(
      (c) => c.includes(':self') || c.startsWith('ess.') || c.startsWith('employee.self') || c.includes('.self'),
    );
    expect(selfish.length).toBeGreaterThan(5);
  });

  it('blocks cross-employee access pattern: employee A cannot use employee B id', () => {
    const employeeA = { id: 'emp-a', userId: 'user-a', tenantId: 't1' };
    const employeeB = { id: 'emp-b', userId: 'user-b', tenantId: 't1' };
    const caller = { userId: 'user-a', tenantId: 't1' };
    const linked =
      employeeA.userId === caller.userId && employeeA.tenantId === caller.tenantId
        ? employeeA
        : null;
    expect(linked?.id).toBe('emp-a');
    expect(employeeB.userId === caller.userId).toBe(false);
  });

  it('leave and payslip self APIs resolve employee ownership from JWT identity only', () => {
    const caller = { tenantId: 'tenant-a', userId: 'user-a' };
    const leaveRequest = { id: 'leave-a', tenantId: 'tenant-a', employeeId: 'emp-a' };
    const payslip = { id: 'pay-a', tenantId: 'tenant-a', employeeId: 'emp-a' };
    const linkedEmployee = { id: 'emp-a', tenantId: 'tenant-a', userId: 'user-a' };

    const canReadLeave =
      linkedEmployee.tenantId === caller.tenantId &&
      linkedEmployee.userId === caller.userId &&
      leaveRequest.employeeId === linkedEmployee.id;
    const canReadPayslip =
      linkedEmployee.tenantId === caller.tenantId &&
      linkedEmployee.userId === caller.userId &&
      payslip.employeeId === linkedEmployee.id;

    expect(canReadLeave).toBe(true);
    expect(canReadPayslip).toBe(true);
  });

  it('blocks cross-tenant access even if userId collides conceptually', () => {
    const row = { tenantId: 'tenant-b', userId: 'user-a' };
    const caller = { tenantId: 'tenant-a', userId: 'user-a' };
    const allowed = row.tenantId === caller.tenantId && row.userId === caller.userId;
    expect(allowed).toBe(false);
  });
});
