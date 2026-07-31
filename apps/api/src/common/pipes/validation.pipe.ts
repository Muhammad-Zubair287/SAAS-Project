import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { ERROR_CODES } from '../constants/error-codes.constants';

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const error of errors) {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      result[field] = Object.values(error.constraints);
    }

    if (error.children && error.children.length > 0) {
      const childErrors = flattenValidationErrors(error.children, field);
      Object.assign(result, childErrors);
    }
  }

  return result;
}

export const AppValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: false,
  },
  exceptionFactory: (errors: ValidationError[]) => {
    const formattedErrors = flattenValidationErrors(errors);
    return new BadRequestException({
      code: ERROR_CODES.VALIDATION_FAILED,
      message: 'Validation failed',
      details: formattedErrors,
    });
  },
});
