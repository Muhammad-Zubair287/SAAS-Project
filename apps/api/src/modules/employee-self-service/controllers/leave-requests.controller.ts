import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import { LEAVE_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { GrantLeaveBalanceDto } from '../dto/ess-leave.dto';
import { EssContextService } from '../services/ess-context.service';
import { EssLeaveService } from '../services/ess-leave.service';

@ApiTags('leave-requests')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class LeaveRequestsController {
  constructor(
    private readonly context: EssContextService,
    private readonly leave: EssLeaveService,
  ) {}

  @Post('leave/balances/grants')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(LEAVE_PERMISSIONS.BALANCE_ADJUST)
  @ApiOperation({ summary: 'Grant leave balance to an employee (HR)' })
  grantBalance(@Body() dto: GrantLeaveBalanceDto, @CurrentUser() user: CurrentUserContext) {
    return this.leave.grantBalance(this.context.assertTenant(user), user.userId, {
      employeeId: dto.employeeId,
      leaveTypeId: dto.leaveTypeId,
      quantity: dto.quantity,
      effectiveDate: dto.effectiveDate,
      reason: dto.reason,
    });
  }

  @Post('leave-requests/:id/approve')
  @RequirePermissions(LEAVE_PERMISSIONS.REQUEST_APPROVE)
  @ApiOperation({ summary: 'Approve employee leave request' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserContext) {
    return this.leave.decideRequest(this.context.assertTenant(user), user.userId, id, 'APPROVED');
  }

  @Post('leave-requests/:id/reject')
  @RequirePermissions(LEAVE_PERMISSIONS.REQUEST_APPROVE)
  @ApiOperation({ summary: 'Reject employee leave request' })
  reject(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserContext) {
    return this.leave.decideRequest(this.context.assertTenant(user), user.userId, id, 'REJECTED');
  }
}
