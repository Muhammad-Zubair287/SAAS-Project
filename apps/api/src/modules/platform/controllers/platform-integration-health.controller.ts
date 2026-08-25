import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CorrelationId } from '../../../common/decorators/correlation-id.decorator';
import { PLATFORM_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { PlatformAuthenticationGuard } from '../../../common/guards/platform-authentication.guard';
import { PlatformRoleGuard } from '../../../common/guards/platform-role.guard';
import { PlatformIntegrationHealthService } from '../services/platform-integration-health.service';
import type { PlatformActorContext } from '../../../common/interfaces/platform-actor.interface';

class ResolveBody {
  @IsIn(['MAP', 'IGNORE', 'RESOLVE'])
  action!: 'MAP' | 'IGNORE' | 'RESOLVE';
}

class EnabledBody {
  enabled!: boolean;
}

@ApiTags('Platform — Integration Health')
@ApiBearerAuth()
@UseGuards(PlatformAuthenticationGuard, PlatformRoleGuard)
@Controller('platform/integration-health')
export class PlatformIntegrationHealthController {
  constructor(private readonly health: PlatformIntegrationHealthService) {}

  @Get()
  @RequirePermissions(PLATFORM_PERMISSIONS.INTEGRATION_READ)
  @ApiOperation({ summary: 'List integration connections and status' })
  list() {
    return this.health.listConnections();
  }

  @Get('incidents')
  @RequirePermissions(PLATFORM_PERMISSIONS.INTEGRATION_READ)
  incidents() {
    return this.health.incidents();
  }

  @Get('reconciliation')
  @RequirePermissions(PLATFORM_PERMISSIONS.INTEGRATION_READ)
  reconciliation(@Query('connectionId') connectionId?: string) {
    return this.health.listReconciliation(connectionId);
  }

  @Get(':connectionId/sync-runs')
  @RequirePermissions(PLATFORM_PERMISSIONS.INTEGRATION_READ)
  syncRuns(@Param('connectionId', ParseUUIDPipe) connectionId: string) {
    return this.health.listSyncRuns(connectionId);
  }

  @Post(':connectionId/retry')
  @RequirePermissions(PLATFORM_PERMISSIONS.INTEGRATION_MANAGE)
  retry(@Param('connectionId', ParseUUIDPipe) connectionId: string) {
    return this.health.retryProbe(connectionId);
  }

  @Patch(':connectionId/enabled')
  @RequirePermissions(PLATFORM_PERMISSIONS.INTEGRATION_MANAGE)
  setEnabled(
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @Body() dto: EnabledBody,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.health.setEnabled(connectionId, Boolean(dto.enabled), actor, correlationId);
  }

  @Post('reconciliation/:id/resolve')
  @RequirePermissions(PLATFORM_PERMISSIONS.INTEGRATION_MANAGE)
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveBody,
    @CurrentUser() actor: PlatformActorContext,
    @CorrelationId() correlationId: string,
  ) {
    return this.health.resolveReconciliation(id, dto.action, actor, correlationId);
  }
}
