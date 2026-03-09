/**
 * Utilidades para autenticación via httpOnly cookies
 *
 * Estas funciones se usan cuando USE_COOKIE_AUTH=true
 */

import { Response, CookieOptions } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Nombres de cookies de autenticación
 * En producción usan prefijo __Host- para seguridad adicional
 */
export const COOKIE_NAMES = {
  ACCESS_TOKEN: isProduction ? '__Host-access_token' : 'access_token',
  REFRESH_TOKEN: isProduction ? '__Host-refresh_token' : 'refresh_token',
} as const;

/**
 * Opciones base para cookies de autenticación
 */
const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'strict' : 'lax',
  path: '/',
};

/**
 * Configura las cookies de autenticación en la respuesta
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
): void {
  // Access token: expira en 15 minutos
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutos
  });

  // Refresh token: expira en 7 días
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
    ...baseCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
  });
}

/**
 * Configura solo la cookie de access token (para refresh)
 */
export function setAccessTokenCookie(res: Response, accessToken: string): void {
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutos
  });
}

/**
 * Limpia las cookies de autenticación (logout)
 */
export function clearAuthCookies(res: Response): void {
  const clearOptions: CookieOptions = {
    ...baseCookieOptions,
    maxAge: 0,
  };

  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, '', clearOptions);
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, '', clearOptions);
}

/**
 * Verifica si la autenticación por cookies está habilitada
 */
export function isCookieAuthEnabled(): boolean {
  return process.env.USE_COOKIE_AUTH === 'true';
}
