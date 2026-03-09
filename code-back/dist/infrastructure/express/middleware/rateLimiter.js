"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRateLimiter = exports.authRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
/**
 * Rate limiter para endpoints de autenticación
 * Limita a 5 intentos por IP cada 15 minutos
 */
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 intentos por ventana
    message: {
        status: 'error',
        code: 'TOO_MANY_REQUESTS',
        message: 'Demasiados intentos de autenticación. Intente de nuevo en 15 minutos.',
    },
    standardHeaders: true, // Devuelve info de rate limit en headers `RateLimit-*`
    legacyHeaders: false, // Deshabilita headers `X-RateLimit-*`
    skipSuccessfulRequests: false, // Cuenta todos los requests
});
/**
 * Rate limiter general para API
 * Limita a 100 requests por IP cada minuto
 */
exports.apiRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minuto
    max: 100, // máximo 100 requests por ventana
    message: {
        status: 'error',
        code: 'TOO_MANY_REQUESTS',
        message: 'Demasiadas solicitudes. Intente de nuevo en un momento.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
