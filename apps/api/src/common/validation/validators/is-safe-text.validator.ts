import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { INJECTION_PATTERNS } from '../input-security.constants';

export function containsInjectionPayload(value: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

@ValidatorConstraint({ name: 'isSafeText', async: false })
export class IsSafeTextConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value !== 'string') return false;
    return !containsInjectionPayload(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} contains invalid or unsafe characters`;
  }
}

export function IsSafeText(validationOptions?: ValidationOptions) {
  return function registerIsSafeText(object: object, propertyName: string) {
    registerDecorator({
      name: 'isSafeText',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsSafeTextConstraint,
    });
  };
}
