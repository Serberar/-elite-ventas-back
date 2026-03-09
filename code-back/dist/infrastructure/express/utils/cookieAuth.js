"use strict";
/**
 * Utilidades para autenticación via httpOnly cookies
 *
 * Estas funciones se usan cuando USE_COOKIE_AUTH=true
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COOKIE_NAMES = void 0;
exports.setAuthCookies = setAuthCookies;
exports.setAccessTokenCookie = setAccessTokenCookie;
exports.clearAuthCookies = clearAuthCookies;
exports.isCookieAuthEnabled = isCookieAuthEnabled;
const isProduction = process.env.NODE_ENV === 'production';
/**
 * Nombres de cookies de autenticación
 * En producción usan prefijo __Host- para seguridad adicional
 */
exports.COOKIE_NAMES = {
    ACCESS_TOKEN: isProduction ? '__Host-access_token' : 'access_token',
    REFRESH_TOKEN: isProduction ? '__Host-refresh_token' : 'refresh_token',
};
/**
 * Opciones base para cookies de autenticación
 */
const baseCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
};
/**
 * Configura las cookies de autenticación en la respuesta
 */
function setAuthCookies(res, accessToken, refreshToken) {
    // Access token: expira en 15 minutos
    res.cookie(exports.COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
        ...baseCookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutos
    });
    // Refresh token: expira en 7 días
    res.cookie(exports.COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
        ...baseCookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });
}
/**
 * Configura solo la cookie de access token (para refresh)
 */
function setAccessTokenCookie(res, accessToken) {
    res.cookie(exports.COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
        ...baseCookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutos
    });
}
/**
 * Limpia las cookies de autenticación (logout)
 */
function clearAuthCookies(res) {
    const clearOptions = {
        ...baseCookieOptions,
        maxAge: 0,
    };
    res.cookie(exports.COOKIE_NAMES.ACCESS_TOKEN, '', clearOptions);
    res.cookie(exports.COOKIE_NAMES.REFRESH_TOKEN, '', clearOptions);
}
/**
 * Verifica si la autenticación por cookies está habilitada
 */
function isCookieAuthEnabled() {
    return process.env.USE_COOKIE_AUTH === 'true';
}
