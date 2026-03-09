"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginUserUseCase = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = __importDefault(require("../../../infrastructure/observability/logger/logger"));
const AppError_1 = require("../../shared/AppError");
class LoginUserUseCase {
    userRepository;
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async execute(data) {
        logger_1.default.info(`Intento de login: ${data.username}`);
        const user = await this.userRepository.findByUsername(data.username);
        if (!user) {
            logger_1.default.warn(`Login fallido - usuario no encontrado: ${data.username}`);
            throw new AppError_1.AuthenticationError('Usuario o contraseña incorrectos');
        }
        const passwordMatches = await bcryptjs_1.default.compare(data.password, user.password);
        if (!passwordMatches) {
            logger_1.default.warn(`Login fallido - contraseña incorrecta: ${data.username}`);
            throw new AppError_1.AuthenticationError('Usuario o contraseña incorrectos');
        }
        if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)
            throw new Error('JWT_SECRET o JWT_REFRESH_SECRET no están definidas');
        // Access token
        const accessToken = jsonwebtoken_1.default.sign({ id: user.id, role: user.role, firstName: user.firstName }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
        // Refresh token
        const refreshToken = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
        });
        const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await this.userRepository.saveRefreshToken(user.id, refreshToken, refreshTokenExpiresAt);
        await this.userRepository.updateLastLogin(user.id, new Date());
        // Registrar métricas de login exitoso
        logger_1.default.info(`Login exitoso: ${data.username} (${user.id})`);
        return { user, accessToken, refreshToken };
    }
}
exports.LoginUserUseCase = LoginUserUseCase;
