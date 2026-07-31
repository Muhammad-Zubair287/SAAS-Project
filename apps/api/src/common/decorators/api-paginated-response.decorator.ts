import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

export const ApiPaginatedResponse = <TModel extends Type<unknown>>(
  model: TModel,
) =>
  applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      schema: {
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              meta: {
                type: 'object',
                properties: {
                  page: { type: 'number' },
                  pageSize: { type: 'number' },
                  total: { type: 'number' },
                  totalPages: { type: 'number' },
                  hasNextPage: { type: 'boolean' },
                  hasPreviousPage: { type: 'boolean' },
                },
              },
            },
          },
          correlationId: { type: 'string', format: 'uuid' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    }),
  );
