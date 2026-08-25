import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { EssContextService } from './ess-context.service';

@Injectable()
export class EssRosterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: EssContextService,
  ) {}

  async myRoster(tenantId: string, userId: string, from?: string, to?: string) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    const start = from ? this.dateOnly(from) : this.dateOnly(new Date().toISOString());
    const end = to ? this.dateOnly(to) : this.addDays(start, 14);
    const rows = await this.prisma.rosterAssignment.findMany({
      where: {
        tenantId,
        employeeId: employee.id,
        workDate: { gte: start, lte: end },
        OR: [{ isEffectivePublished: true }, { rosterStatus: 'PUBLISHED' }],
      },
      include: { shift: true, branch: { select: { id: true, name: true, code: true } } },
      orderBy: { workDate: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      workDate: row.workDate.toISOString().split('T')[0],
      rosterStatus: row.rosterStatus,
      isRestDay: row.isRestDay,
      branch: row.branch,
      shift: row.shift
        ? {
            id: row.shift.id,
            name: row.shift.name,
            code: row.shift.code,
            startLocalTime: row.shift.startLocalTime,
            endLocalTime: row.shift.endLocalTime,
            crossesMidnight: row.shift.crossesMidnight,
            requiredMinutes: row.shift.requiredMinutes,
          }
        : null,
      publishedAt: row.publishedAt?.toISOString() ?? null,
    }));
  }

  private dateOnly(value: string): Date {
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }

  private addDays(value: Date, days: number): Date {
    const next = new Date(value);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }
}
