export type ApprovalItemType = 'LEAVE' | 'CHANGE_REQUEST';

export interface ApprovalInboxItem {
  id: string;
  type: ApprovalItemType;
  title: string;
  status: string;
  employeeId: string;
  employeeName: string | null;
  submittedAt: string | null;
  hrefLeaveRequestId?: string;
  hrefChangeRequestId?: string;
}

export interface ApprovalInboxResponse {
  items: ApprovalInboxItem[];
  total: number;
}
