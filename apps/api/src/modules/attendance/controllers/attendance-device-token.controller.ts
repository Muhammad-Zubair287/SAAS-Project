import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
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
import { DeviceAuthService } from '../services/device-auth.service';
import { DeviceReasonDto, DeviceTokenInspectionResponseDto, DeviceTokenResponseDto } from '../dto';

@ApiTags('attendance-device-tokens')
@Controller('attendance/devices/:deviceId')
export class AttendanceDeviceTokenController {
  constructor(private readonly tokens: DeviceAuthService) {}

  @Post('tokens') @HttpCode(HttpStatus.CREATED) @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiBearerAuth() @ApiOperation({ summary: 'Issue an opaque device token' }) @ApiParam({ name: 'deviceId', format: 'uuid' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiResponse({ status: 201, type: DeviceTokenResponseDto })
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_TOKEN_ISSUE)
  async issue(@Param('deviceId', ParseUUIDPipe) deviceId: string, @CurrentUser() user: CurrentUserContext, @CorrelationId() correlationId: string): Promise<DeviceTokenResponseDto> {
    const result = await this.tokens.issueToken(deviceId, this.tenant(user), user.userId, correlationId);
    return { ...result, tokenType: 'Device' };
  }

  @Post('tokens/rotate') @UseGuards(JwtAuthGuard, PermissionGuard, DeviceAuthGuard)
  @ApiBearerAuth() @ApiSecurity('deviceToken') @ApiOperation({ summary: 'Rotate the current device token' }) @ApiHeader({ name: 'X-WCOS-Device-Token', required: true }) @ApiResponse({ status: 200, type: DeviceTokenResponseDto })
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_TOKEN_ROTATE) @DeviceAuth()
  async rotate(@Param('deviceId', ParseUUIDPipe) deviceId: string, @CurrentUser() user: CurrentUserContext, @CurrentDevice() device: CurrentDeviceContext, @CorrelationId() correlationId: string): Promise<DeviceTokenResponseDto> {
    this.sameDevice(deviceId, device.deviceId);
    const result = await this.tokens.rotateToken(device.tokenHash, deviceId, this.tenant(user), user.userId, correlationId);
    return { ...result, tokenType: 'Device' };
  }

  @Post('tokens/revoke') @HttpCode(HttpStatus.NO_CONTENT) @UseGuards(JwtAuthGuard, PermissionGuard, DeviceAuthGuard)
  @ApiBearerAuth() @ApiSecurity('deviceToken') @ApiOperation({ summary: 'Revoke the current device token' }) @ApiHeader({ name: 'X-WCOS-Device-Token', required: true }) @ApiResponse({ status: 204 })
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_TOKEN_REVOKE) @DeviceAuth()
  async revoke(@Param('deviceId', ParseUUIDPipe) deviceId: string, @Body() dto: DeviceReasonDto, @CurrentUser() user: CurrentUserContext, @CurrentDevice() device: CurrentDeviceContext, @CorrelationId() correlationId: string): Promise<void> {
    this.sameDevice(deviceId, device.deviceId);
    await this.tokens.revokeToken(device.tokenHash, deviceId, this.tenant(user), user.userId, dto.reason, correlationId);
  }

  @Get('token') @UseGuards(DeviceAuthGuard)
  @ApiSecurity('deviceToken') @ApiOperation({ summary: 'Inspect the current device token' }) @ApiHeader({ name: 'X-WCOS-Device-Token', required: true }) @ApiResponse({ status: 200, type: DeviceTokenInspectionResponseDto }) @DeviceAuth()
  inspect(@Param('deviceId', ParseUUIDPipe) deviceId: string, @CurrentDevice() device: CurrentDeviceContext): DeviceTokenInspectionResponseDto {
    this.sameDevice(deviceId, device.deviceId);
    return { deviceId: device.deviceId, valid: true, expiresAt: device.expiresAt };
  }

  private tenant(user: CurrentUserContext): string { if (user.tenantId) return user.tenantId; throw new AppException({ code: ERROR_CODES.BAD_REQUEST, message: 'This endpoint requires a tenant-scoped JWT.', statusCode: HttpStatus.BAD_REQUEST }); }
  private sameDevice(routeId: string, tokenId: string): void { if (routeId !== tokenId) throw new AppException({ code: ERROR_CODES.PERMISSION_DENIED, message: 'Device token does not match route device.', statusCode: HttpStatus.FORBIDDEN }); }
}
