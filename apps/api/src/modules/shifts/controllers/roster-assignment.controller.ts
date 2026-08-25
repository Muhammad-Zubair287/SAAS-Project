import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
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
import {
  CreateRosterAssignmentDto,
  RosterAssignmentResponseDto,
  RosterBulkResultDto,
  UpdateRosterAssignmentDto,
} from '../dto/roster.dto';

@ApiTags('roster-assignments')
@ApiBearerAuth()
@Controller('roster-assignments')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RosterAssignmentController {
  constructor(private readonly roster: RosterService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RequireIdempotencyKeyGuard)
  @RequirePermissions(ROSTER_PERMISSIONS.ASSIGN)
  @ApiOperation({
    summary:
      'Create DRAFT roster rows (employees or department snapshot, optional recurrence). Always DRAFT — publish separately.',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiResponse({ status: 201, type: RosterBulkResultDto })
  @ApiResponse({ status: 409, description: 'ROSTER_CONFLICT' })
  create(
    @Body() dto: CreateRosterAssignmentDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.roster.createDrafts(
      this.tenant(user),
      dto,
      user.userId,
      user.email,
      correlationId,
      user.userId,
      user.platformRole,
    );
  }

  @Get(':assignmentId')
  @RequirePermissions(ROSTER_PERMISSIONS.READ)
  @ApiOperation({ summary: 'Get a single roster assignment by id' })
  @ApiParam({ name: 'assignmentId', format: 'uuid' })
  @ApiResponse({ status: 200, type: RosterAssignmentResponseDto })
  getById(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.roster.getById(this.tenant(user), assignmentId);
  }

  @Patch(':assignmentId')
  @RequirePermissions(ROSTER_PERMISSIONS.ASSIGN)
  @ApiOperation({ summary: 'Patch a DRAFT tip roster row; If-Match required' })
  @ApiParam({ name: 'assignmentId', format: 'uuid' })
  @ApiHeader({ name: 'If-Match', required: true })
  @ApiResponse({ status: 200, type: RosterAssignmentResponseDto })
  @ApiResponse({ status: 412, description: 'VERSION_CONFLICT' })
  patch(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: UpdateRosterAssignmentDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
    @Headers('if-match') ifMatch?: string,
  ) {
    return this.roster.patchDraft(
      this.tenant(user),
      assignmentId,
      dto,
      ifMatch,
      user.userId,
      user.email,
      correlationId,
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
