import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { ESS_PERMISSIONS } from '../../../common/constants/permissions.constants';
import {
  CreateChangeRequestDto,
  DecideChangeRequestDto,
} from '../dto/create-change-request.dto';
import { ListChangeRequestsQueryDto } from '../dto/list-ess-query.dto';
import { EssContextService } from '../services/ess-context.service';
import { EssRequestsService } from '../services/ess-requests.service';

@ApiTags('employee-change-requests')
@ApiBearerAuth()
@Controller('employee-change-requests')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class EssChangeRequestController {
  constructor(
    private readonly context: EssContextService,
    private readonly requests: EssRequestsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(ESS_PERMISSIONS.EMPLOYEE_SELF_UPDATE)
  @ApiOperation({ summary: 'Create employee self-service change request' })
  create(@Body() dto: CreateChangeRequestDto, @CurrentUser() user: CurrentUserContext) {
    return this.requests.createChangeRequest(this.context.assertTenant(user), user.userId, dto);
  }

  @Get()
  @RequirePermissions(ESS_PERMISSIONS.EMPLOYEE_CHANGE_APPROVE)
  @ApiOperation({ summary: 'List employee change requests for approvers' })
  listForApprovers(
    @Query() query: ListChangeRequestsQueryDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.requests.listForApprovers(this.context.assertTenant(user), query);
  }

  @Post(':id/submit')
  @RequirePermissions(ESS_PERMISSIONS.EMPLOYEE_SELF_UPDATE)
  @ApiOperation({ summary: 'Submit employee self-service change request' })
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserContext) {
    return this.requests.submitChangeRequest(this.context.assertTenant(user), user.userId, id);
  }

  @Post(':id/approve')
  @RequirePermissions(ESS_PERMISSIONS.EMPLOYEE_CHANGE_APPROVE)
  @ApiOperation({ summary: 'Approve employee change request' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideChangeRequestDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.requests.decideChangeRequest(
      this.context.assertTenant(user),
      user.userId,
      id,
      'APPROVED',
      dto.decisionNote,
    );
  }

  @Post(':id/reject')
  @RequirePermissions(ESS_PERMISSIONS.EMPLOYEE_CHANGE_APPROVE)
  @ApiOperation({ summary: 'Reject employee change request' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideChangeRequestDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.requests.decideChangeRequest(
      this.context.assertTenant(user),
      user.userId,
      id,
      'REJECTED',
      dto.decisionNote,
    );
  }
}
