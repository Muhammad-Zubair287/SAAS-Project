/**
 * M08 Leave Admin — permission catalogue contracts for tenant HR console APIs.
 */
import {
  HR_CONSOLE_PERMISSION_CODES,
  LEAVE_PERMISSIONS,
} from '../../common/constants/permissions.constants';

describe('Leave admin permissions catalogue', () => {
  it('defines request read and type manage codes', () => {
    expect(LEAVE_PERMISSIONS.REQUEST_READ).toBe('leave.request.read');
    expect(LEAVE_PERMISSIONS.TYPE_MANAGE).toBe('leave.policy.manage');
    expect(LEAVE_PERMISSIONS.TYPE_READ).toBe('leave.policy.read');
    expect(LEAVE_PERMISSIONS.BALANCE_ADJUST).toBe('leave.balance.adjust');
    expect(LEAVE_PERMISSIONS.REQUEST_APPROVE).toBe('leave.request.approve');
  });

  it('includes admin leave permissions in HR console catalogue', () => {
    expect(HR_CONSOLE_PERMISSION_CODES).toContain(LEAVE_PERMISSIONS.REQUEST_READ);
    expect(HR_CONSOLE_PERMISSION_CODES).toContain(LEAVE_PERMISSIONS.TYPE_MANAGE);
    expect(HR_CONSOLE_PERMISSION_CODES).toContain(LEAVE_PERMISSIONS.TYPE_READ);
    expect(HR_CONSOLE_PERMISSION_CODES).toContain(LEAVE_PERMISSIONS.BALANCE_ADJUST);
    expect(HR_CONSOLE_PERMISSION_CODES).toContain(LEAVE_PERMISSIONS.REQUEST_APPROVE);
  });

  it('keeps self-scoped leave codes distinct from tenant-wide request read', () => {
    expect(LEAVE_PERMISSIONS.REQUEST_READ_SELF).toBe('leave.request.read.self');
    expect(LEAVE_PERMISSIONS.REQUEST_READ).not.toBe(LEAVE_PERMISSIONS.REQUEST_READ_SELF);
    expect(LEAVE_PERMISSIONS.BALANCE_READ_SELF).toBe('leave.balance.read.self');
  });

  it('does not expose leave admin manage codes as platform.*', () => {
    for (const code of Object.values(LEAVE_PERMISSIONS)) {
      expect(code.startsWith('platform.')).toBe(false);
    }
  });
});
