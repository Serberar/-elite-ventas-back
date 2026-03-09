/**
 * Tipos de paginación para el sistema
 */

/**
 * Opciones de paginación para consultas
 */
export interface PaginationOptions {
  /** Número de página (1-indexed) */
  page: number;
  /** Elementos por página */
  limit: number;
}

/**
 * Metadatos de paginación en respuestas
 */
export interface PaginationMeta {
  /** Página actual */
  page: number;
  /** Elementos por página */
  limit: number;
  /** Total de elementos */
  total: number;
  /** Total de páginas */
  totalPages: number;
  /** Si hay página anterior */
  hasPrevPage: boolean;
  /** Si hay página siguiente */
  hasNextPage: boolean;
}

/**
 * Respuesta paginada genérica
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Valores por defecto de paginación
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Parsea y valida opciones de paginación desde query params
 */
export function parsePaginationOptions(
  page?: string | number,
  limit?: string | number
): PaginationOptions {
  let parsedPage = typeof page === 'string' ? parseInt(page, 10) : page ?? DEFAULT_PAGE;
  let parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit ?? DEFAULT_LIMIT;

  // Validar valores
  if (isNaN(parsedPage) || parsedPage < 1) {
    parsedPage = DEFAULT_PAGE;
  }

  if (isNaN(parsedLimit) || parsedLimit < 1) {
    parsedLimit = DEFAULT_LIMIT;
  }

  // Limitar máximo
  if (parsedLimit > MAX_LIMIT) {
    parsedLimit = MAX_LIMIT;
  }

  return {
    page: parsedPage,
    limit: parsedLimit,
  };
}

/**
 * Calcula el offset para Prisma skip
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Construye los metadatos de paginación
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
  };
}
