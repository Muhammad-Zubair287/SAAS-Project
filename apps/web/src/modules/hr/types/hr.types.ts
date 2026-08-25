export type HrActionSeverity = 'info' | 'warning' | 'danger';

export type HrActionCentreKey =
  | 'attendanceExceptions'
  | 'onboardingJoiners'
  | 'probationReviews'
  | 'documentExpiry'
  | 'leavePending'
  | 'docsPendingReview';

export interface HrDashboardKpis {
  activeEmployees: number;
  presentToday: number;
  onLeaveToday: number;
  pendingApprovals: number;
  newJoinersThisMonth: number;
  exitsThisMonth: number;
  probationDue: number;
  documentsExpiring: number;
}

export interface HrDashboardResponse {
  kpis: HrDashboardKpis;
  headcount: {
    totalActive: number;
    byStatus: Array<{
      status: string;
      count: number;
    }>;
  };
  onboarding: {
    inProgress: number;
    overdueTasks: number;
  };
  attendance: {
    presentToday: number;
    absentToday: number;
    lateToday: number;
    onLeaveToday: number;
    unresolvedExceptions: number;
  };
  documents: {
    pendingReview: number;
    expiringWithin30Days: number;
  };
  organisation: {
    legalEntities: number;
    departments: number;
    employeesMissingManager: number;
  };
  charts: {
    attendanceTrend: Array<{
      date: string;
      present: number;
      absent: number;
      late: number;
      onLeave: number;
    }>;
    workforceComposition: Array<{
      departmentId: string | null;
      label: string | null;
      count: number;
    }>;
    headcountGrowth: Array<{
      month: string;
      hires: number;
      exits: number;
      headcount: number;
    }>;
    leaveUtilisation: Array<{
      status: string;
      requestCount: number;
      days: number;
    }>;
  };
  actionCentre: Array<{
    key: HrActionCentreKey;
    severity: HrActionSeverity;
    count: number;
  }>;
  recentActivity: Array<{
    id: string;
    occurredAt: string;
    eventType: string;
    summary: string;
    status: string | null;
    employee: {
      id: string;
      displayName: string;
    };
  }>;
  windows: {
    documentExpiryDays: number;
    probationDueDays: number;
    attendanceTrendDays: number;
    headcountGrowthMonths: number;
  };
  generatedAt: string;
}
