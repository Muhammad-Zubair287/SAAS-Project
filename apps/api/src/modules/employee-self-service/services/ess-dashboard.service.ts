import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { EssContextService } from './ess-context.service';
import { EssAttendanceService } from './ess-attendance.service';
import { EssLeaveService } from './ess-leave.service';
import { EssPayslipService } from './ess-payslip.service';

@Injectable()
export class EssDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: EssContextService,
    private readonly attendance: EssAttendanceService,
    private readonly leave: EssLeaveService,
    private readonly payslips: EssPayslipService,
  ) {}

  async getDashboard(tenantId: string, userId: string) {
    const employee = await this.context.requireSelfEmployee(tenantId, userId);
    const today = this.todayDate();
    const inThirtyDays = new Date(today);
    inThirtyDays.setUTCDate(inThirtyDays.getUTCDate() + 30);

    const [
      todayRecord,
      rosterAssignment,
      pendingChangeRequests,
      pendingDocumentRequests,
      onboardingTask,
      unreadNotifications,
      expiringDocuments,
      policyDocuments,
      acknowledgedPolicyDocumentIds,
      leaveBalances,
      pendingLeaveRequests,
      latestPayslip,
      upcomingLeave,
      weeklyWorkedAgg,
    ] = await Promise.all([
      this.attendance.findTodayRecord(tenantId, employee.id),
      this.prisma.rosterAssignment.findFirst({
        where: {
          tenantId,
          employeeId: employee.id,
          workDate: today,
          OR: [{ isEffectivePublished: true }, { rosterStatus: 'PUBLISHED' }],
        },
        include: { shift: true },
      }),
      this.prisma.employeeChangeRequest.count({
        where: { tenantId, employeeId: employee.id, status: { in: ['SUBMITTED', 'PENDING'] } },
      }),
      this.prisma.documentRequest.count({
        where: { tenantId, employeeId: employee.id, status: { in: ['PENDING', 'PARTIAL'] } },
      }),
      this.prisma.onboardingInstance.findFirst({
        where: { tenantId, employeeId: employee.id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userNotification.count({ where: { tenantId, userId, readAt: null } }),
      this.prisma.employeeDocument.findMany({
        where: {
          tenantId,
          employeeId: employee.id,
          expiryDate: { gte: today, lte: inThirtyDays },
        },
        select: { id: true, title: true },
        take: 5,
        orderBy: { expiryDate: 'asc' },
      }),
      this.prisma.employeeDocument.findMany({
        where: {
          tenantId,
          employeeId: employee.id,
          OR: [
            { documentType: { contains: 'POLICY', mode: 'insensitive' } },
            { title: { contains: 'policy', mode: 'insensitive' } },
          ],
        },
        select: { id: true, title: true },
      }),
      this.prisma.policyAcknowledgement.findMany({
        where: { tenantId, employeeId: employee.id, employeeDocumentId: { not: null } },
        select: { employeeDocumentId: true },
      }),
      this.leave.getBalancesForEmployee(tenantId, employee.id),
      this.prisma.leaveRequest.count({
        where: { tenantId, employeeId: employee.id, status: 'SUBMITTED' },
      }),
      this.payslips.latestPublishedForEmployee(tenantId, employee.id),
      this.prisma.leaveRequest.findFirst({
        where: {
          tenantId,
          employeeId: employee.id,
          status: 'APPROVED',
          startsOn: { gte: today },
        },
        include: { leaveType: true },
        orderBy: { startsOn: 'asc' },
      }),
      this.prisma.attendanceRecord.aggregate({
        where: {
          tenantId,
          employeeId: employee.id,
          attendanceDate: {
            gte: this.startOfUtcWeek(today),
            lte: today,
          },
        },
        _sum: { totalWorkedMinutes: true },
      }),
    ]);

    const acknowledgedIds = new Set(
      acknowledgedPolicyDocumentIds
        .map((ack) => ack.employeeDocumentId)
        .filter((id): id is string => Boolean(id)),
    );
    const unacknowledgedPolicies = policyDocuments.filter((doc) => !acknowledgedIds.has(doc.id));
    const reminderTitles = [...unacknowledgedPolicies, ...expiringDocuments]
      .filter((doc, index, all) => all.findIndex((candidate) => candidate.id === doc.id) === index)
      .slice(0, 5)
      .map((doc) => doc.title);

    return {
      greetingName: employee.preferredName ?? employee.firstName ?? employee.displayName,
      todayDate: today.toISOString().split('T')[0],
      attendance: {
        status: todayRecord?.status ?? null,
        firstCheckIn: todayRecord?.firstCheckIn?.toISOString() ?? null,
        lastCheckOut: todayRecord?.lastCheckOut?.toISOString() ?? null,
        workedTodayMinutes: todayRecord?.totalWorkedMinutes ?? 0,
        suggestedAction: this.attendance.suggestedAction(todayRecord),
      },
      location: employee.branch
        ? { id: employee.branch.id, name: employee.branch.name }
        : null,
      weeklyWorkedMinutes: weeklyWorkedAgg._sum.totalWorkedMinutes ?? 0,
      todayShift: this.toShiftDto(rosterAssignment?.shift ?? employee.defaultShift, rosterAssignment?.isRestDay ?? false),
      leaveBalances: leaveBalances.slice(0, 3),
      payslip: latestPayslip,
      upcomingLeave: upcomingLeave
        ? {
            id: upcomingLeave.id,
            leaveType: {
              code: upcomingLeave.leaveType.code,
              name: upcomingLeave.leaveType.name,
            },
            startsOn: upcomingLeave.startsOn.toISOString().split('T')[0],
            endsOn: upcomingLeave.endsOn.toISOString().split('T')[0],
            requestedQuantity: Number(upcomingLeave.requestedQuantity),
          }
        : null,
      modules: {
        leaveAvailable: true,
        payslipAvailable: true,
      },
      pendingRequestsCount: pendingChangeRequests + pendingDocumentRequests + pendingLeaveRequests,
      onboardingTask: onboardingTask
        ? {
            id: onboardingTask.id,
            title: onboardingTask.title,
            status: onboardingTask.status,
            dueDate: onboardingTask.dueDate?.toISOString().split('T')[0] ?? null,
          }
        : null,
      documentReminder: {
        count: unacknowledgedPolicies.length + expiringDocuments.length,
        sampleTitles: reminderTitles,
      },
      announcements: [],
      unreadNotifications,
      generatedAt: new Date().toISOString(),
    };
  }

  private todayDate(): Date {
    return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  }

  /** Monday 00:00 UTC of the week containing `date` (ISO week start). */
  private startOfUtcWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  private toShiftDto(
    shift: {
      id: string;
      name: string;
      code: string;
      startLocalTime: string;
      endLocalTime: string;
      crossesMidnight: boolean;
      requiredMinutes: number;
    } | null | undefined,
    isRestDay: boolean,
  ) {
    if (isRestDay) {
      return { isRestDay: true, shift: null };
    }
    return {
      isRestDay: false,
      shift: shift
        ? {
            id: shift.id,
            name: shift.name,
            code: shift.code,
            startLocalTime: shift.startLocalTime,
            endLocalTime: shift.endLocalTime,
            crossesMidnight: shift.crossesMidnight,
            requiredMinutes: shift.requiredMinutes,
          }
        : null,
    };
  }
}
