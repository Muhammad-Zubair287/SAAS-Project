import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ERROR_CODES } from '../constants/error-codes.constants';
import { AppException } from '../exceptions/app.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId =
      (request.headers['x-correlation-id'] as string | undefined) ?? 'unknown';
    const timestamp = new Date().toISOString();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ERROR_CODES.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let details: unknown;

    if (exception instanceof AppException) {
      statusCode = exception.getStatus();
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        code = (resp['code'] as string | undefined) ?? ERROR_CODES.BAD_REQUEST;
        const rawMessage = resp['message'];
        message =
          typeof rawMessage === 'string'
            ? rawMessage
            : Array.isArray(rawMessage)
              ? (rawMessage as string[]).join(', ')
              : exception.message;
        details = resp['details'];
      } else {
        message = exception.message;
        code = ERROR_CODES.BAD_REQUEST;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        { correlationId, stack: exception.stack },
        `Unhandled exception: ${exception.message}`,
      );
    }

    if (statusCode >= 500) {
      this.logger.error(
        { correlationId, statusCode, code, url: request.url, method: request.method },
        message,
      );
    } else if (statusCode >= 400) {
      this.logger.warn(
        { correlationId, statusCode, code, url: request.url },
        message,
      );
    }

    response.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
      correlationId,
      timestamp,
    });
  }
}
