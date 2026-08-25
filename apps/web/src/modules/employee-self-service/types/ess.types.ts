import type { ResponseMeta } from '../../../lib/api/types';

export type EssSuggestedAttendanceAction = 'CHECK_IN' | 'CHECK_OUT' | 'NONE';

export interface EssShift {
  id: string;
  name: string;
  code: string;
  startLocalTime: string;
  endLocalTime: string;
  crossesMidnight: boolean;
  requiredMinutes: number;
}

export interface EssDashboardResponse {
  greetingName: string;
  todayDate: string;
  attendance: {
    status: string | null;
    firstCheckIn: string | null;
    lastCheckOut: string | null;
    workedTodayMinutes: number;
    suggestedAction: EssSuggestedAttendanceAction;
  };
  location: { id: string; name: string } | null;
  weeklyWorkedMinutes: number;
  todayShift: {
    isRestDay: boolean;
    shift: EssShift | null;
  };
  leaveBalances: EssLeaveBalance[];
  payslip: EssPayslip | null;
  upcomingLeave: {
    id: string;
    leaveType: { code: string; name: string };
    startsOn: string;
    endsOn: string;
    requestedQuantity: number;
  } | null;
  modules: {
    leaveAvailable: boolean;
    payslipAvailable: boolean;
  };
  pendingRequestsCount: number;
  onboardingTask: {
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
  } | null;
  documentReminder: {
    count: number;
    sampleTitles: string[];
  };
  announcements: Array<{ id?: string; title?: string; body?: string }>;
  unreadNotifications: number;
  generatedAt: string;
}

export interface EssAttendanceRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  attendanceDate: string;
  firstCheckIn: string | null;
  lastCheckOut: string | null;
  totalWorkedMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  status: string;
  isManual: boolean;
  isLeave: boolean;
  isHoliday: boolean;
  isWeekend: boolean;
  manualNote: string | null;
  periodLocked: boolean;
  calculatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
}

export interface EssTodayAttendanceResponse {
  record: EssAttendanceRecord | null;
  suggestedAction: EssSuggestedAttendanceAction;
}

export interface EssProfileResponse {
  id: string;
  fieldAccess: Record<string, 'direct' | 'request' | 'readonly'>;
  personal: {
    employeeNumber: string;
    firstName: string;
    lastName: string;
    displayName: string;
    preferredName: string | null;
    gender: string | null;
    dateOfBirth: string | null;
  };
  contact: {
    emailWork: string | null;
    emailPersonal: string | null;
    phoneWork: string | null;
    phoneMobile: string | null;
    address: {
      addressLine1: string | null;
      addressLine2: string | null;
      city: string | null;
      stateProvince: string | null;
      postalCode: string | null;
      countryCode: string | null;
    };
  };
  employment: {
    hireDate: string | null;
    terminationDate: string | null;
    status: string;
    employmentType: string | null;
  };
  manager: { id: string; displayName: string } | null;
  location: {
    legalEntity: { id: string; name: string; code: string } | null;
    branch: { id: string; name: string; code: string } | null;
    department: { id: string; name: string; code: string } | null;
    position: { id: string; title: string; code: string } | null;
  };
  emergencyContacts: Array<{
    id: string;
    name: string;
    relationship: string;
    phone: string;
    email: string | null;
    isPrimary: boolean;
  }>;
  rowVersion: string;
}

export interface PatchEssProfilePayload {
  phoneMobile?: string;
  emailPersonal?: string;
  preferredName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  countryCode?: string;
}

export interface EssDocument {
  id: string;
  employeeId: string;
  documentType: string;
  title: string;
  hasFile: boolean;
  fileSize: number | null;
  mimeType: string | null;
  expiryDate: string | null;
  issuedDate: string | null;
  issuedBy: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
}

export type EssRequestType = 'PROFILE_CHANGE' | 'ATTENDANCE_CORRECTION' | 'DOCUMENT' | 'OTHER';
export type EssRequestCreateStatus = 'DRAFT' | 'SUBMITTED';

