/**
 * Exportación de tipos del dominio
 */

export {
  type PaginationOptions,
  type PaginationMeta,
  type PaginatedResponse,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parsePaginationOptions,
  calculateOffset,
  buildPaginationMeta,
} from './pagination';
