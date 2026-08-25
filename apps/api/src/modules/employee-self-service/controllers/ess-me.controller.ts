import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import {
  ATTENDANCE_PERMISSIONS,
  EMPLOYEE_PERMISSIONS,
  ESS_PERMISSIONS,
  LEAVE_PERMISSIONS,
  PAYSLIP_PERMISSIONS,
} from '../../../common/constants/permissions.constants';
import { PatchEssProfileDto } from '../dto/patch-ess-profile.dto';
import { CreateChangeRequestDto } from '../dto/create-change-request.dto';
import { CreateLeaveRequestDto, ListLeaveRequestsQueryDto } from '../dto/ess-leave.dto';
import { AcknowledgePolicyDto } from '../dto/acknowledge-policy.dto';
import {
  DateRangeQueryDto,
  ListEssAttendanceQueryDto,
  ListEssNotificationsQueryDto,
  ListEssRequestsQueryDto,
} from '../dto/list-ess-query.dto';
import { EssContextService } from '../services/ess-context.service';
import { EssDashboardService } from '../services/ess-dashboard.service';
import { EssProfileService } from '../services/ess-profile.service';
import { EssAttendanceService } from '../services/ess-attendance.service';
import { EssDocumentsService } from '../services/ess-documents.service';
import { EssRequestsService } from '../services/ess-requests.service';
import { EssNotificationsService } from '../services/ess-notifications.service';
import { EssRosterService } from '../services/ess-roster.service';
import { EssLeaveService } from '../services/ess-leave.service';
import { EssPayslipService } from '../services/ess-payslip.service';

