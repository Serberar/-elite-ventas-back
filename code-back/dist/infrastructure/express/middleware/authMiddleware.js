"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_COOKIE_NAME = void 0;
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * Nombre de la cookie de autenticación
 * En producción usa prefijo __Host- para mayor seguridad
 */
const AUTH_COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-access_token' : 'access_token';
exports.AUTH_COOKIE_NAME = AUTH_COOKIE_NAME;
/**
 * Obtiene el token JWT de la request
 * Soporta tanto Bearer token en header como httpOnly cookie
 */
function extractToken(req) {
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
function authMiddleware(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ error: 'Token no enviado' });
    }
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret)
            throw new Error('JWT_SECRET no definido');
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = decoded;
        next();
    }
    catch (_err) {
        void _err; // Explicitly use the variable to prevent linting warning
        return res.status(401).json({ error: 'Token inválido' });
    }
}
