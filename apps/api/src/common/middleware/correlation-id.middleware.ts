import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { APP_CONSTANTS } from '../constants/app.constants';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (!req.headers[APP_CONSTANTS.CORRELATION_ID_HEADER]) {
      req.headers[APP_CONSTANTS.CORRELATION_ID_HEADER] = uuidv4();
    }
    next();
  }
}
