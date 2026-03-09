"use strict";
/**
 * Sistema centralizado de manejo de errores
 * Proporciona clases de error personalizadas con códigos HTTP y mensajes consistentes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnsupportedMediaTypeError = exports.RateLimitError = exports.ExternalServiceError = exports.DatabaseError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
exports.isOperationalError = isOperationalError;
exports.getErrorInfo = getErrorInfo;
/**
 * Clase base para errores de aplicación
 */
class AppError extends Error {
    statusCode;
    isOperational;
    code;
    constructor(message, statusCode = 500, isOperational = true, code) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;
        Error.captureStackTrace(this);
    }
}
exports.AppError = AppError;
/**
 * Error de validación (400 Bad Request)
 */
class ValidationError extends AppError {
    errors;
    constructor(message = 'Error de validación', errors) {
        super(message, 400, true, 'VALIDATION_ERROR');
        this.errors = errors;
    }
}
exports.ValidationError = ValidationError;
/**
 * Error de autenticación (401 Unauthorized)
 */
class AuthenticationError extends AppError {
    constructor(message = 'No autenticado') {
        super(message, 401, true, 'AUTHENTICATION_ERROR');
    }
}
exports.AuthenticationError = AuthenticationError;
/**
 * Error de autorización (403 Forbidden)
 */
class AuthorizationError extends AppError {
    constructor(message = 'No autorizado') {
        super(message, 403, true, 'AUTHORIZATION_ERROR');
    }
}
exports.AuthorizationError = AuthorizationError;
/**
 * Error de recurso no encontrado (404 Not Found)
 */
class NotFoundError extends AppError {
    constructor(resource = 'Recurso', id) {
        const message = id ? `${resource} con ID ${id} no encontrado` : `${resource} no encontrado`;
        super(message, 404, true, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Error de conflicto (409 Conflict)
 * Usado para duplicados o violaciones de unicidad
 */
class ConflictError extends AppError {
    constructor(message = 'El recurso ya existe') {
        super(message, 409, true, 'CONFLICT_ERROR');
    }
}
exports.ConflictError = ConflictError;
/**
 * Error de base de datos (500 Internal Server Error)
 */
class DatabaseError extends AppError {
    originalError;
    constructor(message = 'Error de base de datos', originalError) {
        super(message, 500, true, 'DATABASE_ERROR');
        this.originalError = originalError;
    }
}
exports.DatabaseError = DatabaseError;
/**
 * Error de servicio externo (502 Bad Gateway)
 */
class ExternalServiceError extends AppError {
    constructor(service, message) {
        super(message || `Error en servicio externo: ${service}`, 502, true, 'EXTERNAL_SERVICE_ERROR');
    }
}
exports.ExternalServiceError = ExternalServiceError;
/**
 * Error de rate limit (429 Too Many Requests)
 */
class RateLimitError extends AppError {
    constructor(message = 'Demasiadas peticiones') {
        super(message, 429, true, 'RATE_LIMIT_ERROR');
    }
}
exports.RateLimitError = RateLimitError;
/**
 * Error de tipo de contenido no soportado (415 Unsupported Media Type)
 */
class UnsupportedMediaTypeError extends AppError {
    constructor(message = 'Tipo de contenido no soportado') {
        super(message, 415, true, 'UNSUPPORTED_MEDIA_TYPE');
    }
}
exports.UnsupportedMediaTypeError = UnsupportedMediaTypeError;
/**
 * Verifica si un error es operacional (esperado) o de programación (bug)
 */
function isOperationalError(error) {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
}
/**
 * Extrae información del error de forma segura
 */
function getErrorInfo(error) {
    if (error instanceof AppError) {
        return {
            message: error.message,
            statusCode: error.statusCode,
            code: error.code,
            isOperational: error.isOperational,
            stack: error.stack,
        };
    }
    if (error instanceof Error) {
        return {
            message: error.message,
            statusCode: 500,
            code: 'INTERNAL_ERROR',
            isOperational: false,
            stack: error.stack,
        };
    }
    return {
        message: 'Error desconocido',
        statusCode: 500,
        code: 'UNKNOWN_ERROR',
        isOperational: false,
        stack: undefined,
    };
}
