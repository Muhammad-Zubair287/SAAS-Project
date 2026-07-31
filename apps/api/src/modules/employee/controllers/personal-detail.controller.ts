import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import { EMPLOYEE_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { PersonalDetailService } from '../services/personal-detail.service';
import { UpsertPersonalDetailDto } from '../dto/upsert-personal-detail.dto';

@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees/:employeeId/personal-details')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PersonalDetailController {
  constructor(private readonly service: PersonalDetailService) {}

  @Put()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(EMPLOYEE_PERMISSIONS.PERSONAL_DETAIL_UPDATE)
  @ApiOperation({ summary: 'Upsert employee personal details' })
  upsert(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: UpsertPersonalDetailDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    this.assertTenant(user);
    return this.service.upsert(
      employeeId,
      dto,
      user.userId,
      user.email,
      user.tenantId!,
      correlationId,
    );
  }

  @Get()
  @RequirePermissions(EMPLOYEE_PERMISSIONS.PERSONAL_DETAIL_READ)
  @ApiOperation({ summary: 'Get employee personal details' })
  findByEmployeeId(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findByEmployeeId(employeeId, user.tenantId!);
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
