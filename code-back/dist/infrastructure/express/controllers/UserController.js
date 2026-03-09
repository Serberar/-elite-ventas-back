"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const ServiceContainer_1 = require("../../container/ServiceContainer");
const logger_1 = __importDefault(require("../../observability/logger/logger"));
const cookieAuth_1 = require("../../express/utils/cookieAuth");
const csrfMiddleware_1 = require("../../express/middleware/csrfMiddleware");
class UserController {
    static async register(req, res) {
        try {
            const userData = req.body;
            const user = await ServiceContainer_1.serviceContainer.registerUserUseCase.execute({
                firstName: userData.firstName,
                lastName: userData.lastName,
                username: userData.username,
                password: userData.password,
                role: userData.role,
            });
            res.status(201).json({ id: user.id, username: user.username });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al registrar usuario';
            res.status(400).json({ error: errorMessage });
        }
    }
    static async login(req, res) {
        try {
            const loginData = req.body;
            const { user, accessToken, refreshToken } = await ServiceContainer_1.serviceContainer.loginUserUseCase.execute({
                username: loginData.username,
                password: loginData.password,
            });
            // Preparar respuesta base
            const responseData = {
                id: user.id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            };
            // Si USE_COOKIE_AUTH está habilitado, enviar tokens como httpOnly cookies
            if ((0, cookieAuth_1.isCookieAuthEnabled)()) {
                (0, cookieAuth_1.setAuthCookies)(res, accessToken, refreshToken);
                // Generar y enviar CSRF token para protección
                const csrfToken = (0, csrfMiddleware_1.generateToken)(req, res);
                res.status(200).json({
                    ...responseData,
                    csrfToken, // El frontend debe enviar esto en header X-CSRF-Token
                });
            }
            else {
                // Modo tradicional: tokens en el cuerpo de la respuesta
                res.status(200).json({
                    ...responseData,
                    accessToken,
                    refreshToken,
                });
            }
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Usuario o contraseña incorrectos';
            res.status(401).json({ error: errorMessage });
        }
    }
    static async refresh(req, res) {
        try {
            let refreshTokenValue;
            // Si usamos cookies, obtener el refresh token de la cookie
            if ((0, cookieAuth_1.isCookieAuthEnabled)()) {
                refreshTokenValue = req.cookies?.[cookieAuth_1.COOKIE_NAMES.REFRESH_TOKEN];
            }
            else {
                // Modo tradicional: del body
                const refreshData = req.body;
                refreshTokenValue = refreshData.refreshToken;
            }
            if (!refreshTokenValue) {
                return res.status(401).json({ error: 'Refresh token no enviado' });
            }
            const { accessToken } = await ServiceContainer_1.serviceContainer.refreshTokenUseCase.execute(refreshTokenValue);
            // Si usamos cookies, actualizar la cookie del access token
            if ((0, cookieAuth_1.isCookieAuthEnabled)()) {
                (0, cookieAuth_1.setAccessTokenCookie)(res, accessToken);
                res.status(200).json({ message: 'Token actualizado' });
            }
            else {
                res.status(200).json({ accessToken });
            }
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Refresh token inválido';
            res.status(401).json({ error: errorMessage });
        }
    }
    static async logout(req, res) {
        try {
            logger_1.default.debug('Logout request headers', { headers: req.headers });
            logger_1.default.debug('Logout request body', { body: req.body });
            logger_1.default.debug('Logout request metadata', {
                contentType: req.get('Content-Type'),
                method: req.method,
                url: req.url,
            });
            let refreshTokenValue;
            // Obtener refresh token de cookie o body
            if ((0, cookieAuth_1.isCookieAuthEnabled)()) {
                refreshTokenValue = req.cookies?.[cookieAuth_1.COOKIE_NAMES.REFRESH_TOKEN];
            }
            else {
                const logoutData = req.body;
                refreshTokenValue = logoutData.refreshToken;
            }
            logger_1.default.debug('Logout data received', {
                hasRefreshToken: !!refreshTokenValue,
            });
            if (refreshTokenValue) {
                await ServiceContainer_1.serviceContainer.logoutUserUseCase.execute(refreshTokenValue);
            }
            // Limpiar cookies si están habilitadas
            if ((0, cookieAuth_1.isCookieAuthEnabled)()) {
                (0, cookieAuth_1.clearAuthCookies)(res);
            }
            logger_1.default.info('Logout successful');
            res.status(200).json({ message: 'Sesión cerrada' });
        }
        catch (error) {
            logger_1.default.error('Error during logout', { error });
            // Aún así limpiar cookies
            if ((0, cookieAuth_1.isCookieAuthEnabled)()) {
                (0, cookieAuth_1.clearAuthCookies)(res);
            }
            res.status(200).json({ message: 'Sesión cerrada' });
        }
    }
}
exports.UserController = UserController;
