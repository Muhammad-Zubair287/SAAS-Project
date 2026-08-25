import {
  Body,
  Controller,
  Delete,
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
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import { ATTENDANCE_CAPTURE_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { GeofenceService } from '../services/geofence.service';
import {
  CreateGeofenceDto,
  GeofenceCheckDto,
  GeofenceResponseDto,
  ListGeofencesQueryDto,
  UpdateGeofenceDto,
} from '../dto';

@ApiTags('attendance-geofences')
@ApiBearerAuth()
@Controller('attendance/geofences')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AttendanceGeofenceController {
  constructor(private readonly geofences: GeofenceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.GEOFENCE_MANAGE)
  @ApiOperation({ summary: 'Create a circular attendance geofence' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiResponse({ status: 201, type: GeofenceResponseDto })
  create(
    @Body() dto: CreateGeofenceDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.geofences.createGeofence(
      this.tenant(user),
      {
        ...dto,
        activeFrom: dto.activeFrom ? new Date(dto.activeFrom) : undefined,
        activeTo: dto.activeTo ? new Date(dto.activeTo) : undefined,
      },
      user.userId,
      user.email,
      correlationId,
    );
  }

  @Get()
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.GEOFENCE_READ)
  @ApiOperation({ summary: 'List attendance geofences' })
  @ApiResponse({ status: 200, type: [GeofenceResponseDto] })
  list(@Query() query: ListGeofencesQueryDto, @CurrentUser() user: CurrentUserContext) {
    return this.geofences.listGeofences(this.tenant(user), query.legalEntityId, query.branchId);
  }

  @Get(':geofenceId')
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.GEOFENCE_READ)
  @ApiOperation({ summary: 'Get an attendance geofence' })
  @ApiParam({ name: 'geofenceId', format: 'uuid' })
  @ApiResponse({ status: 200, type: GeofenceResponseDto })
  get(
    @Param('geofenceId', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.geofences.getGeofence(id, this.tenant(user));
  }

  @Patch(':geofenceId')
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.GEOFENCE_MANAGE)
  @ApiOperation({ summary: 'Update a circular attendance geofence' })
  @ApiHeader({ name: 'If-Match', required: true, description: 'rowVersion from GET (strong ETag or bare version string)' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiResponse({ status: 200, type: GeofenceResponseDto })
  @ApiResponse({ status: 412, description: 'VERSION_CONFLICT — stale If-Match' })
  update(
    @Param('geofenceId', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGeofenceDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
    @Headers('if-match') ifMatch?: string,
  ) {
    return this.geofences.updateGeofence(
      id,
      this.tenant(user),
      {
        ...dto,
        activeFrom: dto.activeFrom ? new Date(dto.activeFrom) : undefined,
        activeTo: dto.activeTo ? new Date(dto.activeTo) : undefined,
      },
      user.userId,
      user.email,
      correlationId,
      ifMatch,
    );
  }

  @Delete(':geofenceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.GEOFENCE_MANAGE)
  @ApiOperation({ summary: 'Delete an attendance geofence' })
  @ApiHeader({ name: 'If-Match', required: true, description: 'rowVersion from GET (strong ETag or bare version string)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 412, description: 'VERSION_CONFLICT — stale If-Match' })
  async delete(
    @Param('geofenceId', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
    @Headers('if-match') ifMatch?: string,
  ): Promise<void> {
    await this.geofences.deleteGeofence(
      id,
      this.tenant(user),
      user.userId,
      user.email,
      correlationId,
      ifMatch,
    );
  }

  @Post(':geofenceId/check')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.GEOFENCE_READ)
  @ApiOperation({ summary: 'Check a coordinate against a geofence' })
  @ApiResponse({ status: 200 })
  check(
    @Param('geofenceId', ParseUUIDPipe) id: string,
    @Body() dto: GeofenceCheckDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.geofences.checkPointWithin(
      id,
      this.tenant(user),
      dto.latitude,
      dto.longitude,
      dto.at ? new Date(dto.at) : undefined,
    );
  }

  private tenant(user: CurrentUserContext): string {
    if (user.tenantId) return user.tenantId;
    throw new AppException({
      code: ERROR_CODES.BAD_REQUEST,
      message: 'This endpoint requires a tenant-scoped JWT.',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
