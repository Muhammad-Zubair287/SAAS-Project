import type { Request, Response } from 'express';
import type { AuthResponseDto } from '../dto/auth-response.dto';
import type { AuthTokenPair } from '../services/auth.service';
import type { RefreshCookieService } from '../services/refresh-cookie.service';

/** Apply HttpOnly refresh cookie and shape the public AuthResponseDto. */
export function writeAuthResponse(
  res: Response,
  req: Request,
  pair: AuthTokenPair,
  cookies: RefreshCookieService,
): AuthResponseDto {
  cookies.setRefreshCookie(res, pair.refreshToken, pair.sessionExpiresAt);

  const body: AuthResponseDto = {
    accessToken: pair.accessToken,
    tokenType: pair.tokenType,
    expiresIn: pair.expiresIn,
    sessionId: pair.sessionId,
  };

  if (cookies.wantsBodyTransport(req)) {
    body.refreshToken = pair.refreshToken;
  }

  return body;
}
