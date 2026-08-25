import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';

export type ApprovalInboxItemType = 'LEAVE' | 'CHANGE_REQUEST';

export interface ApprovalInboxItem {
  id: string;
  type: ApprovalInboxItemType;
  title: string;
  status: string;
  employeeId: string;
  employeeName: string | null;
  submittedAt: string | null;
  hrefLeaveRequestId?: string;
  hrefChangeRequestId?: string;
}

@Injectable()
export class ApprovalsInboxService {
  constructor(private readonly prisma: PrismaService) {}

  async getInbox(tenantId: string): Promise<{ items: ApprovalInboxItem[]; total: number }> {
    const [leaveRows, changeRows] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: { tenantId, status: 'SUBMITTED' },
        include: {
          leaveType: { select: { name: true, code: true } },
          employee: { select: { id: true, displayName: true } },
        },
        orderBy: [{ submittedAt: 'asc' }, { createdAt: 'asc' }],
        take: 100,
      }),
      this.prisma.employeeChangeRequest.findMany({
        where: { tenantId, status: { in: ['SUBMITTED', 'PENDING'] } },
        include: {
          employee: { select: { id: true, displayName: true } },
        },
        orderBy: [{ submittedAt: 'asc' }, { createdAt: 'asc' }],
        take: 100,
      }),
    ]);

    const leaveItems: ApprovalInboxItem[] = leaveRows.map((row) => ({
      id: row.id,
      type: 'LEAVE',
      title: `${row.leaveType.name} (${row.startsOn.toISOString().slice(0, 10)} → ${row.endsOn.toISOString().slice(0, 10)})`,
      status: row.status,
      employeeId: row.employeeId,
      employeeName: row.employee.displayName,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      hrefLeaveRequestId: row.id,
    }));

    const changeItems: ApprovalInboxItem[] = changeRows.map((row) => ({
      id: row.id,
      type: 'CHANGE_REQUEST',
      title: row.requestType + (row.section ? ` · ${row.section}` : ''),
      status: row.status,
      employeeId: row.employeeId,
      employeeName: row.employee.displayName,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      hrefChangeRequestId: row.id,
    }));

    const items = [...leaveItems, ...changeItems].sort((a, b) => {
      const aTime = a.submittedAt ? Date.parse(a.submittedAt) : 0;
      const bTime = b.submittedAt ? Date.parse(b.submittedAt) : 0;
      return aTime - bTime;
    });

    return { items, total: items.length };
  }
}
