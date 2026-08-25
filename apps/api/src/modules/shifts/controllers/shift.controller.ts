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
import { SHIFT_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { ShiftService } from '../services/shift.service';
import {
  CreateShiftDto,
  ListShiftsDto,
  ShiftResponseDto,
  UpdateShiftDto,
} from '../dto';

@ApiTags('shifts')
@ApiBearerAuth()
@Controller('shifts')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ShiftController {
  constructor(private readonly shifts: ShiftService) {}

  @Get()
  @RequirePermissions(SHIFT_PERMISSIONS.READ)
  @ApiOperation({ summary: 'List shifts' })
  @ApiResponse({ status: 200, type: [ShiftResponseDto] })
  list(@Query() query: ListShiftsDto, @CurrentUser() user: CurrentUserContext) {
    return this.shifts.list(this.tenant(user), query);
  }

  @Get(':shiftId')
  @RequirePermissions(SHIFT_PERMISSIONS.READ)
  @ApiOperation({ summary: 'Get a shift by id' })
  @ApiParam({ name: 'shiftId', format: 'uuid' })
  @ApiResponse({ status: 200, type: ShiftResponseDto })
  @ApiResponse({ status: 404, description: 'SHIFT_NOT_FOUND' })
  get(
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.shifts.getById(this.tenant(user), shiftId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SHIFT_PERMISSIONS.CREATE)
  @ApiOperation({ summary: 'Create shift version 1' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiResponse({ status: 201, type: ShiftResponseDto })
  create(
    @Body() dto: CreateShiftDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.shifts.create(
      this.tenant(user),
      dto,
      user.userId,
      user.email,
      correlationId,
    );
  }

  @Patch(':shiftId')
  @RequirePermissions(SHIFT_PERMISSIONS.UPDATE)
  @ApiOperation({
    summary:
      'Update shift metadata, deactivate, or create a new business version for material changes',
  })
  @ApiParam({ name: 'shiftId', format: 'uuid' })
  @ApiHeader({
    name: 'If-Match',
    required: true,
    description: 'rowVersion from GET (strong ETag or bare version string)',
  })
  @ApiResponse({ status: 200, type: ShiftResponseDto })
  @ApiResponse({ status: 412, description: 'VERSION_CONFLICT — stale If-Match' })
  update(
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Body() dto: UpdateShiftDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
    @Headers('if-match') ifMatch?: string,
  ) {
    return this.shifts.update(
      this.tenant(user),
      shiftId,
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
