import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';

export const AUTH_TRANSPORT_HEADER = 'x-auth-transport';
export const AUTH_TRANSPORT_BODY = 'body';

@Injectable()
export class RefreshCookieService {
  private readonly name: string;
  private readonly path: string;
  private readonly secure: boolean;
  private readonly sameSite: 'lax' | 'strict' | 'none';
  private readonly domain: string | undefined;
  private readonly httpOnly = true;

  constructor(private readonly config: ConfigService) {
    this.name = config.getOrThrow<string>('sessionCookie.name');
    this.path = config.getOrThrow<string>('sessionCookie.path');
    this.secure = config.getOrThrow<boolean>('sessionCookie.secure');
    this.sameSite = config.getOrThrow<'lax' | 'strict' | 'none'>('sessionCookie.sameSite');
    this.domain = config.get<string | undefined>('sessionCookie.domain');
  }

  get cookieName(): string {
    return this.name;
  }

  readRefreshToken(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string> | undefined;
    const value = cookies?.[this.name];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  wantsBodyTransport(req: Request): boolean {
    const header = req.headers[AUTH_TRANSPORT_HEADER];
    const value = Array.isArray(header) ? header[0] : header;
    return (value ?? '').toLowerCase() === AUTH_TRANSPORT_BODY;
  }

  setRefreshCookie(res: Response, refreshToken: string, expiresAt: Date): void {
    const maxAge = Math.max(0, expiresAt.getTime() - Date.now());
    res.cookie(this.name, refreshToken, this.buildOptions(maxAge));
  }

  clearRefreshCookie(res: Response): void {
    // Mirror set options so browsers drop the cookie reliably (path/domain/sameSite).
    res.clearCookie(this.name, {
      httpOnly: this.httpOnly,
      secure: this.secure,
      sameSite: this.sameSite,
      path: this.path,
      ...(this.domain ? { domain: this.domain } : {}),
    });
  }

  private buildOptions(maxAgeMs: number): CookieOptions {
    return {
      httpOnly: this.httpOnly,
      secure: this.secure,
      sameSite: this.sameSite,
      path: this.path,
      ...(this.domain ? { domain: this.domain } : {}),
      maxAge: maxAgeMs,
    };
  }
}
