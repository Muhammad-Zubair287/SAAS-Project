import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { ATTENDANCE_POLICY_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AttendancePolicyService } from '../services/attendance-policy.service';
import { CreateAttendancePolicyDto } from '../dto/create-attendance-policy.dto';
import { UpdateAttendancePolicyDto } from '../dto/update-attendance-policy.dto';
import { ListAttendancePoliciesDto } from '../dto/list-attendance-policies.dto';

@ApiTags('attendance-policies')
@ApiBearerAuth()
@Controller('attendance/policies')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AttendancePolicyController {
  constructor(private readonly service: AttendancePolicyService) {}

  @Get()
  @RequirePermissions(ATTENDANCE_POLICY_PERMISSIONS.READ)
  @ApiOperation({ summary: 'List attendance policies' })
  findMany(
    @Query() query: ListAttendancePoliciesDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findMany(query, user.tenantId!);
  }

  @Get(':id')
  @RequirePermissions(ATTENDANCE_POLICY_PERMISSIONS.READ)
  @ApiOperation({ summary: 'Get attendance policy by ID' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findById(id, user.tenantId!);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(ATTENDANCE_POLICY_PERMISSIONS.CREATE)
  @ApiOperation({ summary: 'Create attendance policy' })
  create(
    @Body() dto: CreateAttendancePolicyDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    this.assertTenant(user);
    return this.service.create(dto, user.userId, user.email, user.tenantId!, correlationId);
  }

  @Patch(':id')
  @RequirePermissions(ATTENDANCE_POLICY_PERMISSIONS.UPDATE)
  @ApiOperation({ summary: 'Update attendance policy (creates new version if date changes)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendancePolicyDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    this.assertTenant(user);
    return this.service.update(id, dto, user.userId, user.email, user.tenantId!, correlationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(ATTENDANCE_POLICY_PERMISSIONS.DELETE)
  @ApiOperation({ summary: 'Soft-delete (archive) an attendance policy' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ): Promise<void> {
    this.assertTenant(user);
    await this.service.delete(id, user.userId, user.email, user.tenantId!, correlationId);
  }

  private assertTenant(user: CurrentUserContext): void {
    if (!user.tenantId) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        message: 'This endpoint requires a tenant-scoped JWT.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
  }
}
