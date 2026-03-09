import { Request, Response, NextFunction } from 'express';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: CurrentUser;
}

/**
 * Nombre de la cookie de autenticación
 * En producción usa prefijo __Host- para mayor seguridad
 */
const AUTH_COOKIE_NAME =
  process.env.NODE_ENV === 'production' ? '__Host-access_token' : 'access_token';

/**
 * Obtiene el token JWT de la request
 * Soporta tanto Bearer token en header como httpOnly cookie
 */
function extractToken(req: Request): string | null {
  // 1. Intentar obtener de cookie si USE_COOKIE_AUTH está habilitado
  if (process.env.USE_COOKIE_AUTH === 'true') {
    const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
    if (cookieToken) {
      return cookieToken;
    }
  }

  // 2. Fallback a Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
}

/**
 * Middleware de autenticación
 * Soporta JWT via Bearer token o httpOnly cookie
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Token no enviado' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET no definido');
    const decoded = jwt.verify(token, secret) as CurrentUser;
    req.user = decoded;
    next();
  } catch (_err) {
    void _err; // Explicitly use the variable to prevent linting warning
    return res.status(401).json({ error: 'Token inválido' });
  }
}

export { AUTH_COOKIE_NAME };
