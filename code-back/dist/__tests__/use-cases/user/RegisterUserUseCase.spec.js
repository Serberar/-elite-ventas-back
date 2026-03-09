"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const RegisterUserUseCase_1 = require("../../../application/use-cases/user/RegisterUserUseCase");
const User_1 = require("../../../domain/entities/User");
const AppError_1 = require("../../../application/shared/AppError");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const logger_1 = __importDefault(require("../../../infrastructure/observability/logger/logger"));
jest.mock('bcryptjs');
jest.mock('@infrastructure/observability/logger/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
}));
// Mock crypto.randomUUID globalmente
const mockUUID = jest.fn(() => 'generated-uuid');
Object.defineProperty(global, 'crypto', {
    value: { randomUUID: mockUUID },
    writable: true,
});
describe('RegisterUserUseCase', () => {
    let useCase;
    let mockRepository;
    beforeEach(() => {
        mockRepository = {
            create: jest.fn(),
            update: jest.fn(),
            updateLastLogin: jest.fn(),
            findByUsername: jest.fn(),
            findById: jest.fn(),
            saveRefreshToken: jest.fn(),
            findByRefreshToken: jest.fn(),
            clearRefreshToken: jest.fn(),
        };
        useCase = new RegisterUserUseCase_1.RegisterUserUseCase(mockRepository);
        jest.clearAllMocks();
    });
    it('debería registrar un usuario exitosamente', async () => {
        const userData = {
            firstName: 'Juan',
            lastName: 'Pérez',
            username: 'juan123',
            password: 'password123',
            role: 'comercial',
        };
        mockRepository.findByUsername.mockResolvedValue(null);
        bcryptjs_1.default.hash.mockResolvedValue('hashed-password');
        mockRepository.create.mockResolvedValue(undefined);
        const result = await useCase.execute(userData);
        expect(mockRepository.findByUsername).toHaveBeenCalledWith('juan123');
        expect(bcryptjs_1.default.hash).toHaveBeenCalledWith('password123', 10);
        expect(mockRepository.create).toHaveBeenCalledWith(expect.any(User_1.User));
        const createdUser = mockRepository.create.mock.calls[0][0];
        expect(createdUser.id).toBe('generated-uuid');
        expect(createdUser.firstName).toBe('Juan');
        expect(createdUser.lastName).toBe('Pérez');
        expect(createdUser.username).toBe('juan123');
        expect(createdUser.password).toBe('hashed-password');
        expect(createdUser.role).toBe('comercial');
        expect(createdUser.lastLoginAt).toBeNull();
        expect(result).toBeInstanceOf(User_1.User);
        expect(result.username).toBe('juan123');
        expect(result.role).toBe('comercial');
        expect(logger_1.default.info).toHaveBeenCalledWith('Intentando registrar usuario: juan123');
        expect(logger_1.default.info).toHaveBeenCalledWith('Usuario registrado exitosamente: juan123 (generated-uuid)');
    });
    it('debería registrar un usuario administrador', async () => {
        const userData = {
            firstName: 'Admin',
            lastName: 'User',
            username: 'admin',
            password: 'adminpass',
            role: 'administrador',
        };
        mockRepository.findByUsername.mockResolvedValue(null);
        bcryptjs_1.default.hash.mockResolvedValue('hashed-admin-password');
        mockRepository.create.mockResolvedValue(undefined);
        const result = await useCase.execute(userData);
        expect(result.role).toBe('administrador');
        expect(result.firstName).toBe('Admin');
        expect(result.lastName).toBe('User');
        expect(result.username).toBe('admin');
    });
    it('debería lanzar ConflictError cuando el username ya existe', async () => {
        const userData = {
            firstName: 'Juan',
            lastName: 'Pérez',
            username: 'existing-user',
            password: 'password123',
            role: 'comercial',
        };
        const existingUser = new User_1.User('existing-id', 'Existing', 'User', 'existing-user', 'hashed-password', 'comercial', null);
        mockRepository.findByUsername.mockResolvedValue(existingUser);
        await expect(useCase.execute(userData)).rejects.toThrow(AppError_1.ConflictError);
        await expect(useCase.execute(userData)).rejects.toThrow('Nombre de usuario ya registrado');
        expect(mockRepository.findByUsername).toHaveBeenCalledWith('existing-user');
        expect(bcryptjs_1.default.hash).not.toHaveBeenCalled();
        expect(mockRepository.create).not.toHaveBeenCalled();
        expect(logger_1.default.warn).toHaveBeenCalledWith('Intento de registro con username duplicado: existing-user');
    });
    it('debería manejar errores del hash de password', async () => {
        const userData = {
            firstName: 'Juan',
            lastName: 'Pérez',
            username: 'juan123',
            password: 'password123',
            role: 'comercial',
        };
        mockRepository.findByUsername.mockResolvedValue(null);
        bcryptjs_1.default.hash.mockRejectedValue(new Error('Hash error'));
        await expect(useCase.execute(userData)).rejects.toThrow('Hash error');
        expect(mockRepository.findByUsername).toHaveBeenCalledWith('juan123');
        expect(bcryptjs_1.default.hash).toHaveBeenCalledWith('password123', 10);
        expect(mockRepository.create).not.toHaveBeenCalled();
    });
    it('debería manejar errores del repositorio en la creación', async () => {
        const userData = {
            firstName: 'Juan',
            lastName: 'Pérez',
            username: 'juan123',
            password: 'password123',
            role: 'comercial',
        };
        mockRepository.findByUsername.mockResolvedValue(null);
        bcryptjs_1.default.hash.mockResolvedValue('hashed-password');
        mockRepository.create.mockRejectedValue(new Error('Database error'));
        await expect(useCase.execute(userData)).rejects.toThrow('Database error');
        expect(mockRepository.findByUsername).toHaveBeenCalledWith('juan123');
        expect(bcryptjs_1.default.hash).toHaveBeenCalledWith('password123', 10);
        expect(mockRepository.create).toHaveBeenCalledWith(expect.any(User_1.User));
    });
    it('debería manejar errores del repositorio en la consulta', async () => {
        const userData = {
            firstName: 'Juan',
            lastName: 'Pérez',
            username: 'juan123',
            password: 'password123',
            role: 'comercial',
        };
        mockRepository.findByUsername.mockRejectedValue(new Error('Database query error'));
        await expect(useCase.execute(userData)).rejects.toThrow('Database query error');
        expect(mockRepository.findByUsername).toHaveBeenCalledWith('juan123');
        expect(bcryptjs_1.default.hash).not.toHaveBeenCalled();
        expect(mockRepository.create).not.toHaveBeenCalled();
    });
});
