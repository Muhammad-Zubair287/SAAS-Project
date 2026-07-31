import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import type { CurrentUserContext } from '../interfaces/current-user-context.interface';
import { InvitationService, type InvitationCreatedResponse } from '../services/invitation.service';
import type { AuthResponseDto } from '../dto/auth-response.dto';
import { InvitationCreateDto } from '../dto/invitation-create.dto';
import { InvitationAcceptDto } from '../dto/invitation-accept.dto';
import type { RequestContext } from '../services/auth.service';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags('auth')
@Controller('auth/invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @ApiOperation({ summary: 'Create a user invitation' })
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createInvitation(
    @Body() dto: InvitationCreateDto,
    @CurrentUser() user: CurrentUserContext,
    @Req() req: Request,
  ): Promise<InvitationCreatedResponse> {
    return this.invitationService.createInvitation(dto, user.userId, this.buildContext(req));
  }

  @ApiOperation({ summary: 'Accept an invitation and set initial password' })
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  acceptInvitation(
    @Body() dto: InvitationAcceptDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    return this.invitationService.acceptInvitation(dto, this.buildContext(req));
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
