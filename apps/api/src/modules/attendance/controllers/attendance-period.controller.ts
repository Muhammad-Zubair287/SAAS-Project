import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import { ATTENDANCE_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { AttendancePeriodService } from '../services/attendance-period.service';

class PeriodLockDto {
  @ApiProperty()
  @IsDateString()
  periodStart!: string;

  @ApiProperty()
  @IsDateString()
  periodEnd!: string;
}

class PeriodUnlockDto extends PeriodLockDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  reason!: string;
}

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AttendancePeriodController {
  constructor(private readonly service: AttendancePeriodService) {}

  @Get('periods')
  @RequirePermissions(ATTENDANCE_PERMISSIONS.RECORD_READ)
  @ApiOperation({ summary: 'List attendance periods' })
  list(@CurrentUser() user: CurrentUserContext) {
    this.assertTenant(user);
    return this.service.list(user.tenantId!);
  }

  @Post('period-lock')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(ATTENDANCE_PERMISSIONS.PERIOD_LOCK)
  @ApiOperation({ summary: 'Lock attendance period (SCR-ATT-12)' })
  lock(
    @Body() dto: PeriodLockDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    this.assertTenant(user);
    return this.service.lock(
      dto,
      user.userId,
      user.email,
      user.tenantId!,
      correlationId,
    );
  }

  @Post('period-unlock')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(ATTENDANCE_PERMISSIONS.PERIOD_UNLOCK)
  @ApiOperation({ summary: 'Unlock attendance period' })
  unlock(
    @Body() dto: PeriodUnlockDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    this.assertTenant(user);
    return this.service.unlock(
      dto,
      user.userId,
      user.email,
      user.tenantId!,
      correlationId,
    );
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
