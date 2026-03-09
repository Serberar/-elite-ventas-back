"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const AppError_1 = require("../../../application/shared/AppError");
const logger_1 = __importDefault(require("../../observability/logger/logger"));
const resilience_1 = require("../../resilience");
/**
 * Middleware centralizado de manejo de errores
 * Captura todos los errores de la aplicación y los formatea de manera consistente
 */
const errorHandler = (error, req, res) => {
    // Logging del error
    const errorInfo = (0, AppError_1.getErrorInfo)(error);
    // Log con nivel apropiado
    if (errorInfo.statusCode >= 500) {
        logger_1.default.error(`Error ${errorInfo.statusCode}: ${errorInfo.message}`, {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userId: req.user?.id,
            stack: errorInfo.stack,
            code: errorInfo.code,
        });
    }
    else if (errorInfo.statusCode >= 400) {
        logger_1.default.warn(`Error ${errorInfo.statusCode}: ${errorInfo.message}`, {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userId: req.user?.id,
            code: errorInfo.code,
        });
    }
    // Manejo de Circuit Breaker abierto
    if (error instanceof resilience_1.CircuitOpenError) {
        logger_1.default.warn('Circuit Breaker abierto - servicio temporalmente no disponible', {
            method: req.method,
            url: req.url,
        });
        return res.status(503).json({
            status: 'error',
            code: 'SERVICE_UNAVAILABLE',
            message: 'Servicio temporalmente no disponible. Por favor, intente de nuevo en unos momentos.',
            retryAfter: 30, // Sugerir reintentar en 30 segundos
        });
    }
    // Manejo de errores específicos de Prisma
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        return handlePrismaError(error, req, res);
    }
    // Manejo de errores de validación Zod
    if (error instanceof zod_1.ZodError) {
        return handleZodError(error, req, res);
    }
    // Manejo de errores de aplicación
    if (error instanceof AppError_1.AppError) {
        return res.status(error.statusCode).json({
            status: 'error',
            code: error.code,
            message: error.message,
            ...(error instanceof AppError_1.ValidationError && error.errors ? { errors: error.errors } : {}),
            ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
        });
    }
    // Error genérico (no esperado)
    logger_1.default.error('Error no controlado:', error);
    return res.status(500).json({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
    });
};
exports.errorHandler = errorHandler;
/**
 * Maneja errores específicos de Prisma
 */
function handlePrismaError(error, req, res) {
    switch (error.code) {
        // Violación de restricción única
        case 'P2002': {
            const target = error.meta?.target || [];
            const field = target[0] || 'campo';
            logger_1.default.warn(`Violación de unicidad en ${field}`, {
                method: req.method,
                url: req.url,
                target,
            });
            return res.status(409).json({
                status: 'error',
                code: 'CONFLICT',
                message: `El ${field} ya está en uso`,
                field,
            });
        }
        // Registro no encontrado
        case 'P2025': {
            logger_1.default.warn('Registro no encontrado en operación de BD', {
                method: req.method,
                url: req.url,
            });
            return res.status(404).json({
                status: 'error',
                code: 'NOT_FOUND',
                message: 'Recurso no encontrado',
            });
        }
        // Violación de clave foránea
        case 'P2003': {
            logger_1.default.warn('Violación de clave foránea', {
                method: req.method,
                url: req.url,
                field: error.meta?.field_name,
            });
            return res.status(400).json({
                status: 'error',
                code: 'FOREIGN_KEY_VIOLATION',
                message: 'Referencia inválida a otro recurso',
            });
        }
        // Error de conexión a base de datos
        case 'P1001':
        case 'P1002':
        case 'P1008': {
            logger_1.default.error('Error de conexión a base de datos', {
                code: error.code,
                message: error.message,
            });
            return res.status(503).json({
                status: 'error',
                code: 'DATABASE_UNAVAILABLE',
                message: 'Base de datos no disponible temporalmente',
            });
        }
        // Timeout de operación
        case 'P2024': {
            logger_1.default.error('Timeout en operación de base de datos', {
                method: req.method,
                url: req.url,
            });
            return res.status(504).json({
                status: 'error',
                code: 'DATABASE_TIMEOUT',
                message: 'La operación tardó demasiado tiempo',
            });
        }
        default: {
            logger_1.default.error(`Error de Prisma no manejado: ${error.code}`, {
                code: error.code,
                message: error.message,
                meta: error.meta,
            });
            return res.status(500).json({
                status: 'error',
                code: 'DATABASE_ERROR',
                message: 'Error en la base de datos',
                ...(process.env.NODE_ENV === 'development' ? { details: error.message } : {}),
            });
        }
    }
}
/**
 * Maneja errores de validación Zod
 */
function handleZodError(error, req, res) {
    const formattedErrors = error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
    }));
    logger_1.default.warn('Error de validación Zod', {
        method: req.method,
        url: req.url,
        errors: formattedErrors,
    });
    return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Errores de validación',
        errors: formattedErrors,
    });
}
const asyncHandler = (fn) => {
    return (_req, _res, next) => {
        Promise.resolve(fn(_req, _res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
