"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const LogoutUserUseCase_1 = require("../../../application/use-cases/user/LogoutUserUseCase");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
jest.mock('jsonwebtoken');
describe('LogoutUserUseCase', () => {
    let useCase;
    let mockRepository;
    // Configurar variables de entorno
    const originalEnv = process.env;
    beforeAll(() => {
        process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    });
    afterAll(() => {
        process.env = originalEnv;
    });
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
        useCase = new LogoutUserUseCase_1.LogoutUserUseCase(mockRepository);
        jest.clearAllMocks();
    });
    it('debería hacer logout exitosamente con refresh token válido', async () => {
        const refreshToken = 'valid-refresh-token';
        const payload = { id: 'user-1' };
        jsonwebtoken_1.default.verify.mockReturnValue(payload);
        mockRepository.clearRefreshToken.mockResolvedValue(undefined);
        await useCase.execute(refreshToken);
        expect(jsonwebtoken_1.default.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
        expect(mockRepository.clearRefreshToken).toHaveBeenCalledWith('user-1');
    });
    it('debería manejar refresh token vacío sin error', async () => {
        await useCase.execute('');
        expect(jsonwebtoken_1.default.verify).not.toHaveBeenCalled();
        expect(mockRepository.clearRefreshToken).not.toHaveBeenCalled();
    });
    it('debería manejar refresh token null sin error', async () => {
        await useCase.execute(null);
        expect(jsonwebtoken_1.default.verify).not.toHaveBeenCalled();
        expect(mockRepository.clearRefreshToken).not.toHaveBeenCalled();
    });
    it('debería manejar refresh token undefined sin error', async () => {
        await useCase.execute(undefined);
        expect(jsonwebtoken_1.default.verify).not.toHaveBeenCalled();
        expect(mockRepository.clearRefreshToken).not.toHaveBeenCalled();
    });
    it('debería ignorar errores de JWT verification silenciosamente', async () => {
        const refreshToken = 'invalid-refresh-token';
        jsonwebtoken_1.default.verify.mockImplementation(() => {
            throw new Error('JsonWebTokenError');
        });
        // No debería lanzar error
        await expect(useCase.execute(refreshToken)).resolves.not.toThrow();
        expect(jsonwebtoken_1.default.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
        expect(mockRepository.clearRefreshToken).not.toHaveBeenCalled();
    });
    it('debería ignorar errores de token expirado silenciosamente', async () => {
        const refreshToken = 'expired-refresh-token';
        jsonwebtoken_1.default.verify.mockImplementation(() => {
            const error = new Error('TokenExpiredError');
            error.name = 'TokenExpiredError';
            throw error;
        });
        // No debería lanzar error
        await expect(useCase.execute(refreshToken)).resolves.not.toThrow();
        expect(jsonwebtoken_1.default.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
        expect(mockRepository.clearRefreshToken).not.toHaveBeenCalled();
    });
    it('debería ignorar errores del repositorio silenciosamente', async () => {
        const refreshToken = 'valid-refresh-token';
        const payload = { id: 'user-1' };
        jsonwebtoken_1.default.verify.mockReturnValue(payload);
        mockRepository.clearRefreshToken.mockRejectedValue(new Error('Database error'));
        // No debería lanzar error
        await expect(useCase.execute(refreshToken)).resolves.not.toThrow();
        expect(jsonwebtoken_1.default.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
        expect(mockRepository.clearRefreshToken).toHaveBeenCalledWith('user-1');
    });
    it('debería funcionar con diferentes IDs de usuario', async () => {
        const refreshToken = 'another-refresh-token';
        const payload = { id: 'user-123' };
        jsonwebtoken_1.default.verify.mockReturnValue(payload);
        mockRepository.clearRefreshToken.mockResolvedValue(undefined);
        await useCase.execute(refreshToken);
        expect(jsonwebtoken_1.default.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
        expect(mockRepository.clearRefreshToken).toHaveBeenCalledWith('user-123');
    });
    it('debería manejar payloads con propiedades adicionales', async () => {
        const refreshToken = 'refresh-token-with-extra-data';
        const payload = {
            id: 'user-1',
            role: 'administrador',
            firstName: 'Juan',
            iat: 1234567890,
            exp: 1234567890 + 3600,
        };
        jsonwebtoken_1.default.verify.mockReturnValue(payload);
        mockRepository.clearRefreshToken.mockResolvedValue(undefined);
        await useCase.execute(refreshToken);
        expect(jsonwebtoken_1.default.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
        expect(mockRepository.clearRefreshToken).toHaveBeenCalledWith('user-1');
    });
});
