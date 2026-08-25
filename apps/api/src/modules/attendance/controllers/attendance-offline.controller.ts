import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import { ATTENDANCE_CAPTURE_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { CurrentDevice, DeviceAuth } from '../decorators';
import { DeviceAuthGuard } from '../guards/device-auth.guard';
import type { CurrentDeviceContext } from '../interfaces/current-device-context.interface';
import { OfflineQueueService } from '../services/offline-queue.service';
import {
  CreateOfflineSessionDto,
  DeviceReasonDto,
  ListOfflineSessionsDto,
  OfflineBatchDto,
  OfflineBatchReceiptDto,
  OfflinePendingEventResponseDto,
  OfflineSessionResponseDto,
} from '../dto';

@ApiTags('attendance-offline-capture')
@Controller('attendance/offline-sessions')
export class AttendanceOfflineController {
  constructor(private readonly offline: OfflineQueueService) {}

  @Post() @HttpCode(HttpStatus.CREATED) @UseGuards(DeviceAuthGuard)
  @ApiSecurity('deviceToken') @ApiOperation({ summary: 'Create an offline capture session' }) @ApiHeader({ name: 'X-WCOS-Device-Token', required: true }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiResponse({ status: 201, type: OfflineSessionResponseDto }) @DeviceAuth()
  create(@Body() dto: CreateOfflineSessionDto, @CurrentDevice() device: CurrentDeviceContext, @CorrelationId() correlationId: string) {
    return this.offline.createOfflineSession(device.tenantId, { ...dto, deviceId: device.deviceId }, correlationId);
  }

  @Post(':sessionId/events:batch') @HttpCode(HttpStatus.ACCEPTED) @UseGuards(DeviceAuthGuard)
  @ApiSecurity('deviceToken') @ApiOperation({ summary: 'Upload ordered offline capture events' }) @ApiHeader({ name: 'X-WCOS-Device-Token', required: true }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiResponse({ status: 202, type: OfflineBatchReceiptDto }) @DeviceAuth()
  async enqueue(@Param('sessionId', ParseUUIDPipe) sessionId: string, @Body() dto: OfflineBatchDto, @CurrentDevice() device: CurrentDeviceContext, @CorrelationId() correlationId: string): Promise<OfflineBatchReceiptDto> {
    let acceptedCount = 0;
    let deduplicatedCount = 0;
    for (const event of dto.events) {
      const queued = await this.offline.enqueueEvent(sessionId, device.tenantId, { ...event, sequenceNumber: BigInt(event.sequenceNumber) }, correlationId);
      if (queued.status === 'pending') acceptedCount++; else deduplicatedCount++;
    }
    return { sessionId, acceptedCount, deduplicatedCount, pendingCount: acceptedCount + deduplicatedCount };
  }

  @Post(':sessionId/replay') @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBearerAuth() @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.OFFLINE_MANAGE) @ApiOperation({ summary: 'Replay an offline capture queue' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiResponse({ status: 200 })
  replay(@Param('sessionId', ParseUUIDPipe) sessionId: string, @CurrentUser() user: CurrentUserContext, @CorrelationId() correlationId: string) { return this.offline.replayQueue(sessionId, this.tenant(user), user.userId, user.email, correlationId); }

  @Post(':sessionId/close') @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBearerAuth() @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.OFFLINE_MANAGE) @ApiOperation({ summary: 'Close an offline capture session' }) @ApiResponse({ status: 200, type: OfflineSessionResponseDto })
  close(@Param('sessionId', ParseUUIDPipe) sessionId: string, @Body() dto: DeviceReasonDto, @CurrentUser() user: CurrentUserContext, @CorrelationId() correlationId: string) { return this.offline.closeSession(sessionId, this.tenant(user), dto.reason, user.userId, user.email, correlationId); }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.OFFLINE_READ)
  @ApiOperation({ summary: 'List offline capture sessions' })
  @ApiResponse({ status: 200, type: [OfflineSessionResponseDto] })
  list(
    @Query() query: ListOfflineSessionsDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.offline.listSessions(query, this.tenant(user));
  }

  @Get(':sessionId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.OFFLINE_READ)
  @ApiOperation({ summary: 'Get offline capture session' })
  @ApiResponse({ status: 200, type: OfflineSessionResponseDto })
  session(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.offline.getSession(sessionId, this.tenant(user));
  }

  @Get(':sessionId/pending-events')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.OFFLINE_READ)
  @ApiOperation({ summary: 'List pending offline capture events' })
  @ApiResponse({ status: 200, type: [OfflinePendingEventResponseDto] })
  pending(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.offline.getPendingEvents(sessionId, this.tenant(user));
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
