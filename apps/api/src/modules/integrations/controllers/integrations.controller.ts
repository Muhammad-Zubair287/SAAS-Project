import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import { TENANT_INTEGRATION_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { IntegrationsCatalogueService } from '../services/integrations-catalogue.service';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('integrations')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsCatalogueService) {}

  @Get()
  @RequirePermissions(
    [TENANT_INTEGRATION_PERMISSIONS.READ, TENANT_INTEGRATION_PERMISSIONS.MANAGE],
    'ANY',
  )
  @ApiOperation({ summary: 'List tenant integration catalogue + config status' })
  list(@CurrentUser() user: CurrentUserContext) {
    return this.integrations.list(this.tenant(user));
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
