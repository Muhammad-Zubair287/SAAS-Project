import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { randomUUID } from 'crypto';
import { PasswordResetService } from '../services/password-reset.service';
import { PasswordResetRequestDto } from '../dto/password-reset-request.dto';
import { PasswordResetConfirmDto } from '../dto/password-reset-confirm.dto';
import type { RequestContext } from '../services/auth.service';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags('auth')
@Controller('auth/password-reset')
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @ApiOperation({ summary: 'Request a password reset email' })
  @Post('request')
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestPasswordReset(
    @Body() dto: PasswordResetRequestDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.passwordResetService.requestPasswordReset(dto, this.buildContext(req));
  }

  @ApiOperation({ summary: 'Confirm password reset with token and new password' })
  @Post('confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmPasswordReset(
    @Body() dto: PasswordResetConfirmDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.passwordResetService.confirmPasswordReset(dto, this.buildContext(req));
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
