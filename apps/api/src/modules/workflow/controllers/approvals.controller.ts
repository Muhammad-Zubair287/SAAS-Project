import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import {
  ESS_PERMISSIONS,
  LEAVE_PERMISSIONS,
  WORKFLOW_PERMISSIONS,
} from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { ApprovalsInboxService } from '../services/approvals-inbox.service';

@ApiTags('approvals')
@ApiBearerAuth()
@Controller('approvals')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ApprovalsController {
  constructor(private readonly inbox: ApprovalsInboxService) {}

  @Get('inbox')
  @RequirePermissions(
    [LEAVE_PERMISSIONS.REQUEST_APPROVE, ESS_PERMISSIONS.EMPLOYEE_CHANGE_APPROVE, WORKFLOW_PERMISSIONS.INBOX_READ],
    'ANY',
  )
  @ApiOperation({ summary: 'Combined approval inbox (leave + change requests)' })
  getInbox(@CurrentUser() user: CurrentUserContext) {
    return this.inbox.getInbox(this.tenant(user));
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
