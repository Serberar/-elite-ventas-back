"use strict";
/**
 * Middleware CSRF para protección contra ataques Cross-Site Request Forgery
 *
 * Este middleware se activa cuando JWT se transmite via httpOnly cookies.
 * Usa el patrón "Double Submit Cookie" con tokens sincronizados.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidCsrfTokenError = void 0;
exports.csrfTokenGenerator = csrfTokenGenerator;
exports.csrfProtection = csrfProtection;
exports.csrfTokenEndpoint = csrfTokenEndpoint;
exports.generateToken = generateToken;
const csrf_csrf_1 = require("csrf-csrf");
const logger_1 = __importDefault(require("../../observability/logger/logger"));
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'csrf-fallback-secret';
const isProduction = process.env.NODE_ENV === 'production';
// Configuración de csrf-csrf
const { generateCsrfToken, doubleCsrfProtection, invalidCsrfTokenError, } = (0, csrf_csrf_1.doubleCsrf)({
    getSecret: () => CSRF_SECRET,
    getSessionIdentifier: (req) => {
        // Usar IP + User-Agent como identificador de sesión
        // En producción, podrías usar un session ID real
        const ip = req.ip || req.socket?.remoteAddress || 'unknown';
        const ua = req.headers['user-agent'] || 'unknown';
        return `${ip}-${ua.substring(0, 50)}`;
    },
    cookieName: isProduction ? '__Host-csrf.token' : 'csrf.token',
    cookieOptions: {
        httpOnly: true,
        sameSite: isProduction ? 'strict' : 'lax',
        path: '/',
        secure: isProduction,
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getCsrfTokenFromRequest: (req) => {
        // Buscar token en header o body
        return req.headers['x-csrf-token'] || req.body?._csrf;
    },
});
exports.invalidCsrfTokenError = invalidCsrfTokenError;
/**
 * Middleware para generar y enviar token CSRF al cliente
 * Usar en rutas que renderizan formularios o al inicio de sesión
 */
function csrfTokenGenerator(req, res, next) {
    try {
        const token = generateCsrfToken(req, res);
        // Enviar token en header para SPA
        res.setHeader('X-CSRF-Token', token);
        next();
    }
    catch (error) {
        logger_1.default.error('Error generando CSRF token:', error);
        next(error);
    }
}
/**
 * Middleware de protección CSRF
 * Aplicar a rutas que modifican estado (POST, PUT, PATCH, DELETE)
 */
function csrfProtection(req, res, next) {
    // Solo aplicar si USE_COOKIE_AUTH está habilitado
    if (process.env.USE_COOKIE_AUTH !== 'true') {
        return next();
    }
    doubleCsrfProtection(req, res, (error) => {
        if (error === invalidCsrfTokenError) {
            logger_1.default.warn(`CSRF token inválido desde IP: ${req.ip}`);
            res.status(403).json({
                status: 'error',
                code: 'CSRF_INVALID',
                message: 'Token CSRF inválido o expirado',
            });
            return;
        }
        next(error);
    });
}
/**
 * Endpoint para obtener token CSRF (para SPAs)
 */
function csrfTokenEndpoint(req, res) {
    try {
        const token = generateCsrfToken(req, res);
        res.json({ csrfToken: token });
    }
    catch (error) {
        logger_1.default.error('Error en endpoint CSRF:', error);
        res.status(500).json({
            status: 'error',
            code: 'CSRF_ERROR',
            message: 'Error generando token CSRF',
        });
    }
}
/**
 * Genera un token CSRF para la sesión actual
 */
function generateToken(req, res) {
    return generateCsrfToken(req, res);
}
