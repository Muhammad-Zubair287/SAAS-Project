import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '../constants/error-codes.constants';

export interface AppExceptionOptions {
  code: ErrorCode;
  message: string;
  details?: unknown;
  statusCode?: number;
}

export class AppException extends HttpException {
  public readonly code: ErrorCode;
  public readonly details: unknown;

  constructor(options: AppExceptionOptions) {
    super(
      {
        code: options.code,
        message: options.message,
        details: options.details,
      },
      options.statusCode ?? HttpStatus.BAD_REQUEST,
    );
    this.code = options.code;
    this.details = options.details;
  }
}
