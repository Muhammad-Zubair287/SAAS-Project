import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { ATTENDANCE_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AttendanceEventService } from '../services/attendance-event.service';
import { CreateAttendanceEventDto } from '../dto/create-attendance-event.dto';
import { ListAttendanceDto } from '../dto/list-attendance.dto';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance/events')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AttendanceEventController {
  constructor(private readonly service: AttendanceEventService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(ATTENDANCE_PERMISSIONS.EVENT_INGEST)
  @ApiOperation({ summary: 'Ingest an attendance event (check-in or check-out)' })
  create(
    @Body() dto: CreateAttendanceEventDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
    @Ip() ip: string,
  ) {
    this.assertTenant(user);
    return this.service.ingest(dto, user.userId, user.email, user.tenantId!, correlationId, ip);
  }

  @Get()
  @RequirePermissions(ATTENDANCE_PERMISSIONS.EVENT_READ)
  @ApiOperation({ summary: 'List attendance events' })
  findMany(
    @Query() query: ListAttendanceDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findMany(query, user.tenantId!);
  }

  @Get(':id')
  @RequirePermissions(ATTENDANCE_PERMISSIONS.EVENT_READ)
  @ApiOperation({ summary: 'Get attendance event by ID' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findById(id, user.tenantId!);
  }

  private assertTenant(user: CurrentUserContext): void {
    if (!user.tenantId) {
      throw new AppException({
        code: ERROR_CODES.BAD_REQUEST,
        message: 'This endpoint requires a tenant-scoped JWT.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
  }
}
