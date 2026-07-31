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
import { AuthService, type RequestContext, type LoginResponse } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import type { AuthResponseDto } from '../dto/auth-response.dto';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Authenticate with email and password' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<LoginResponse> {
    return this.authService.login(dto, this.buildContext(req));
  }

  @ApiOperation({ summary: 'Rotate refresh token and issue new token pair' })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.authService.refresh(dto, this.buildContext(req));
  }

  @ApiOperation({ summary: 'Revoke the current session' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: CurrentUserContext,
    @Req() req: Request,
  ): Promise<void> {
    await this.authService.logout(
      user.sessionId,
      user.userId,
      user.email,
      this.buildContext(req),
    );
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
