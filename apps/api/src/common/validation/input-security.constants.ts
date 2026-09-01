/** Detects markup, script handlers, and common injection payloads in free text. */
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

/** Person name — letters, marks, spaces, apostrophe, hyphen, period. */
export const PERSON_NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*[\p{L}\p{M}.]?$|^[\p{L}\p{M}]$/u;

/** Organization / legal entity name — letters, digits, common business punctuation. */
export const ORGANIZATION_NAME_PATTERN =
  /^[\p{L}\p{N}][\p{L}\p{N}\s&().,'\-/]*[\p{L}\p{N})]?$|^[\p{L}\p{N}]$/u;

/** Optional international phone — optional leading +, digits only, 7–15 digits. */
export const INTERNATIONAL_PHONE_PATTERN = /^\+?[0-9]{7,15}$/;

/** MFA / OTP — digits only. */
export const OTP_CODE_PATTERN = /^[0-9]{6,8}$/;

export const PLAN_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Commercial plan catalogue code — lowercase alphanumeric with underscores/hyphens. */
export const PLAN_CODE_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
/** Entitlement catalogue code — snake_case feature/limit identifiers. */
export const ENTITLEMENT_CODE_PATTERN = /^[a-z][a-z0-9_]*$/;
export const HOSTING_REGION_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const LOCALE_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z0-9]+)*$/;
export const TIMEZONE_PATTERN = /^[A-Za-z0-9_+\-/]+$/;
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const ALLOWED_TENANT_SORT_FIELDS = [
  'displayName',
  'legalName',
  'createdAt',
  'status',
  'countryCode',
] as const;
