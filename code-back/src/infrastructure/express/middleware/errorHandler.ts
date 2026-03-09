import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError, ValidationError, getErrorInfo } from '@application/shared/AppError';
import logger from '@infrastructure/observability/logger/logger';
import { CircuitOpenError } from '@infrastructure/resilience';

/**
 * Middleware centralizado de manejo de errores
 * Captura todos los errores de la aplicación y los formatea de manera consistente
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (error: Error | AppError, req: Request, res: Response, _next: NextFunction) => {
  // Logging del error
  const errorInfo = getErrorInfo(error);

  // Log con nivel apropiado
  if (errorInfo.statusCode >= 500) {
    logger.error(`Error ${errorInfo.statusCode}: ${errorInfo.message}`, {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userId: (req as Request & { user?: { id?: string } }).user?.id,
      stack: errorInfo.stack,
      code: errorInfo.code,
    });
  } else if (errorInfo.statusCode >= 400) {
    logger.warn(`Error ${errorInfo.statusCode}: ${errorInfo.message}`, {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userId: (req as Request & { user?: { id?: string } }).user?.id,
      code: errorInfo.code,
    });
  }

  // Manejo de Circuit Breaker abierto
  if (error instanceof CircuitOpenError) {
    logger.warn('Circuit Breaker abierto - servicio temporalmente no disponible', {
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
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error, req, res);
  }

  // Manejo de errores de validación Zod
  if (error instanceof ZodError) {
    return handleZodError(error, req, res);
  }

  // Manejo de errores de aplicación
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      status: 'error',
      code: error.code,
      message: error.message,
      ...(error instanceof ValidationError && error.errors ? { errors: error.errors } : {}),
      ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
    });
  }

  // Error genérico (no esperado)
  logger.error('Error no controlado:', error);

  return res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
  });
};

/**
 * Maneja errores específicos de Prisma
 */
function handlePrismaError(
  error: Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response
) {
  switch (error.code) {
    // Violación de restricción única
    case 'P2002': {
      const target = (error.meta?.target as string[]) || [];
      const field = target[0] || 'campo';

      logger.warn(`Violación de unicidad en ${field}`, {
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
      logger.warn('Registro no encontrado en operación de BD', {
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
      logger.warn('Violación de clave foránea', {
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
      logger.error('Error de conexión a base de datos', {
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
      logger.error('Timeout en operación de base de datos', {
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
      logger.error(`Error de Prisma no manejado: ${error.code}`, {
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
function handleZodError(error: ZodError, req: Request, res: Response) {
  const formattedErrors = error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

  logger.warn('Error de validación Zod', {
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

/**
 * Middleware para capturar errores asíncronos
 * Envuelve funciones async para que los errores sean capturados por errorHandler
 */
// eslint-disable-next-line no-unused-vars
type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const asyncHandler = (fn: AsyncRequestHandler) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    Promise.resolve(fn(_req, _res, next)).catch(next);
  };
};
