import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import { EMPLOYEE_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { HrDashboardService } from '../services/hr-dashboard.service';

@ApiTags('hr-dashboard')
@ApiBearerAuth()
@Controller('hr')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class HrDashboardController {
  constructor(private readonly service: HrDashboardService) {}

  @Get('dashboard')
  @RequirePermissions(EMPLOYEE_PERMISSIONS.HR_DASHBOARD_READ)
  @ApiOperation({ summary: 'HR Dashboard KPIs' })
  getDashboard(@CurrentUser() user: CurrentUserContext) {
    if (!user.tenantId) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        message: 'This endpoint requires a tenant-scoped JWT.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    return this.service.getDashboard(user.tenantId);
  }
}
