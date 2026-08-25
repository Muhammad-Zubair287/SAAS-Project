import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { LEAVE_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { EssContextService } from '../../employee-self-service/services/ess-context.service';
import { AdjustLeaveBalanceDto } from '../dto/adjust-leave-balance.dto';
import { CreateLeaveTypeDto } from '../dto/create-leave-type.dto';
import { ListLeaveAdminRequestsDto, ListLeaveTypesAdminDto } from '../dto/list-leave-admin.dto';
import { UpdateLeaveTypeDto } from '../dto/update-leave-type.dto';
import { LeaveAdminService } from '../services/leave-admin.service';

@ApiTags('leave-admin')
@ApiBearerAuth()
@Controller('leave')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class LeaveAdminController {
  constructor(
    private readonly context: EssContextService,
    private readonly leaveAdmin: LeaveAdminService,
  ) {}

  @Get('summary')
  @RequirePermissions(LEAVE_PERMISSIONS.REQUEST_READ)
  @ApiOperation({ summary: 'Leave admin KPI summary' })
  summary(@CurrentUser() user: CurrentUserContext) {
    return this.leaveAdmin.summary(this.context.assertTenant(user));
  }

  @Get('requests')
  @RequirePermissions(LEAVE_PERMISSIONS.REQUEST_READ)
  @ApiOperation({ summary: 'List tenant leave requests (HR admin)' })
  listRequests(@Query() query: ListLeaveAdminRequestsDto, @CurrentUser() user: CurrentUserContext) {
    return this.leaveAdmin.listRequests(this.context.assertTenant(user), query);
  }

  @Get('requests/:id')
  @RequirePermissions(LEAVE_PERMISSIONS.REQUEST_READ)
  @ApiOperation({ summary: 'Get a leave request by id (HR admin)' })
  getRequest(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserContext) {
    return this.leaveAdmin.getRequest(this.context.assertTenant(user), id);
  }

  @Get('types')
  @RequirePermissions(LEAVE_PERMISSIONS.TYPE_READ)
  @ApiOperation({ summary: 'List leave types (optionally including inactive)' })
  listTypes(@Query() query: ListLeaveTypesAdminDto, @CurrentUser() user: CurrentUserContext) {
    return this.leaveAdmin.listTypes(
      this.context.assertTenant(user),
      query.includeInactive === true,
    );
  }

  @Post('types')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(LEAVE_PERMISSIONS.TYPE_MANAGE)
  @ApiOperation({ summary: 'Create a leave type' })
  createType(@Body() dto: CreateLeaveTypeDto, @CurrentUser() user: CurrentUserContext) {
    return this.leaveAdmin.createType(this.context.assertTenant(user), dto);
  }

  @Patch('types/:id')
  @RequirePermissions(LEAVE_PERMISSIONS.TYPE_MANAGE)
  @ApiOperation({ summary: 'Update a leave type' })
  updateType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaveTypeDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.leaveAdmin.updateType(this.context.assertTenant(user), id, dto);
  }

  @Post('balances/adjustments')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(LEAVE_PERMISSIONS.BALANCE_ADJUST)
  @ApiOperation({
    summary: 'Adjust leave balance (positive GRANT, negative ADJUSTMENT)',
  })
  adjustBalance(@Body() dto: AdjustLeaveBalanceDto, @CurrentUser() user: CurrentUserContext) {
    return this.leaveAdmin.adjustBalance(this.context.assertTenant(user), user.userId, dto);
  }
}
