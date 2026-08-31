import type { Request, Response } from 'express';
import type { InvitationAcceptResponseDto } from '../dto/invitation-accept-response.dto';
import type { InvitationAcceptTokenPair } from '../services/invitation.service';
import type { RefreshCookieService } from '../services/refresh-cookie.service';
import { writeAuthResponse } from './auth-response.util';

export function writeInvitationAcceptResponse(
  res: Response,
  req: Request,
  pair: InvitationAcceptTokenPair,
  cookies: RefreshCookieService,
): InvitationAcceptResponseDto {
  const base = writeAuthResponse(res, req, pair, cookies);
  return {
    ...base,
    tenantSlug: pair.tenantSlug,
    tenantLoginPath: pair.tenantLoginPath,
  };
}
