import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import { ROSTER_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { RequireIdempotencyKeyGuard } from '../../../common/guards/require-idempotency-key.guard';
import { RosterService } from '../services/roster.service';
import { ListRosterDto, PublishRosterDto, RosterPublishResultDto } from '../dto/roster.dto';

@ApiTags('rosters')
@ApiBearerAuth()
@Controller('rosters')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RosterController {
  constructor(private readonly roster: RosterService) {}

  @Get()
  @RequirePermissions(ROSTER_PERMISSIONS.READ)
  @ApiOperation({
    summary:
      'List roster entries — defaults to draft tips + effective-published; use includeHistory for full history',
  })
  list(
    @Query() query: ListRosterDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.roster.list(this.tenant(user), query);
  }

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RequireIdempotencyKeyGuard)
  @RequirePermissions(ROSTER_PERMISSIONS.PUBLISH)
  @ApiOperation({
    summary:
      'Publish matching DRAFT tip rows in scope (all-or-nothing). Does not auto-recalculate attendance.',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiResponse({ status: 200, type: RosterPublishResultDto })
  @ApiResponse({ status: 422, description: 'ROSTER_NOT_PUBLISHABLE' })
  publish(
    @Body() dto: PublishRosterDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.roster.publishDrafts(
      this.tenant(user),
      dto,
      user.userId,
      user.email,
      correlationId,
      user.userId,
      user.platformRole,
    );
  }

  private tenant(user: CurrentUserContext): string {
    if (!user.tenantId) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'This endpoint requires a tenant-scoped JWT.',
      });
    }
    return user.tenantId;
  }
}
