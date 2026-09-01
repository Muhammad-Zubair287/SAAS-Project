import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes.constants';

interface EntitlementCatalogueRow {
  id: string;
  code: string;
  dataType: string;
}

export function coerceEntitlementValue(dataType: string, value: unknown): unknown {
  switch (dataType) {
    case 'BOOLEAN':
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === 1 || value === '1') return true;
      if (value === 'false' || value === 0 || value === '0') return false;
      throw invalidValue(dataType, value);
    case 'INTEGER': {
      const numeric = typeof value === 'number' ? value : Number(value);
      if (!Number.isInteger(numeric)) throw invalidValue(dataType, value);
      return numeric;
    }
    case 'DECIMAL': {
      const numeric = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(numeric)) throw invalidValue(dataType, value);
      return numeric;
    }
    case 'STRING':
      if (typeof value !== 'string') throw invalidValue(dataType, value);
      return value;
    default:
      throw new AppException({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: `Unsupported entitlement data type "${dataType}".`,
        statusCode: HttpStatus.BAD_REQUEST,
      });
  }
}

export function validatePlanEntitlementItems(
  items: Array<{ entitlementId: string; defaultValue: unknown }>,
  catalogue: EntitlementCatalogueRow[],
): Array<{ entitlementId: string; defaultValue: unknown }> {
  const byId = new Map(catalogue.map((row) => [row.id, row]));
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.entitlementId)) {
      throw new AppException({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: `Duplicate entitlement "${item.entitlementId}" in plan configuration.`,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    seen.add(item.entitlementId);

    const definition = byId.get(item.entitlementId);
    if (!definition) {
      throw new AppException({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: `Entitlement "${item.entitlementId}" is not in the active catalogue.`,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    item.defaultValue = coerceEntitlementValue(definition.dataType, item.defaultValue);
  }

  return items;
}

function invalidValue(dataType: string, value: unknown): AppException {
  return new AppException({
    code: ERROR_CODES.VALIDATION_FAILED,
    message: `Invalid ${dataType} entitlement value: ${String(value)}`,
    statusCode: HttpStatus.BAD_REQUEST,
  });
}
