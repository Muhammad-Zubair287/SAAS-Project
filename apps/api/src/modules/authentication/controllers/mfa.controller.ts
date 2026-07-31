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
import { MfaService, type EnrollMfaResponse } from '../services/mfa.service';
import type { AuthResponseDto } from '../dto/auth-response.dto';
import { VerifyMfaDto } from '../dto/verify-mfa.dto';
import { DisableMfaDto } from '../dto/disable-mfa.dto';
import { ChallengeMfaDto } from '../dto/challenge-mfa.dto';
import type { RequestContext } from '../services/auth.service';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags('auth')
@Controller('auth/mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @ApiOperation({ summary: 'Begin TOTP MFA enrollment — returns secret and OTP auth URL' })
  @UseGuards(JwtAuthGuard)
  @Post('enroll')
  @HttpCode(HttpStatus.CREATED)
  enroll(@CurrentUser() user: CurrentUserContext): Promise<EnrollMfaResponse> {
    return this.mfaService.enroll(user);
  }

  @ApiOperation({ summary: 'Verify first TOTP code to activate MFA and receive backup codes' })
  @UseGuards(JwtAuthGuard)
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verifyAndEnable(
    @Body() dto: VerifyMfaDto,
    @CurrentUser() user: CurrentUserContext,
  ): Promise<{ backupCodes: string[] }> {
    return this.mfaService.verifyAndEnable(user, dto);
  }

  @ApiOperation({ summary: 'Complete MFA challenge after password login (no JWT required)' })
  @Post('challenge')
  @HttpCode(HttpStatus.OK)
  completeMfaChallenge(
    @Body() dto: ChallengeMfaDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    return this.mfaService.completeMfaChallenge(dto, this.buildContext(req));
  }

  @ApiOperation({ summary: 'Disable MFA — requires password and current TOTP code' })
  @UseGuards(JwtAuthGuard)
  @Post('disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disable(
    @Body() dto: DisableMfaDto,
    @CurrentUser() user: CurrentUserContext,
    @Req() req: Request,
  ): Promise<void> {
    await this.mfaService.disableMfa(user, dto, this.buildContext(req));
  }

  @ApiOperation({ summary: 'Regenerate backup codes — requires current TOTP code' })
  @UseGuards(JwtAuthGuard)
  @Post('backup-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  regenerateBackupCodes(
    @Body() dto: VerifyMfaDto,
    @CurrentUser() user: CurrentUserContext,
    @Req() req: Request,
  ): Promise<{ backupCodes: string[] }> {
    return this.mfaService.regenerateBackupCodes(user, dto, this.buildContext(req));
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
