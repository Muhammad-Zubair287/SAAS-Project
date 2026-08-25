import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { JwtAuthGuard } from '../../authentication/guards/jwt-auth.guard';
import { PermissionGuard } from '../../authentication/guards/permission.guard';
import { RequirePermissions } from '../../authentication/decorators/require-permissions.decorator';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import type { CurrentUserContext } from '../../authentication/interfaces/current-user-context.interface';
import { ORGANISATION_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { GradeService } from '../services/grade.service';
import { OrganisationOverviewService } from '../services/organisation-overview.service';

export class CreateGradeDto {
  @ApiProperty()
  @IsString()
  @MaxLength(40)
  code!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateGradeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}

export class ListGradesDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

@ApiTags('organisation')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class GradeAndOverviewController {
  constructor(
    private readonly gradeService: GradeService,
    private readonly overviewService: OrganisationOverviewService,
  ) {}

  @Get('organisation/overview')
  @RequirePermissions(ORGANISATION_PERMISSIONS.ORG_OVERVIEW_READ)
  @ApiOperation({ summary: 'Organisation overview KPIs (SCR-ORG-01)' })
  overview(@CurrentUser() user: CurrentUserContext) {
    this.assertTenant(user);
    return this.overviewService.getOverview(user.tenantId!);
  }

  @Get('organisation/history')
  @RequirePermissions(ORGANISATION_PERMISSIONS.ORG_HISTORY_READ)
  @ApiOperation({ summary: 'Organisation change history (SCR-ORG-08)' })
  history(
    @Query() query: PaginationDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.overviewService.getHistory(user.tenantId!, query);
  }

  @Get('departments/tree')
  @RequirePermissions(ORGANISATION_PERMISSIONS.DEPARTMENT_READ)
  @ApiOperation({ summary: 'Department hierarchy tree (SCR-ORG-04)' })
  departmentTree(
    @Query('legalEntityId') legalEntityId: string | undefined,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.overviewService.getDepartmentTree(user.tenantId!, legalEntityId);
  }

  @Post('grades')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(ORGANISATION_PERMISSIONS.GRADE_CREATE)
  @ApiOperation({ summary: 'Create grade' })
  createGrade(
    @Body() dto: CreateGradeDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.gradeService.create(dto, user.userId, user.tenantId!);
  }

  @Get('grades')
  @RequirePermissions(ORGANISATION_PERMISSIONS.GRADE_READ)
  @ApiOperation({ summary: 'List grades' })
  listGrades(
    @Query() query: ListGradesDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.gradeService.findMany(query, user.tenantId!);
  }

  @Get('grades/:id')
  @RequirePermissions(ORGANISATION_PERMISSIONS.GRADE_READ)
  findGrade(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.gradeService.findById(id, user.tenantId!);
  }

  @Patch('grades/:id')
  @RequirePermissions(ORGANISATION_PERMISSIONS.GRADE_UPDATE)
  updateGrade(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGradeDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    this.assertTenant(user);
    return this.gradeService.update(id, dto, user.userId, user.tenantId!);
  }

  @Delete('grades/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(ORGANISATION_PERMISSIONS.GRADE_DELETE)
  async deactivateGrade(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
  ): Promise<void> {
    this.assertTenant(user);
    await this.gradeService.deactivate(id, user.userId, user.tenantId!);
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
