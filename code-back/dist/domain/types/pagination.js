"use strict";
/**
 * Tipos de paginación para el sistema
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_LIMIT = exports.DEFAULT_LIMIT = exports.DEFAULT_PAGE = void 0;
exports.parsePaginationOptions = parsePaginationOptions;
exports.calculateOffset = calculateOffset;
exports.buildPaginationMeta = buildPaginationMeta;
/**
 * Valores por defecto de paginación
 */
exports.DEFAULT_PAGE = 1;
exports.DEFAULT_LIMIT = 20;
exports.MAX_LIMIT = 100;
/**
 * Parsea y valida opciones de paginación desde query params
 */
function parsePaginationOptions(page, limit) {
    let parsedPage = typeof page === 'string' ? parseInt(page, 10) : page ?? exports.DEFAULT_PAGE;
    let parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit ?? exports.DEFAULT_LIMIT;
    // Validar valores
    if (isNaN(parsedPage) || parsedPage < 1) {
        parsedPage = exports.DEFAULT_PAGE;
    }
    if (isNaN(parsedLimit) || parsedLimit < 1) {
        parsedLimit = exports.DEFAULT_LIMIT;
    }
    // Limitar máximo
    if (parsedLimit > exports.MAX_LIMIT) {
        parsedLimit = exports.MAX_LIMIT;
    }
    return {
        page: parsedPage,
        limit: parsedLimit,
    };
}
/**
 * Calcula el offset para Prisma skip
 */
function calculateOffset(page, limit) {
    return (page - 1) * limit;
}
/**
 * Construye los metadatos de paginación
 */
function buildPaginationMeta(page, limit, total) {
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
