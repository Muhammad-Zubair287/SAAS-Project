import { TransformFnParams } from 'class-transformer';

function stripControlChars(value: string): string {
  return value.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

export function trimString({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;
  return stripControlChars(value).trim();
}

export function trimOptionalString({ value }: TransformFnParams): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') return value;
  const trimmed = stripControlChars(value).trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export function normalizeEmail({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;
  return stripControlChars(value).trim().toLowerCase();
}