export interface EssRequestListItem {
  id: string;
  category: string;
  title: string;
  status: string;
  submittedAt: string;
  type: 'EMPLOYEE_CHANGE_REQUEST' | 'DOCUMENT_REQUEST';
}

export interface EssRequestDetail {
  id: string;
  tenantId: string;
  employeeId: string;
  requestType: string;
  section: string | null;
  fieldPath: string | null;
  currentValue: string | null;
  requestedValue: string | null;
  reason: string | null;
  evidenceFileKey: string | null;
  status: string;
  timeline: {
    createdAt: string;
    submittedAt: string | null;
    decidedAt: string | null;
    decidedBy: string | null;
  };
  decisionNote: string | null;
  updatedAt: string;
  rowVersion: string;
}

export interface CreateEssRequestPayload {
  requestType: EssRequestType;
  section?: string;
  fieldPath?: string;
  currentValue?: string;
  requestedValue?: string;
  reason?: string;
  evidenceFileKey?: string;
  status?: EssRequestCreateStatus;
}

export interface EssNotification {
  id: string;
  title: string;
  body: string | null;
  category: string | null;
  linkPath: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface EssPolicy {
  id: string;
  policyKey: string;
  policyTitle: string;
  policyVersion: string;
  documentType: string;
  effectiveDate: string | null;
}

export interface AcknowledgeEssPolicyPayload {
  policyKey: string;
  policyTitle: string;
  policyVersion: string;
  effectiveDate?: string;
  summary?: string;
  employeeDocumentId?: string;
}

export interface EssRosterItem {
  id: string;
  workDate: string;
  rosterStatus: string;
  isRestDay: boolean;
  branch: { id: string; name: string; code: string } | null;
  shift: EssShift | null;
  publishedAt: string | null;
}

export interface EssLeaveBalance {
  leaveTypeId: string;
  code: string;
  name: string;
  unit: 'DAY' | 'HOUR';
  available: number;
  pendingReserved: number;
}

export interface EssLeaveType {
  id: string;
  code: string;
  name: string;
  paidStatus: 'PAID' | 'UNPAID' | 'MIXED';
  unit: 'DAY' | 'HOUR';
  halfDayAllowed: boolean;
  status: string;
}

export interface EssLeaveRequestDay {
  id: string;
  leaveDate: string;
  quantity: number;
  dayPart: 'FULL' | 'FIRST_HALF' | 'SECOND_HALF';
  holiday: boolean;
  restDay: boolean;
  payrollImpact: 'NONE' | 'PAID' | 'UNPAID';
}

export interface EssLeaveRequest {
  id: string;
  leaveType: {
    id: string;
    code: string;
    name: string;
    unit: 'DAY' | 'HOUR';
  };
  startsOn: string;
  endsOn: string;
  requestedQuantity: number;
  reason: string | null;
  evidenceFileKey: string | null;
  emergency: boolean;
  status: string;
  submittedAt: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  days: EssLeaveRequestDay[];
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
}

export interface CreateEssLeaveRequestPayload {
  leaveTypeId: string;
  startsOn: string;
  endsOn: string;
  dayPart?: 'FULL' | 'FIRST_HALF' | 'SECOND_HALF';
  halfDay?: boolean;
  reason?: string;
  evidenceFileKey?: string;
  emergency?: boolean;
  status?: 'DRAFT' | 'SUBMITTED';
}

export interface EssPayslip {
  id: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  grossAmount: number;
  netAmount: number;
  earnings: unknown[];
  deductions: unknown[];
  status: string;
  publishedAt: string | null;
  documentFileKey: string | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: string;
}

export interface EssListParams {
  page?: number;
  pageSize?: number;
}

export interface EssDateRangeParams extends EssListParams {
  from?: string;
  to?: string;
}

export interface EssRequestsParams extends EssListParams {
  type?: string;
  status?: string;
}

export interface EssNotificationsParams extends EssListParams {
  status?: 'READ' | 'UNREAD';
}

export interface EssLeaveRequestsParams extends EssListParams {
  status?: string;
}

export interface EssPaginated<T> {
  data: T[];
  meta?: ResponseMeta;
}
