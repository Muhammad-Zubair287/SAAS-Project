import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import type { CurrentUserContext } from '../interfaces/current-user-context.interface';
import { InvitationService, type InvitationCreatedResponse } from '../services/invitation.service';
import { RefreshCookieService } from '../services/refresh-cookie.service';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { InvitationCreateDto } from '../dto/invitation-create.dto';
import { InvitationAcceptDto } from '../dto/invitation-accept.dto';
import type { RequestContext } from '../services/auth.service';
import { writeAuthResponse } from '../utils/auth-response.util';
import { TENANT_ADMIN_PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags('auth')
@Controller('auth/invitations')
export class InvitationController {
  constructor(
    private readonly invitationService: InvitationService,
    private readonly refreshCookies: RefreshCookieService,
  ) {}

  @ApiOperation({ summary: 'List invitations for the current tenant' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.USER_INVITE)
  @Get()
  listInvitations(@CurrentUser() user: CurrentUserContext) {
    return this.invitationService.listByTenant(this.requireTenant(user));
  }

  @ApiOperation({ summary: 'Create a user invitation' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.USER_INVITE)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createInvitation(
    @Body() dto: InvitationCreateDto,
    @CurrentUser() user: CurrentUserContext,
    @Req() req: Request,
  ): Promise<InvitationCreatedResponse> {
    const tenantId = user.tenantId ?? dto.tenantId;
    if (!tenantId) {
      throw new AppException({
        code: ERROR_CODES.TENANT_MEMBERSHIP_REQUIRED,
        message: 'Tenant context is required to create invitations.',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }
    // Never trust a client-supplied tenantId that differs from JWT tenant context.
    if (user.tenantId && dto.tenantId && dto.tenantId !== user.tenantId) {
      throw new AppException({
        code: ERROR_CODES.PERMISSION_DENIED,
        message: 'Cannot invite users into another tenant.',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }
    return this.invitationService.createInvitation(
      { ...dto, tenantId },
      user.userId,
      this.buildContext(req),
    );
  }

  @ApiOperation({ summary: 'Resend a pending invitation' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.USER_INVITE)
  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  resend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
    @Req() req: Request,
  ) {
    return this.invitationService.resendInvitation(
      this.requireTenant(user),
      id,
      user.userId,
      this.buildContext(req),
    );
  }

  @ApiOperation({ summary: 'Revoke a pending invitation' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(TENANT_ADMIN_PERMISSIONS.USER_INVITE)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserContext,
    @Req() req: Request,
  ): Promise<void> {
    await this.invitationService.revokeInvitation(
      this.requireTenant(user),
      id,
      user.userId,
      this.buildContext(req),
    );
  }

  @ApiOperation({ summary: 'Accept an invitation and set initial password' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @Body() dto: InvitationAcceptDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const pair = await this.invitationService.acceptInvitation(dto, this.buildContext(req));
    return writeAuthResponse(res, req, pair, this.refreshCookies);
  }

  private requireTenant(user: CurrentUserContext): string {
    if (!user.tenantId) {
      throw new AppException({
        code: ERROR_CODES.TENANT_MEMBERSHIP_REQUIRED,
        message: 'Tenant context is required.',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }
    return user.tenantId;
  }

  private buildContext(req: Request): RequestContext {
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
