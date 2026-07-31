import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';

interface MfaChallengePayload {
  sub: string;
  tenantId?: string;
  email: string;
  type: string;
}

export interface ChallengeContext {
  userId: string;
  tenantId: string | null;
  email: string;
}

@Injectable()
export class ChallengeService {
  constructor(private readonly jwtService: JwtService) {}

  issueChallengeToken(userId: string, tenantId: string | null, email: string): string {
    const payload: MfaChallengePayload = {
      sub: userId,
      email,
      type: 'mfa_challenge',
      ...(tenantId ? { tenantId } : {}),
    };
    return this.jwtService.sign(payload, { expiresIn: '5m' });
  }

  validateChallengeToken(token: string): ChallengeContext {
    try {
      const payload = this.jwtService.verify<MfaChallengePayload>(token);
      if (payload.type !== 'mfa_challenge') {
        throw new Error('Not an mfa_challenge token');
      }
      return {
        userId: payload.sub,
        tenantId: payload.tenantId ?? null,
        email: payload.email,
      };
    } catch {
      throw new AppException({
        code: ERROR_CODES.INVALID_TOKEN,
        message: 'MFA challenge token is invalid or has expired.',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }
  }
}
