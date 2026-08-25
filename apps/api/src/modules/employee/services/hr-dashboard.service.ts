import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { HR_DASHBOARD_CONSTANTS } from '../constants/hr-dashboard.constants';

function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addUtcDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function addUtcMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

@Injectable()
export class HrDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenantId: string) {
    const today = startOfUtcDay(new Date());
    const monthStart = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
    );
    const nextMonthStart = addUtcMonths(monthStart, 1);
    const expiryWindowEnd = addUtcDays(
      today,
      HR_DASHBOARD_CONSTANTS.DOCUMENT_EXPIRY_WINDOW_DAYS,
    );
    const probationWindowEnd = addUtcDays(
      today,
      HR_DASHBOARD_CONSTANTS.PROBATION_DUE_WINDOW_DAYS,
    );
    const trendStart = addUtcDays(
      today,
      -(HR_DASHBOARD_CONSTANTS.ATTENDANCE_TREND_DAYS - 1),
    );
    const growthStart = addUtcMonths(
      monthStart,
      -(HR_DASHBOARD_CONSTANTS.HEADCOUNT_GROWTH_MONTHS - 1),
    );

    const activeStatuses = [
      ...HR_DASHBOARD_CONSTANTS.ACTIVE_EMPLOYEE_STATUSES,
    ];

    const [
      headcountByStatus,
      totalActive,
      onLeaveTodayEmployees,
      newJoinersThisMonth,
      exitsThisMonth,
      probationDue,
      onboardingInProgress,
      onboardingOverdue,
      unresolvedExceptions,
      docsExpiringSoon,
      pendingDocumentReviews,
      pendingLeaveApprovals,
      legalEntities,
      departments,
      employeesMissingManager,
      attendanceTrendRows,
      workforceByDepartment,
      hireRowsForGrowth,
      exitRowsForGrowth,
      leaveUtilisationRows,
      recentTimeline,
    ] = await Promise.all([
      this.prisma.employee.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true },
      }),
      this.prisma.employee.count({
        where: { tenantId, status: { in: activeStatuses } },
      }),
      this.prisma.attendanceRecord.count({
        where: {
          tenantId,
          attendanceDate: today,
          OR: [
            { status: { in: [...HR_DASHBOARD_CONSTANTS.ON_LEAVE_STATUSES] } },
            { isLeave: true },
          ],
        },
      }),
      this.prisma.employee.count({
        where: {
          tenantId,
          hireDate: { gte: monthStart, lt: nextMonthStart },
        },
      }),
      this.prisma.employee.count({
        where: {
          tenantId,
          terminationDate: { gte: monthStart, lt: nextMonthStart },
        },
      }),
      this.prisma.employmentRecord.count({
        where: {
          tenantId,
          effectiveTo: null,
          probationEndDate: {
            gte: today,
            lte: probationWindowEnd,
          },
          employee: { status: { in: activeStatuses } },
        },
      }),
      this.prisma.onboardingInstance.count({
        where: { tenantId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      }),
      this.prisma.onboardingInstanceTask.count({
        where: {
          tenantId,
          status: { notIn: ['COMPLETED', 'WAIVED'] },
          dueDate: { lt: today },
        },
      }),
      this.prisma.attendanceException.count({
        where: { tenantId, isResolved: false },
      }),
      this.prisma.employeeDocument.count({
        where: {
          tenantId,
          expiryDate: { gte: today, lte: expiryWindowEnd },
          status: { not: 'REJECTED' },
        },
      }),
      this.prisma.employeeDocument.count({
        where: { tenantId, status: 'PENDING' },
      }),
      this.prisma.leaveRequest.count({
        where: { tenantId, status: 'SUBMITTED' },
      }),
      this.prisma.legalEntity.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.department.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.employee.count({
        where: {
          tenantId,
          status: { in: ['ACTIVE', 'PROBATION'] },
          managerId: null,
        },
      }),
      this.prisma.attendanceRecord.groupBy({
        by: ['attendanceDate', 'status'],
        where: {
          tenantId,
          attendanceDate: { gte: trendStart, lte: today },
        },
        _count: { _all: true },
      }),
      this.prisma.employee.groupBy({
        by: ['departmentId'],
        where: { tenantId, status: { in: activeStatuses } },
        _count: { _all: true },
      }),
      this.prisma.employee.findMany({
        where: {
          tenantId,
          hireDate: { gte: growthStart, lt: nextMonthStart },
        },
        select: { hireDate: true },
      }),
      this.prisma.employee.findMany({
        where: {
          tenantId,
          terminationDate: { gte: growthStart, lt: nextMonthStart },
        },
        select: { terminationDate: true },
      }),
      this.prisma.leaveRequest.groupBy({
        by: ['status'],
        where: {
          tenantId,
          startsOn: { lte: today },
          endsOn: { gte: addUtcMonths(today, -1) },
          status: { in: ['APPROVED', 'SUBMITTED'] },
        },
        _count: { _all: true },
        _sum: { requestedQuantity: true },
      }),
      this.prisma.employeeTimelineEvent.findMany({
        where: { tenantId, visibility: { in: ['HR', 'ALL'] } },
        include: {
          employee: { select: { id: true, displayName: true } },
        },
        orderBy: { occurredAt: 'desc' },
        take: HR_DASHBOARD_CONSTANTS.RECENT_ACTIVITY_LIMIT,
      }),
    ]);

    const presentToday = await this.prisma.attendanceRecord.count({
      where: {
        tenantId,
        attendanceDate: today,
        status: { in: [...HR_DASHBOARD_CONSTANTS.PRESENT_STATUSES] },
      },
    });
    const absentToday = await this.prisma.attendanceRecord.count({
      where: { tenantId, attendanceDate: today, status: 'ABSENT' },
    });
    const lateToday = await this.prisma.attendanceRecord.count({
      where: { tenantId, attendanceDate: today, status: 'LATE' },
    });

    const departmentIds = workforceByDepartment
      .map((row) => row.departmentId)
      .filter((id): id is string => Boolean(id));
    const departmentsMeta = departmentIds.length
      ? await this.prisma.department.findMany({
          where: { tenantId, id: { in: departmentIds } },
          select: { id: true, name: true },
        })
      : [];
    const departmentNameById = new Map(
      departmentsMeta.map((d) => [d.id, d.name]),
    );

    const attendanceTrend = this.buildAttendanceTrend(
      trendStart,
      today,
      attendanceTrendRows,
    );
    const headcountGrowth = this.buildHeadcountGrowth(
      growthStart,
      monthStart,
      hireRowsForGrowth,
      exitRowsForGrowth,
      totalActive,
    );

    const leaveUtilisation = leaveUtilisationRows.map((row) => ({
      status: row.status,
      requestCount: row._count._all,
      days:
        row._sum.requestedQuantity !== null &&
        row._sum.requestedQuantity !== undefined
          ? Number(row._sum.requestedQuantity)
          : 0,
    }));

    const actionCentre = [
      {
        key: 'attendanceExceptions',
        severity: 'warning' as const,
        count: unresolvedExceptions,
      },
      {
        key: 'onboardingJoiners',
        severity: 'info' as const,
        count: onboardingInProgress,
      },
      {
        key: 'probationReviews',
        severity: 'warning' as const,
        count: probationDue,
      },
      {
        key: 'documentExpiry',
        severity: 'danger' as const,
        count: docsExpiringSoon,
      },
      {
        key: 'leavePending',
        severity: 'info' as const,
        count: pendingLeaveApprovals,
      },
      {
        key: 'docsPendingReview',
        severity: 'warning' as const,
        count: pendingDocumentReviews,
      },
    ].filter((item) => item.count > 0);

    const recentActivity = recentTimeline.map((event) => ({
      id: event.id,
      occurredAt: event.occurredAt.toISOString(),
      eventType: event.eventType,
      summary: event.summary,
      status: typeof event.metadata === 'object' && event.metadata !== null && 'status' in event.metadata
        ? String((event.metadata as { status?: unknown }).status ?? '')
        : null,
      employee: {
        id: event.employee.id,
        displayName: event.employee.displayName,
      },
    }));

    return {
      kpis: {
        activeEmployees: totalActive,
        presentToday,
        onLeaveToday: onLeaveTodayEmployees,
        pendingApprovals: pendingLeaveApprovals,
        newJoinersThisMonth,
        exitsThisMonth,
        probationDue,
        documentsExpiring: docsExpiringSoon,
      },
      headcount: {
        totalActive,
        byStatus: headcountByStatus.map((r) => ({
          status: r.status,
          count: r._count._all,
        })),
      },
      onboarding: {
        inProgress: onboardingInProgress,
        overdueTasks: onboardingOverdue,
      },
      attendance: {
        presentToday,
        absentToday,
        lateToday,
        onLeaveToday: onLeaveTodayEmployees,
        unresolvedExceptions,
      },
      documents: {
        pendingReview: pendingDocumentReviews,
        expiringWithin30Days: docsExpiringSoon,
      },
      organisation: {
        legalEntities,
        departments,
        employeesMissingManager,
      },
      charts: {
        attendanceTrend,
        workforceComposition: workforceByDepartment.map((row) => ({
          departmentId: row.departmentId,
          label: row.departmentId
            ? (departmentNameById.get(row.departmentId) ?? row.departmentId)
            : null,
          count: row._count._all,
        })),
        headcountGrowth,
        leaveUtilisation,
      },
      actionCentre,
      recentActivity,
      windows: {
        documentExpiryDays: HR_DASHBOARD_CONSTANTS.DOCUMENT_EXPIRY_WINDOW_DAYS,
        probationDueDays: HR_DASHBOARD_CONSTANTS.PROBATION_DUE_WINDOW_DAYS,
        attendanceTrendDays: HR_DASHBOARD_CONSTANTS.ATTENDANCE_TREND_DAYS,
        headcountGrowthMonths: HR_DASHBOARD_CONSTANTS.HEADCOUNT_GROWTH_MONTHS,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  private buildAttendanceTrend(
    start: Date,
    end: Date,
    rows: Array<{
      attendanceDate: Date;
      status: string;
      _count: { _all: number };
    }>,
  ) {
    const byDate = new Map<
      string,
      { present: number; absent: number; late: number; onLeave: number }
    >();

    for (
      let cursor = new Date(start);
      cursor.getTime() <= end.getTime();
      cursor = addUtcDays(cursor, 1)
    ) {
      byDate.set(isoDate(cursor), {
        present: 0,
        absent: 0,
        late: 0,
        onLeave: 0,
      });
    }

    for (const row of rows) {
      const key = isoDate(row.attendanceDate);
      const bucket = byDate.get(key);
      if (!bucket) continue;
      if (
        (HR_DASHBOARD_CONSTANTS.PRESENT_STATUSES as readonly string[]).includes(
          row.status,
        )
      ) {
        bucket.present += row._count._all;
      }
      if (row.status === 'ABSENT') bucket.absent += row._count._all;
      if (row.status === 'LATE') bucket.late += row._count._all;
      if (
        (HR_DASHBOARD_CONSTANTS.ON_LEAVE_STATUSES as readonly string[]).includes(
          row.status,
        )
      ) {
        bucket.onLeave += row._count._all;
      }
    }

    return Array.from(byDate.entries()).map(([date, values]) => ({
      date,
      ...values,
    }));
  }

  private buildHeadcountGrowth(
    growthStart: Date,
    currentMonthStart: Date,
    hires: Array<{ hireDate: Date }>,
    exits: Array<{ terminationDate: Date | null }>,
    currentActive: number,
  ) {
    const months: string[] = [];
    for (
      let cursor = new Date(growthStart);
      cursor.getTime() <= currentMonthStart.getTime();
      cursor = addUtcMonths(cursor, 1)
    ) {
      months.push(monthKey(cursor));
    }

    const hireByMonth = new Map<string, number>();
    const exitByMonth = new Map<string, number>();
    for (const h of hires) {
      const key = monthKey(h.hireDate);
      hireByMonth.set(key, (hireByMonth.get(key) ?? 0) + 1);
    }
    for (const e of exits) {
      if (!e.terminationDate) continue;
      const key = monthKey(e.terminationDate);
      exitByMonth.set(key, (exitByMonth.get(key) ?? 0) + 1);
    }

    // Walk backwards from current active to reconstruct month-end headcount.
    const series: Array<{
      month: string;
      hires: number;
      exits: number;
      headcount: number;
    }> = [];
    let running = currentActive;
    for (let i = months.length - 1; i >= 0; i -= 1) {
      const month = months[i]!;
      const monthHires = hireByMonth.get(month) ?? 0;
      const monthExits = exitByMonth.get(month) ?? 0;
      series.unshift({
        month,
        hires: monthHires,
        exits: monthExits,
        headcount: running,
      });
      // Previous month-end ≈ current − hires + exits (of this month).
      running = running - monthHires + monthExits;
    }
    return series;
  }
}
