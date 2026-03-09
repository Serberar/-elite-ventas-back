/**
 * Sistema centralizado de manejo de errores
 * Proporciona clases de error personalizadas con códigos HTTP y mensajes consistentes
 */

/**
 * Clase base para errores de aplicación
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this);
  }
}

/**
 * Error de validación (400 Bad Request)
 */
export class ValidationError extends AppError {
  public readonly errors?: Array<{ field: string; message: string }>;

  constructor(
    message: string = 'Error de validación',
    errors?: Array<{ field: string; message: string }>
  ) {
    super(message, 400, true, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

/**
 * Error de autenticación (401 Unauthorized)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'No autenticado') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Error de autorización (403 Forbidden)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'No autorizado') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Error de recurso no encontrado (404 Not Found)
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Recurso', id?: string) {
    const message = id ? `${resource} con ID ${id} no encontrado` : `${resource} no encontrado`;
    super(message, 404, true, 'NOT_FOUND');
  }
}

/**
 * Error de conflicto (409 Conflict)
 * Usado para duplicados o violaciones de unicidad
 */
export class ConflictError extends AppError {
  constructor(message: string = 'El recurso ya existe') {
    super(message, 409, true, 'CONFLICT_ERROR');
  }
}

/**
 * Error de base de datos (500 Internal Server Error)
 */
export class DatabaseError extends AppError {
  public readonly originalError?: Error;

  constructor(message: string = 'Error de base de datos', originalError?: Error) {
    super(message, 500, true, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

/**
 * Error de servicio externo (502 Bad Gateway)
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(message || `Error en servicio externo: ${service}`, 502, true, 'EXTERNAL_SERVICE_ERROR');
  }
}

/**
 * Error de rate limit (429 Too Many Requests)
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Demasiadas peticiones') {
    super(message, 429, true, 'RATE_LIMIT_ERROR');
  }
}

/**
 * Error de tipo de contenido no soportado (415 Unsupported Media Type)
 */
export class UnsupportedMediaTypeError extends AppError {
  constructor(message: string = 'Tipo de contenido no soportado') {
    super(message, 415, true, 'UNSUPPORTED_MEDIA_TYPE');
  }
}

/**
 * Verifica si un error es operacional (esperado) o de programación (bug)
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Extrae información del error de forma segura
 */
export function getErrorInfo(error: unknown) {
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
