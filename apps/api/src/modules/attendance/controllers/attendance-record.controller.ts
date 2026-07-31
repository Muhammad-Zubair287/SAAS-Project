import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsISO8601, IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { ATTENDANCE_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AttendanceRecordService } from '../services/attendance-record.service';
import { CreateManualAttendanceRecordDto } from '../dto/create-manual-record.dto';
import { ListAttendanceDto } from '../dto/list-attendance.dto';

class RecalculateDto {
  @IsUUID()
  employeeId!: string;

  @IsISO8601()
  dateFrom!: string;

  @IsISO8601()
  dateTo!: string;
}

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance/records')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AttendanceRecordController {
  constructor(private readonly service: AttendanceRecordService) {}

  @Get()
  @RequirePermissions(ATTENDANCE_PERMISSIONS.RECORD_READ)
  @ApiOperation({ summary: 'List attendance records' })
  findMany(
    @Query() query: ListAttendanceDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findMany(query, user.tenantId!);
  }

  @Get('employee/:employeeId')
  @RequirePermissions(ATTENDANCE_PERMISSIONS.RECORD_READ)
  @ApiOperation({ summary: 'Get attendance records for a specific employee' })
  findByEmployee(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: ListAttendanceDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findByEmployee(employeeId, query, user.tenantId!);
  }

  @Get(':id')
  @RequirePermissions(ATTENDANCE_PERMISSIONS.RECORD_READ)
  @ApiOperation({ summary: 'Get attendance record by ID' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findById(id, user.tenantId!);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(ATTENDANCE_PERMISSIONS.RECORD_CREATE_MANUAL)
  @ApiOperation({ summary: 'Create a manual attendance record' })
  createManual(
    @Body() dto: CreateManualAttendanceRecordDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    this.assertTenant(user);
    return this.service.createManual(
      dto,
      user.userId,
      user.email,
      user.tenantId!,
      correlationId,
    );
  }

  @Post('recalculate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(ATTENDANCE_PERMISSIONS.RECORD_RECALCULATE)
  @ApiOperation({ summary: 'Trigger recalculation for an employee over a date range' })
  async recalculate(
    @Body() body: RecalculateDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ): Promise<void> {
    this.assertTenant(user);
    await this.service.recalculate(
      body.employeeId,
      body.dateFrom,
      body.dateTo,
      user.tenantId!,
      user.userId,
      correlationId,
    );
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
