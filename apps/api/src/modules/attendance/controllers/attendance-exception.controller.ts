import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { AttendanceExceptionService } from '../services/attendance-exception.service';
import { ResolveExceptionDto } from '../dto/resolve-exception.dto';
import { ListAttendanceDto } from '../dto/list-attendance.dto';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance/exceptions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AttendanceExceptionController {
  constructor(private readonly service: AttendanceExceptionService) {}

  @Get()
  @RequirePermissions(ATTENDANCE_PERMISSIONS.EXCEPTION_READ)
  @ApiOperation({ summary: 'List attendance exceptions' })
  findMany(
    @Query() query: ListAttendanceDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findMany(query, user.tenantId!);
  }

  @Get(':id')
  @RequirePermissions(ATTENDANCE_PERMISSIONS.EXCEPTION_READ)
  @ApiOperation({ summary: 'Get attendance exception by ID' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findById(id, user.tenantId!);
  }

  @Patch(':id/resolve')
  @RequirePermissions(ATTENDANCE_PERMISSIONS.EXCEPTION_RESOLVE)
  @ApiOperation({ summary: 'Resolve an attendance exception' })
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveExceptionDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    this.assertTenant(user);
    return this.service.resolve(
      id,
      dto,
      user.userId,
      user.email,
      user.tenantId!,
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
