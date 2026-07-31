export interface LeaveCheckAdapter {
  hasApprovedLeave(tenantId: string, employeeId: string, date: Date): Promise<boolean>;
  isHoliday(tenantId: string, legalEntityId: string | null, date: Date): Promise<boolean>;
}

export class NullLeaveCheckAdapter implements LeaveCheckAdapter {
  async hasApprovedLeave(): Promise<boolean> { return false; }
  async isHoliday(): Promise<boolean> { return false; }
}
