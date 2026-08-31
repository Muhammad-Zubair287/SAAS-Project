/** Mirrors backend input-security.constants.ts for client-side validation. */

export const INJECTION_PATTERNS: RegExp[] = [
  /<[^>]*>/,
  /<\s*script\b/i,
  /javascript:/i,
  /data:text\/html/i,
  /vbscript:/i,
  /on\w+\s*=/i,
  /(\bUNION\b[\s\S]*\bSELECT\b)/i,
  /(\bDROP\b[\s\S]*\bTABLE\b)/i,
  /(\bINSERT\b[\s\S]*\bINTO\b)/i,
  /(\bUPDATE\b[\s\S]*\bSET\b)/i,
  /(\bDELETE\b[\s\S]*\bFROM\b)/i,
  /(\$\{|\$\()/,
  /(\|\||&&)/,
  /(\/\*|\*\/|--)/,
  /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/,
];

export const PERSON_NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*[\p{L}\p{M}.]?$|^[\p{L}\p{M}]$/u;
export const ORGANIZATION_NAME_PATTERN =
  /^[\p{L}\p{N}][\p{L}\p{N}\s&().,'\-/]*[\p{L}\p{N})]?$|^[\p{L}\p{N}]$/u;
export const INTERNATIONAL_PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
export const OTP_CODE_PATTERN = /^[0-9]{6,8}$/;
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const EMAIL_PATTERN =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function containsInjectionPayload(value: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

export function sanitizeTrimmed(value: string): string {
  return value.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

export function isNonEmptyTrimmed(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  return sanitizeTrimmed(value).length > 0;
}

export function filterPersonNameInput(raw: string): string {
  return raw
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[<>`"\\/]/g, '');
}

export function filterOrganizationNameInput(raw: string): string {
  return raw
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[<>`"\\]/g, '');
}

/** Phone: optional leading +, digits only. */
export function filterInternationalPhoneInput(raw: string): string {
  let result = '';
  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') result += ch;
    else if (ch === '+' && result.length === 0) result = '+';
  }
  return result.slice(0, 16);
}

/** OTP: digits only, max 8. */
export function filterOtpInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 8);
}

export function filterDigitsOnly(raw: string, maxLength = 10): string {
  return raw.replace(/\D/g, '').slice(0, maxLength);
}

export function isValidEmail(value: string): boolean {
  const normalized = sanitizeTrimmed(value).toLowerCase();
  if (!normalized || normalized.length > 254) return false;
  if (containsInjectionPayload(normalized)) return false;
  return EMAIL_PATTERN.test(normalized);
}

export function isValidPersonName(value: string): boolean {
  const trimmed = sanitizeTrimmed(value);
  if (trimmed.length < 2 || trimmed.length > 160) return false;
  if (containsInjectionPayload(trimmed)) return false;
  return PERSON_NAME_PATTERN.test(trimmed);
}

export function isValidOrganizationName(value: string): boolean {
  const trimmed = sanitizeTrimmed(value);
  if (trimmed.length < 2) return false;
  if (containsInjectionPayload(trimmed)) return false;
  return ORGANIZATION_NAME_PATTERN.test(trimmed);
}

export function isValidInternationalPhone(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = sanitizeTrimmed(value);
  if (!trimmed) return true;
  return INTERNATIONAL_PHONE_PATTERN.test(trimmed);
}

export function isValidOtpCode(value: string): boolean {
  const trimmed = sanitizeTrimmed(value);
  return OTP_CODE_PATTERN.test(trimmed);
}

export function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 1;
}
