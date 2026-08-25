import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
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
import { DeviceHealthService } from '../services/device-health.service';
import { DeviceHeartbeatService } from '../services/device-heartbeat.service';
import { DeviceHeartbeatDto, HeartbeatHistoryQueryDto } from '../dto';

@ApiTags('attendance-device-heartbeats')
@Controller('attendance/devices')
export class AttendanceHeartbeatController {
  constructor(private readonly heartbeats: DeviceHeartbeatService, private readonly health: DeviceHealthService) {}

  /** Static path must be declared before parameterized :deviceId routes. */
  @Get('health') @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBearerAuth() @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_HEARTBEAT_READ) @ApiOperation({ summary: 'Get tenant device health summary' }) @ApiResponse({ status: 200 })
  summary(@CurrentUser() user: CurrentUserContext) { return this.health.summarizeTenantDevices(this.tenant(user)); }

  @Post(':deviceId/heartbeat') @HttpCode(HttpStatus.NO_CONTENT) @UseGuards(DeviceAuthGuard)
  @Throttle({ 'device-control': { limit: 120, ttl: 60000 } })
  @ApiSecurity('deviceToken') @ApiOperation({ summary: 'Submit a device heartbeat' }) @ApiHeader({ name: 'X-WCOS-Device-Token', required: true }) @ApiResponse({ status: 204 }) @DeviceAuth()
  async heartbeat(@Param('deviceId', ParseUUIDPipe) deviceId: string, @CurrentDevice() device: CurrentDeviceContext, @Body() dto: DeviceHeartbeatDto, @Ip() ipAddress: string, @CorrelationId() correlationId: string): Promise<void> {
    this.sameDevice(deviceId, device.deviceId);
    await this.heartbeats.receiveHeartbeat(deviceId, device.tenantId, { ...dto, ipAddress, lastSyncAt: dto.lastSyncAt ? new Date(dto.lastSyncAt) : undefined }, correlationId);
  }

  @Get(':deviceId/heartbeats/latest') @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBearerAuth() @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_HEARTBEAT_READ) @ApiOperation({ summary: 'Get the latest device heartbeat' }) @ApiParam({ name: 'deviceId', format: 'uuid' }) @ApiResponse({ status: 200 })
  latest(@Param('deviceId', ParseUUIDPipe) deviceId: string, @CurrentUser() user: CurrentUserContext) { return this.heartbeats.getLatestHeartbeat(deviceId, this.tenant(user)); }

  @Get(':deviceId/heartbeats') @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBearerAuth() @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_HEARTBEAT_READ) @ApiOperation({ summary: 'Get device heartbeat history' }) @ApiResponse({ status: 200 })
  history(@Param('deviceId', ParseUUIDPipe) deviceId: string, @Query() query: HeartbeatHistoryQueryDto, @CurrentUser() user: CurrentUserContext) { return this.heartbeats.getHeartbeatHistory(deviceId, this.tenant(user), query.sinceHours); }

  private tenant(user: CurrentUserContext): string { if (user.tenantId) return user.tenantId; throw new AppException({ code: ERROR_CODES.BAD_REQUEST, message: 'This endpoint requires a tenant-scoped JWT.', statusCode: HttpStatus.BAD_REQUEST }); }
  private sameDevice(routeId: string, tokenId: string): void { if (routeId !== tokenId) throw new AppException({ code: ERROR_CODES.PERMISSION_DENIED, message: 'Device token does not match route device.', statusCode: HttpStatus.FORBIDDEN }); }
}
