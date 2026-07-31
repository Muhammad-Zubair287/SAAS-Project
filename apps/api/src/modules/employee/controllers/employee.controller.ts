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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import { EMPLOYEE_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { EmployeeService } from '../services/employee.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { ListEmployeesDto } from '../dto/list-employees.dto';

@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class EmployeeController {
  constructor(private readonly service: EmployeeService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(EMPLOYEE_PERMISSIONS.EMPLOYEE_CREATE)
  @ApiOperation({ summary: 'Create an employee' })
  create(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ) {
    this.assertTenant(user);
    return this.service.create(dto, user.userId, user.email, user.tenantId!, correlationId);
  }

  @Get()
  @RequirePermissions(EMPLOYEE_PERMISSIONS.EMPLOYEE_READ)
  @ApiOperation({ summary: 'List employees (paginated, filterable)' })
  findMany(
    @Query() query: ListEmployeesDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findMany(query, user.tenantId!);
  }

  @Get(':id')
  @RequirePermissions(EMPLOYEE_PERMISSIONS.EMPLOYEE_READ)
  @ApiOperation({ summary: 'Get employee by ID' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.service.findById(id, user.tenantId!);
  }

  @Patch(':id')
  @RequirePermissions(EMPLOYEE_PERMISSIONS.EMPLOYEE_UPDATE)
  @ApiOperation({ summary: 'Update employee (ETag optimistic concurrency)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
    @Headers('if-match') ifMatch?: string,
  ) {
    this.assertTenant(user);
    return this.service.update(
      id,
      dto,
      user.userId,
      user.email,
      user.tenantId!,
      correlationId,
      ifMatch,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(EMPLOYEE_PERMISSIONS.EMPLOYEE_DELETE)
  @ApiOperation({ summary: 'Deactivate employee (soft delete)' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
    @CorrelationId() correlationId: string,
  ): Promise<void> {
    this.assertTenant(user);
    await this.service.deactivate(id, user.userId, user.email, user.tenantId!, correlationId);
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
