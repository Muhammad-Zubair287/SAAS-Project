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
  Query,
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
import { ShiftAssignmentService } from '../services/shift-assignment.service';
import {
  CreateShiftAssignmentDto,
  ListShiftAssignmentsDto,
  ShiftAssignmentBulkResultDto,
  ShiftAssignmentResponseDto,
  UpdateShiftAssignmentDto,
} from '../dto/shift-assignment.dto';

@ApiTags('shift-assignments')
@ApiBearerAuth()
@Controller('shift-assignments')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ShiftAssignmentController {
  constructor(private readonly assignments: ShiftAssignmentService) {}

  @Get()
  @RequirePermissions(ROSTER_PERMISSIONS.READ)
  @ApiOperation({ summary: 'List default shift assignments' })
  list(
    @Query() query: ListShiftAssignmentsDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.assignments.list(this.tenant(user), query);
  }

  @Get(':assignmentId')
  @RequirePermissions(ROSTER_PERMISSIONS.READ)
  @ApiOperation({ summary: 'Get a shift assignment by id' })
  @ApiParam({ name: 'assignmentId', format: 'uuid' })
  @ApiResponse({ status: 200, type: ShiftAssignmentResponseDto })
  get(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.assignments.getById(this.tenant(user), assignmentId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(ROSTER_PERMISSIONS.ASSIGN)
  @ApiOperation({
    summary:
      'Assign default shift to employees or current department members (snapshot)',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiResponse({ status: 201, type: ShiftAssignmentBulkResultDto })
  @ApiResponse({ status: 409, description: 'SHIFT_ASSIGNMENT_OVERLAP' })
  create(
    @Body() dto: CreateShiftAssignmentDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.assignments.assign(
      this.tenant(user),
      dto,
      user.userId,
      user.email,
      correlationId,
      user.userId,
      user.platformRole,
    );
  }

  @Patch(':assignmentId')
  @RequirePermissions(ROSTER_PERMISSIONS.ASSIGN)
  @ApiOperation({ summary: 'Update or end a default shift assignment' })
  @ApiParam({ name: 'assignmentId', format: 'uuid' })
  @ApiHeader({
    name: 'If-Match',
    required: true,
    description: 'rowVersion from GET',
  })
  @ApiResponse({ status: 200, type: ShiftAssignmentResponseDto })
  @ApiResponse({ status: 412, description: 'VERSION_CONFLICT' })
  update(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: UpdateShiftAssignmentDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
    @Headers('if-match') ifMatch?: string,
  ) {
    return this.assignments.update(
      this.tenant(user),
      assignmentId,
      dto,
      ifMatch,
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
