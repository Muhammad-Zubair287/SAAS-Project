import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiParam, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
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
import { DeviceRegistryService } from '../services/device-registry.service';
import {
  DeviceReasonDto,
  DeviceResponseDto,
  ListAttendanceDevicesDto,
  ProvisionAttendanceDeviceDto,
  RegisterAttendanceDeviceDto,
  ReplaceAttendanceDeviceDto,
  toDeviceResponse,
} from '../dto';

@ApiTags('attendance-devices')
@ApiBearerAuth()
@ApiProduces('application/json')
@Controller('attendance/devices')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AttendanceDeviceController {
  constructor(private readonly devices: DeviceRegistryService) {}

  @Get()
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_READ)
  @ApiOperation({ summary: 'List attendance devices' })
  @ApiResponse({ status: 200, type: [DeviceResponseDto] })
  findMany(
    @Query() query: ListAttendanceDevicesDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.devices.findMany(query, this.tenant(user));
  }

  @Get(':deviceId')
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_READ)
  @ApiOperation({ summary: 'Get attendance device by ID' })
  @ApiParam({ name: 'deviceId', format: 'uuid' })
  @ApiResponse({ status: 200, type: DeviceResponseDto })
  @ApiResponse({ status: 404, description: 'Device not found' })
  findById(
    @Param('deviceId', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ): Promise<DeviceResponseDto> {
    return this.devices.findById(id, this.tenant(user));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ 'interactive-write': { limit: 120, ttl: 300000 } })
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_MANAGE)
  @ApiOperation({ summary: 'Register an attendance device' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiResponse({ status: 201, type: DeviceResponseDto })
  create(@Body() dto: RegisterAttendanceDeviceDto, @CurrentUser() user: CurrentUserContext, @CorrelationId() correlationId: string): Promise<DeviceResponseDto> {
    return this.devices.registerDevice(this.tenant(user), dto, user.userId, user.email, correlationId).then(toDeviceResponse);
  }

  @Post(':deviceId/provision')
  @Throttle({ 'interactive-write': { limit: 120, ttl: 300000 } })
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_MANAGE)
  @ApiOperation({ summary: 'Provision an attendance device' })
  @ApiParam({ name: 'deviceId', format: 'uuid' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiResponse({ status: 200, type: DeviceResponseDto })
  provision(@Param('deviceId', ParseUUIDPipe) id: string, @Body() dto: ProvisionAttendanceDeviceDto, @CurrentUser() user: CurrentUserContext, @CorrelationId() correlationId: string): Promise<DeviceResponseDto> {
    return this.devices.provisionDevice(id, this.tenant(user), dto, user.userId, user.email, correlationId).then(toDeviceResponse);
  }

  @Post(':deviceId/activate')
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_MANAGE)
  @ApiOperation({ summary: 'Activate an attendance device' })
  @ApiParam({ name: 'deviceId', format: 'uuid' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiResponse({ status: 200, type: DeviceResponseDto })
  activate(@Param('deviceId', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserContext, @CorrelationId() correlationId: string): Promise<DeviceResponseDto> {
    return this.devices.activateDevice(id, this.tenant(user), user.userId, user.email, correlationId).then(toDeviceResponse);
  }

  @Post(':deviceId/suspend')
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_MANAGE)
  @ApiOperation({ summary: 'Suspend an attendance device' })
  @ApiParam({ name: 'deviceId', format: 'uuid' }) @ApiResponse({ status: 200, type: DeviceResponseDto })
  suspend(@Param('deviceId', ParseUUIDPipe) id: string, @Body() dto: DeviceReasonDto, @CurrentUser() user: CurrentUserContext, @CorrelationId() correlationId: string): Promise<DeviceResponseDto> {
    return this.devices.suspendDevice(id, this.tenant(user), dto.reason, user.userId, user.email, correlationId).then(toDeviceResponse);
  }

  @Post(':deviceId/decommission')
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_MANAGE)
  @ApiOperation({ summary: 'Decommission an attendance device' })
  @ApiParam({ name: 'deviceId', format: 'uuid' }) @ApiResponse({ status: 200, type: DeviceResponseDto })
  decommission(@Param('deviceId', ParseUUIDPipe) id: string, @Body() dto: DeviceReasonDto, @CurrentUser() user: CurrentUserContext, @CorrelationId() correlationId: string): Promise<DeviceResponseDto> {
    return this.devices.decommissionDevice(id, this.tenant(user), dto.reason, user.userId, user.email, correlationId).then(toDeviceResponse);
  }

  @Post(':deviceId/replace')
  @RequirePermissions(ATTENDANCE_CAPTURE_PERMISSIONS.DEVICE_MANAGE)
  @ApiOperation({ summary: 'Replace an attendance device' })
  @ApiParam({ name: 'deviceId', format: 'uuid' }) @ApiHeader({ name: 'Idempotency-Key', required: true }) @ApiResponse({ status: 200, type: DeviceResponseDto })
  replace(@Param('deviceId', ParseUUIDPipe) id: string, @Body() dto: ReplaceAttendanceDeviceDto, @CurrentUser() user: CurrentUserContext, @CorrelationId() correlationId: string): Promise<DeviceResponseDto> {
    return this.devices.replaceDevice(id, this.tenant(user), dto, user.userId, user.email, correlationId).then((result) => toDeviceResponse(result.newDevice));
  }

  private tenant(user: CurrentUserContext): string {
    if (user.tenantId) return user.tenantId;
    throw new AppException({ code: ERROR_CODES.BAD_REQUEST, message: 'This endpoint requires a tenant-scoped JWT.', statusCode: HttpStatus.BAD_REQUEST });
  }
}
