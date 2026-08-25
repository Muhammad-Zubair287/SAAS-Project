import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import type { CurrentUserContext } from '../interfaces/current-user-context.interface';
import { MfaService, type EnrollMfaResponse } from '../services/mfa.service';
import { RefreshCookieService } from '../services/refresh-cookie.service';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { VerifyMfaDto } from '../dto/verify-mfa.dto';
import { DisableMfaDto } from '../dto/disable-mfa.dto';
import { ChallengeMfaDto } from '../dto/challenge-mfa.dto';
import type { RequestContext } from '../services/auth.service';
import { writeAuthResponse } from '../utils/auth-response.util';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags('auth')
@Controller('auth/mfa')
export class MfaController {
  constructor(
    private readonly mfaService: MfaService,
    private readonly refreshCookies: RefreshCookieService,
  ) {}

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
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @Post('challenge')
  @HttpCode(HttpStatus.OK)
  async completeMfaChallenge(
    @Body() dto: ChallengeMfaDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const pair = await this.mfaService.completeMfaChallenge(dto, this.buildContext(req));
    return writeAuthResponse(res, req, pair, this.refreshCookies);
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
