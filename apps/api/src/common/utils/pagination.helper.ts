import { APP_CONSTANTS } from '../constants/app.constants';

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PrismaSkipTake {
  skip: number;
  take: number;
}

export function toPrismaSkipTake(params: PaginationParams): PrismaSkipTake {
  const page = Math.max(1, params.page ?? APP_CONSTANTS.DEFAULT_PAGE);
  const pageSize = Math.min(
    APP_CONSTANTS.MAX_PAGE_SIZE,
    Math.max(
      APP_CONSTANTS.MIN_PAGE_SIZE,
      params.pageSize ?? APP_CONSTANTS.DEFAULT_PAGE_SIZE,
    ),
  );
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
