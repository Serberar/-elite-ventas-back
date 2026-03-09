import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';

// Variable de entorno para deshabilitar rate limit de login
const DISABLE_AUTH_RATE_LIMIT = process.env.DISABLE_AUTH_RATE_LIMIT === 'true';

/**
 * Rate limiter para endpoints de autenticación
 * Limita a 5 intentos por usuario (username) cada 15 minutos.
 * Si no hay username en el body (logout, refresh…) usa la IP como fallback.
 * Se puede deshabilitar con DISABLE_AUTH_RATE_LIMIT=true
 */
const authRateLimiterMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos por ventana
  keyGenerator: (req) => {
    const username = req.body?.username;
    return typeof username === 'string' && username.length > 0
      ? `user:${username.toLowerCase().trim()}`
      : `ip:${ipKeyGenerator(req.ip ?? '')}`;

  },
  validate: { trustProxy: false },
  message: {
    status: 'error',
    code: 'TOO_MANY_REQUESTS',
    message: 'Demasiados intentos de autenticación. Intente de nuevo en 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Si está deshabilitado, devuelve un middleware que no hace nada
export const authRateLimiter = DISABLE_AUTH_RATE_LIMIT
  ? (_req: Request, _res: Response, next: NextFunction) => next()
  : authRateLimiterMiddleware;

/**
 * Rate limiter general para API
 * Limita a 100 requests por IP cada minuto
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // máximo 100 requests por ventana
  validate: { trustProxy: false },
  message: {
    status: 'error',
    code: 'TOO_MANY_REQUESTS',
    message: 'Demasiadas solicitudes. Intente de nuevo en un momento.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
