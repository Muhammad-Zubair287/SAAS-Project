import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class OnboardingDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenantId: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const inFourteenDays = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    const [
      employeesOnboarding,
      overdueTasks,
      documentsPendingReview,
      awaitingActivation,
      upcomingJoining,
      completed,
      inProgress,
    ] = await Promise.all([
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
      this.prisma.employeeDocument.count({
        where: { tenantId, status: 'PENDING' },
      }),
      this.prisma.onboardingInstance.count({
        where: { tenantId, status: 'COMPLETED' },
      }),
      this.prisma.employee.count({
        where: {
          tenantId,
          status: { in: ['ACTIVE', 'PROBATION'] },
          hireDate: { gte: today, lte: inFourteenDays },
        },
      }),
      this.prisma.onboardingInstance.count({
        where: { tenantId, status: 'COMPLETED' },
      }),
      this.prisma.onboardingInstance.count({
        where: { tenantId, status: 'IN_PROGRESS' },
      }),
    ]);

    const total = completed + inProgress + employeesOnboarding;
    const completionPercentage =
      total === 0 ? 0 : Math.round((completed / Math.max(total, 1)) * 100);

    return {
      employeesOnboarding,
      completionPercentage,
      overdueTasks,
      documentsPendingReview,
      employeesAwaitingActivation: awaitingActivation,
      upcomingJoiningDates: upcomingJoining,
      generatedAt: new Date().toISOString(),
    };
  }
}
