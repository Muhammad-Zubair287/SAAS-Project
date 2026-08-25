import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PLATFORM_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { PlatformAuthenticationGuard } from '../../../common/guards/platform-authentication.guard';
import { PlatformRoleGuard } from '../../../common/guards/platform-role.guard';
import { PlatformAuditQueryService } from '../services/platform-audit-query.service';
import {
  AuditEventResponseDto,
  ListAuditEventsDto,
} from '../dto/audit-event-response.dto';
import type { PlatformActorContext } from '../../../common/interfaces/platform-actor.interface';

class ExportAuditDto {
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags('Platform — Audit')
@ApiBearerAuth()
@UseGuards(PlatformAuthenticationGuard, PlatformRoleGuard)
@Controller('platform/audit-events')
export class PlatformAuditController {
  constructor(private readonly auditQuery: PlatformAuditQueryService) {}

  @Get('summary')
  @RequirePermissions(PLATFORM_PERMISSIONS.AUDIT_READ)
  @ApiOperation({ summary: 'Audit dashboard aggregates' })
  summarize(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    return this.auditQuery.summarize(fromDate, toDate);
  }

  @Get('exports')
  @RequirePermissions(PLATFORM_PERMISSIONS.AUDIT_EXPORT)
  listExports(@CurrentUser() actor: PlatformActorContext) {
    return this.auditQuery.listExports(actor.actorId);
  }

  @Post('exports')
  @RequirePermissions(PLATFORM_PERMISSIONS.AUDIT_EXPORT)
  requestExport(
    @Body() dto: ExportAuditDto,
    @CurrentUser() actor: PlatformActorContext,
  ) {
    return this.auditQuery.requestExport(actor, dto.filters ?? {}, dto.reason);
  }

  @Get('exports/:exportId/download')
  @RequirePermissions(PLATFORM_PERMISSIONS.AUDIT_EXPORT)
  async downloadExport(
    @Param('exportId', ParseUUIDPipe) exportId: string,
    @CurrentUser() actor: PlatformActorContext,
    @Res({ passthrough: true }) res: Response,
  ) {
    const filePath = await this.auditQuery.getExportFile(exportId, actor.actorId);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="audit-export-${exportId}.csv"`,
    });
    return new StreamableFile(createReadStream(filePath));
  }

  @Get(':eventId')
  @RequirePermissions(PLATFORM_PERMISSIONS.AUDIT_READ)
  @ApiOperation({ summary: 'Audit event detail' })
  findOne(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.auditQuery.findById(eventId);
  }

  @Get()
  @RequirePermissions(PLATFORM_PERMISSIONS.AUDIT_READ)
  @ApiOperation({ summary: 'Search platform audit events' })
  @ApiOkResponse({ description: 'Paginated audit event list' })
  async findMany(@Query() query: ListAuditEventsDto) {
    return this.auditQuery.findMany(query);
  }
}

export type { AuditEventResponseDto };
