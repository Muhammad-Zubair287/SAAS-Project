import { Body, Controller, Headers, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
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
import { DeviceEventIngestService } from '../services/device-event-ingest.service';
import { DeviceEventResponseDto, IngestDeviceEventDto } from '../dto';

@ApiTags('attendance-device-events')
@Controller('attendance/device-events')
export class AttendanceDeviceEventController {
  constructor(private readonly events: DeviceEventIngestService) {}

  @Post() @HttpCode(HttpStatus.CREATED) @UseGuards(DeviceAuthGuard)
  @Throttle({ 'attendance-connector': { limit: 300, ttl: 60000 } })
  @ApiSecurity('deviceToken') @ApiOperation({ summary: 'Ingest a device attendance event' }) @ApiHeader({ name: 'X-WCOS-Device-Token', required: true }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiResponse({ status: 201, type: DeviceEventResponseDto }) @DeviceAuth()
  async ingest(@Body() dto: IngestDeviceEventDto, @Headers('idempotency-key') idempotencyKey: string, @CurrentDevice() device: CurrentDeviceContext, @CorrelationId() correlationId: string): Promise<DeviceEventResponseDto> {
    const result = await this.events.ingestEvent(device.tenantId, {
      source: dto.source as any, sourceEventId: dto.sourceEventId, idempotencyKey, occurredAt: new Date(dto.occurredAt), employeeId: dto.employeeId,
      deviceId: dto.deviceId, mobileDeviceId: dto.mobileDeviceId, eventType: dto.eventType,
      geoLat: dto.location?.latitude, geoLng: dto.location?.longitude, geoAccuracyM: dto.location?.accuracyMeters,
      payload: dto.payload, checksum: '',
    }, device.token, correlationId);
    return { ...result, replayed: false };
  }

  @Post(':deviceEventId/revalidate') @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBearerAuth() @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_EVENT_REVALIDATE) @ApiOperation({ summary: 'Revalidate a captured attendance event' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiResponse({ status: 200 })
  revalidate(@Param('deviceEventId', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserContext, @CorrelationId() correlationId: string) {
    return this.events.revalidateEvent(id, this.tenant(user), user.userId, user.email, correlationId);
  }
  private tenant(user: CurrentUserContext): string { if (user.tenantId) return user.tenantId; throw new AppException({ code: ERROR_CODES.BAD_REQUEST, message: 'This endpoint requires a tenant-scoped JWT.', statusCode: HttpStatus.BAD_REQUEST }); }
}
