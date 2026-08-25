import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import type { CurrentUserContext } from '../interfaces/current-user-context.interface';
import {
  AuthService,
  type RequestContext,
  type AuthTokenPair,
  type MfaChallengeResponse,
} from '../services/auth.service';
import { RefreshCookieService } from '../services/refresh-cookie.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { SessionUserDto } from '../dto/session-user.dto';
import { writeAuthResponse } from '../utils/auth-response.util';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isTokenPair(value: AuthTokenPair | MfaChallengeResponse): value is AuthTokenPair {
  return 'accessToken' in value && 'refreshToken' in value && 'sessionExpiresAt' in value;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshCookies: RefreshCookieService,
  ) {}

  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto | MfaChallengeResponse> {
    const result = await this.authService.login(dto, this.buildContext(req));
    if (isTokenPair(result)) {
      return writeAuthResponse(res, req, result, this.refreshCookies);
    }
    return result;
  }

  @ApiOperation({
    summary: 'Rotate refresh token and issue a new access token',
    description:
      'Browser clients send the HttpOnly refresh cookie. Non-browser clients may send refreshToken in the body with X-Auth-Transport: body.',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const fromCookie = this.refreshCookies.readRefreshToken(req);
    const refreshToken = fromCookie ?? dto.refreshToken;
    if (!refreshToken) {
      throw new AppException({
        code: ERROR_CODES.INVALID_TOKEN,
        message: 'Refresh token is required.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }
    const pair = await this.authService.refresh(refreshToken, this.buildContext(req));
    return writeAuthResponse(res, req, pair, this.refreshCookies);
  }

  @ApiOperation({ summary: 'Revoke the current session and clear the refresh cookie' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: CurrentUserContext,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(
      user.sessionId,
      user.userId,
      user.email,
      this.buildContext(req),
    );
    this.refreshCookies.clearRefreshCookie(res);
  }

  @ApiOperation({ summary: 'Return the current authenticated user/session profile' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: SessionUserDto })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  me(@CurrentUser() user: CurrentUserContext): Promise<SessionUserDto> {
    return this.authService.getSessionUser(user);
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
