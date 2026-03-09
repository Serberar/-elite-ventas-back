"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterUserUseCase = void 0;
const User_1 = require("../../../domain/entities/User");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const logger_1 = __importDefault(require("../../../infrastructure/observability/logger/logger"));
const AppError_1 = require("../../shared/AppError");
class RegisterUserUseCase {
    userRepository;
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async execute(data) {
        logger_1.default.info(`Intentando registrar usuario: ${data.username}`);
        // Validar que no exista usuario con ese username
        const userByUsername = await this.userRepository.findByUsername(data.username);
        if (userByUsername) {
            logger_1.default.warn(`Intento de registro con username duplicado: ${data.username}`);
            throw new AppError_1.ConflictError('Nombre de usuario ya registrado');
        }
        // Hashear contraseña
        const hashedPassword = await bcryptjs_1.default.hash(data.password, 10);
        // Crear usuario
        const user = new User_1.User(crypto.randomUUID(), data.firstName, data.lastName, data.username, hashedPassword, data.role, null);
        await this.userRepository.create(user);
        logger_1.default.info(`Usuario registrado exitosamente: ${data.username} (${user.id})`);
        return user;
    }
}
exports.RegisterUserUseCase = RegisterUserUseCase;
