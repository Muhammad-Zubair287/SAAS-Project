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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { CurrentUserContext } from '../interfaces/current-user-context.interface';
import {
  ApiClientService,
  type ApiClientResponse,
  type CreateApiClientResponse,
  type RotateSecretResponse,
} from '../services/api-client.service';
import { CreateApiClientDto } from '../dto/create-api-client.dto';
import type { RequestContext } from '../services/auth.service';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags('auth')
@Controller('api-clients')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ApiClientController {
  constructor(private readonly apiClientService: ApiClientService) {}

  @ApiOperation({ summary: 'Create a new API client and return its secret (shown once)' })
  @RequirePermissions('manage:api_client:tenant')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateApiClientDto,
    @CurrentUser() actor: CurrentUserContext,
    @Req() req: Request,
  ): Promise<CreateApiClientResponse> {
    this.assertTenant(actor);
    return this.apiClientService.create(dto, actor.userId, actor.tenantId!, this.ctx(req));
  }

  @ApiOperation({ summary: 'List all API clients for the current tenant' })
  @RequirePermissions('read:api_client:tenant')
  @Get()
  @HttpCode(HttpStatus.OK)
  list(@CurrentUser() actor: CurrentUserContext): Promise<ApiClientResponse[]> {
    this.assertTenant(actor);
    return this.apiClientService.list(actor.tenantId!);
  }

  @ApiOperation({ summary: 'Get details of a single API client' })
  @RequirePermissions('read:api_client:tenant')
  @Get(':clientId')
  @HttpCode(HttpStatus.OK)
  getById(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @CurrentUser() actor: CurrentUserContext,
  ): Promise<ApiClientResponse> {
    this.assertTenant(actor);
    return this.apiClientService.getById(clientId, actor.tenantId!);
  }

  @ApiOperation({ summary: 'Rotate the client secret — new secret returned once, old immediately invalid' })
  @RequirePermissions('manage:api_client:tenant')
  @Patch(':clientId/rotate-secret')
  @HttpCode(HttpStatus.OK)
  rotateSecret(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @CurrentUser() actor: CurrentUserContext,
    @Req() req: Request,
  ): Promise<RotateSecretResponse> {
    this.assertTenant(actor);
    return this.apiClientService.rotateSecret(clientId, actor.userId, actor.tenantId!, this.ctx(req));
  }

  @ApiOperation({ summary: 'Disable an API client (revoke access without deleting)' })
  @RequirePermissions('manage:api_client:tenant')
  @Patch(':clientId/disable')
  @HttpCode(HttpStatus.OK)
  disable(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @CurrentUser() actor: CurrentUserContext,
    @Req() req: Request,
  ): Promise<ApiClientResponse> {
    this.assertTenant(actor);
    return this.apiClientService.disable(clientId, actor.userId, actor.tenantId!, this.ctx(req));
  }

  @ApiOperation({ summary: 'Re-enable a previously disabled API client' })
  @RequirePermissions('manage:api_client:tenant')
  @Patch(':clientId/enable')
  @HttpCode(HttpStatus.OK)
  enable(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @CurrentUser() actor: CurrentUserContext,
    @Req() req: Request,
  ): Promise<ApiClientResponse> {
    this.assertTenant(actor);
    return this.apiClientService.enable(clientId, actor.userId, actor.tenantId!, this.ctx(req));
  }

  @ApiOperation({ summary: 'Permanently delete an API client' })
  @RequirePermissions('manage:api_client:tenant')
  @Delete(':clientId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @CurrentUser() actor: CurrentUserContext,
    @Req() req: Request,
  ): Promise<void> {
    this.assertTenant(actor);
    await this.apiClientService.delete(clientId, actor.userId, actor.tenantId!, this.ctx(req));
  }

  private assertTenant(actor: CurrentUserContext): void {
    if (!actor.tenantId) {
      throw new Error('API client management requires a tenant-scoped JWT.');
    }
  }

  private ctx(req: Request): RequestContext {
    const headerCorrelationId = req.headers['x-correlation-id'] as string | undefined;
    const correlationId =
      headerCorrelationId && UUID_PATTERN.test(headerCorrelationId)
        ? headerCorrelationId
        : randomUUID();
    return {
      ipAddress: req.ip ?? null,
      userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
      correlationId,
    };
  }
}
