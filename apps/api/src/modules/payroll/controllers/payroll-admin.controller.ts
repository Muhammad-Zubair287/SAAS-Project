import { Controller, Get, Query, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import {
  PAYROLL_PERMISSIONS,
  PAYSLIP_PERMISSIONS,
} from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { ListPayrollPayslipsQueryDto } from '../dto/list-payslips.dto';
import { PayrollAdminService } from '../services/payroll-admin.service';

@ApiTags('payroll')
@ApiBearerAuth()
@Controller('payroll')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PayrollAdminController {
  constructor(private readonly payroll: PayrollAdminService) {}

  @Get('summary')
  @RequirePermissions([PAYROLL_PERMISSIONS.READ, PAYSLIP_PERMISSIONS.PUBLISH], 'ANY')
  @ApiOperation({ summary: 'Payroll admin KPI summary' })
  summary(@CurrentUser() user: CurrentUserContext) {
    return this.payroll.summary(this.tenant(user));
  }

  @Get('payslips')
  @RequirePermissions([PAYROLL_PERMISSIONS.READ, PAYSLIP_PERMISSIONS.PUBLISH], 'ANY')
  @ApiOperation({ summary: 'List tenant payslips (admin)' })
  listPayslips(
    @Query() query: ListPayrollPayslipsQueryDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.payroll.listPayslips(this.tenant(user), query);
  }

  private tenant(user: CurrentUserContext): string {
    if (!user.tenantId) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        message: 'This endpoint requires a tenant-scoped JWT.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    return user.tenantId;
  }
}