@ApiTags('employee-self-service')
@ApiBearerAuth()
@Controller('me')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class EssMeController {
  constructor(
    private readonly context: EssContextService,
    private readonly dashboard: EssDashboardService,
    private readonly profile: EssProfileService,
    private readonly attendance: EssAttendanceService,
    private readonly documents: EssDocumentsService,
    private readonly requests: EssRequestsService,
    private readonly notifications: EssNotificationsService,
    private readonly roster: EssRosterService,
    private readonly leave: EssLeaveService,
    private readonly payslips: EssPayslipService,
  ) {}

  @Get('dashboard')
  @RequirePermissions(ESS_PERMISSIONS.DASHBOARD_READ)
  @ApiOperation({ summary: 'Get ESS dashboard for the current employee' })
  getDashboard(@CurrentUser() user: CurrentUserContext) {
    return this.dashboard.getDashboard(this.context.assertTenant(user), user.userId);
  }

  @Get('profile')
  @RequirePermissions(EMPLOYEE_PERMISSIONS.EMPLOYEE_READ_SELF)
  @ApiOperation({ summary: 'Get current employee ESS profile' })
  getProfile(@CurrentUser() user: CurrentUserContext) {
    return this.profile.getProfile(this.context.assertTenant(user), user.userId);
  }

  @Patch('profile')
  @RequirePermissions(ESS_PERMISSIONS.EMPLOYEE_SELF_UPDATE)
  @ApiOperation({ summary: 'Patch direct-edit ESS profile fields' })
  patchProfile(@Body() dto: PatchEssProfileDto, @CurrentUser() user: CurrentUserContext) {
    return this.profile.patchProfile(this.context.assertTenant(user), user.userId, dto);
  }

  @Get('attendance/records')
  @RequirePermissions(ATTENDANCE_PERMISSIONS.RECORD_READ_SELF)
  @ApiOperation({ summary: 'List current employee attendance records' })
  listAttendanceRecords(
    @Query() query: ListEssAttendanceQueryDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.attendance.listRecords(
      this.context.assertTenant(user),
      user.userId,
      query.from,
      query.to,
      query.page,
      query.pageSize,
    );
  }

  @Get('attendance/today')
  @RequirePermissions(ATTENDANCE_PERMISSIONS.RECORD_READ_SELF)
  @ApiOperation({ summary: 'Get current employee attendance for today' })
  getTodayAttendance(@CurrentUser() user: CurrentUserContext) {
    return this.attendance.getToday(this.context.assertTenant(user), user.userId);
  }

  @Post('attendance/check-in')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(ESS_PERMISSIONS.EVENT_CREATE_SELF)
  @ApiOperation({ summary: 'Create self check-in attendance event' })
  checkIn(
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
    @Ip() ip: string,
  ) {
    return this.attendance.checkIn(
      this.context.assertTenant(user),
      user.userId,
      user.email,
      correlationId,
      ip,
    );
  }

  @Post('attendance/check-out')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(ESS_PERMISSIONS.EVENT_CREATE_SELF)
  @ApiOperation({ summary: 'Create self check-out attendance event' })
  checkOut(
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
    @Ip() ip: string,
  ) {
    return this.attendance.checkOut(
      this.context.assertTenant(user),
      user.userId,
      user.email,
      correlationId,
      ip,
    );
  }

  @Get('documents')
  @RequirePermissions(ESS_PERMISSIONS.DOCUMENT_READ_SELF)
  @ApiOperation({ summary: 'List current employee documents' })
  listDocuments(@Query() query: ListEssAttendanceQueryDto, @CurrentUser() user: CurrentUserContext) {
    return this.documents.listDocuments(
      this.context.assertTenant(user),
      user.userId,
      query.page,
      query.pageSize,
    );
  }

  @Get('documents/:id')
  @RequirePermissions(ESS_PERMISSIONS.DOCUMENT_READ_SELF)
  @ApiOperation({ summary: 'Get current employee document' })
  getDocument(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserContext) {
    return this.documents.getDocument(this.context.assertTenant(user), user.userId, id);
  }

  @Get('roster')
  @RequirePermissions(ESS_PERMISSIONS.ROSTER_READ_SELF)
  @ApiOperation({ summary: 'Get current employee published roster' })
  getRoster(@Query() query: DateRangeQueryDto, @CurrentUser() user: CurrentUserContext) {
    return this.roster.myRoster(this.context.assertTenant(user), user.userId, query.from, query.to);
  }

  @Get('leave/balances')
  @RequirePermissions(LEAVE_PERMISSIONS.BALANCE_READ_SELF)
  @ApiOperation({ summary: 'Get current employee leave balances' })
  getLeaveBalances(@CurrentUser() user: CurrentUserContext) {
    return this.leave.getBalances(this.context.assertTenant(user), user.userId);
  }

  @Get('leave/types')
  @RequirePermissions(LEAVE_PERMISSIONS.TYPE_READ)
  @ApiOperation({ summary: 'List active leave types for the current tenant' })
  listLeaveTypes(@CurrentUser() user: CurrentUserContext) {
    return this.leave.listTypes(this.context.assertTenant(user));
  }

  @Get('leave/requests')
  @RequirePermissions(LEAVE_PERMISSIONS.REQUEST_READ_SELF)
  @ApiOperation({ summary: 'List current employee leave requests' })
  listLeaveRequests(@Query() query: ListLeaveRequestsQueryDto, @CurrentUser() user: CurrentUserContext) {
    return this.leave.listRequests(this.context.assertTenant(user), user.userId, query);
  }

  @Get('leave/requests/:id')
  @RequirePermissions(LEAVE_PERMISSIONS.REQUEST_READ_SELF)
  @ApiOperation({ summary: 'Get current employee leave request' })
  getLeaveRequest(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserContext) {
    return this.leave.getRequest(this.context.assertTenant(user), user.userId, id);
  }

  @Post('leave/requests')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(LEAVE_PERMISSIONS.REQUEST_CREATE)
  @ApiOperation({ summary: 'Create current employee leave request' })
  createLeaveRequest(@Body() dto: CreateLeaveRequestDto, @CurrentUser() user: CurrentUserContext) {
    return this.leave.createRequest(this.context.assertTenant(user), user.userId, dto);
  }

  @Post('leave/requests/:id/submit')
  @RequirePermissions(LEAVE_PERMISSIONS.REQUEST_CREATE)
  @ApiOperation({ summary: 'Submit current employee leave request' })
  submitLeaveRequest(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserContext) {
    return this.leave.submitRequest(this.context.assertTenant(user), user.userId, id);
  }

  @Post('leave/requests/:id/cancel')
  @RequirePermissions(LEAVE_PERMISSIONS.REQUEST_CANCEL)
  @ApiOperation({ summary: 'Cancel current employee leave request' })
  cancelLeaveRequest(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserContext) {
    return this.leave.cancelRequest(this.context.assertTenant(user), user.userId, id);
  }

  @Get('payslips')
  @RequirePermissions(PAYSLIP_PERMISSIONS.READ_SELF)
  @ApiOperation({ summary: 'List current employee published payslips' })
  listPayslips(@Query() query: ListEssAttendanceQueryDto, @CurrentUser() user: CurrentUserContext) {
    return this.payslips.listPayslips(
      this.context.assertTenant(user),
      user.userId,
      query.page,
      query.pageSize,
    );
  }

  @Get('payslips/:id')
  @RequirePermissions(PAYSLIP_PERMISSIONS.READ_SELF)
  @ApiOperation({ summary: 'Get current employee published payslip' })
  getPayslip(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserContext) {
    return this.payslips.getPayslip(this.context.assertTenant(user), user.userId, id);
  }

  @Get('requests')
  @RequirePermissions(EMPLOYEE_PERMISSIONS.EMPLOYEE_READ_SELF)
  @ApiOperation({ summary: 'List current employee ESS requests' })
  listRequests(@Query() query: ListEssRequestsQueryDto, @CurrentUser() user: CurrentUserContext) {
    return this.requests.listRequests(this.context.assertTenant(user), user.userId, query);
  }

  @Get('requests/:id')
  @RequirePermissions(EMPLOYEE_PERMISSIONS.EMPLOYEE_READ_SELF)
  @ApiOperation({ summary: 'Get current employee change request' })
  getRequest(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserContext) {
    return this.requests.getRequest(this.context.assertTenant(user), user.userId, id);
  }

  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(ESS_PERMISSIONS.EMPLOYEE_SELF_UPDATE)
  @ApiOperation({ summary: 'Create current employee change request' })
  createRequest(@Body() dto: CreateChangeRequestDto, @CurrentUser() user: CurrentUserContext) {
    return this.requests.createChangeRequest(this.context.assertTenant(user), user.userId, dto);
  }

  @Post('requests/:id/submit')
  @RequirePermissions(ESS_PERMISSIONS.EMPLOYEE_SELF_UPDATE)
  @ApiOperation({ summary: 'Submit current employee change request' })
  submitRequest(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserContext) {
    return this.requests.submitChangeRequest(this.context.assertTenant(user), user.userId, id);
  }

  @Post('requests/:id/cancel')
  @RequirePermissions(ESS_PERMISSIONS.EMPLOYEE_SELF_UPDATE)
  @ApiOperation({ summary: 'Cancel current employee change request' })
  cancelRequest(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserContext) {
    return this.requests.cancelChangeRequest(this.context.assertTenant(user), user.userId, id);
  }

  @Get('notifications')
  @RequirePermissions(ESS_PERMISSIONS.NOTIFICATION_READ_SELF)
  @ApiOperation({ summary: 'List current user notifications' })
  listNotifications(
    @Query() query: ListEssNotificationsQueryDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.notifications.list(this.context.assertTenant(user), user.userId, query);
  }

  @Get('notifications/unread-count')
  @RequirePermissions(ESS_PERMISSIONS.NOTIFICATION_READ_SELF)
  @ApiOperation({ summary: 'Get current user unread notification count' })
  unreadNotifications(@CurrentUser() user: CurrentUserContext) {
    return this.notifications.unreadCount(this.context.assertTenant(user), user.userId);
  }

  @Post('notifications/:id/read')
  @RequirePermissions(ESS_PERMISSIONS.NOTIFICATION_UPDATE_SELF)
  @ApiOperation({ summary: 'Mark current user notification read' })
  markNotificationRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.notifications.markRead(this.context.assertTenant(user), user.userId, id);
  }

  @Post('notifications/read-all')
  @RequirePermissions(ESS_PERMISSIONS.NOTIFICATION_UPDATE_SELF)
  @ApiOperation({ summary: 'Mark all current user notifications read' })
  markAllNotificationsRead(@CurrentUser() user: CurrentUserContext) {
    return this.notifications.markAllRead(this.context.assertTenant(user), user.userId);
  }

  @Get('policies')
  @RequirePermissions(ESS_PERMISSIONS.DOCUMENT_READ_SELF)
  @ApiOperation({ summary: 'List current employee pending policies' })
  listPolicies(@CurrentUser() user: CurrentUserContext) {
    return this.documents.listPoliciesPending(this.context.assertTenant(user), user.userId);
  }

  @Post('policies/acknowledge')
  @RequirePermissions(ESS_PERMISSIONS.POLICY_ACKNOWLEDGE)
  @ApiOperation({ summary: 'Acknowledge a policy for the current employee' })
  acknowledgePolicy(
    @Body() dto: AcknowledgePolicyDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.documents.acknowledgePolicy(this.context.assertTenant(user), user.userId, dto);
  }
}
