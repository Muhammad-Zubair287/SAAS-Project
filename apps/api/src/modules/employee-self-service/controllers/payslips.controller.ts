import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import { PAYSLIP_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { PublishPayslipDto } from '../dto/publish-payslip.dto';
import { EssContextService } from '../services/ess-context.service';
import { EssPayslipService } from '../services/ess-payslip.service';

@ApiTags('payslips')
@ApiBearerAuth()
@Controller('payslips')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PayslipsController {
  constructor(
    private readonly context: EssContextService,
    private readonly payslips: EssPayslipService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PAYSLIP_PERMISSIONS.PUBLISH)
  @ApiOperation({ summary: 'Publish an ESS-visible payslip for an employee' })
  publish(@Body() dto: PublishPayslipDto, @CurrentUser() user: CurrentUserContext) {
    return this.payslips.publishPayslip(this.context.assertTenant(user), dto);
  }
}
