"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const RefreshTokenUseCase_1 = require("../../../application/use-cases/user/RefreshTokenUseCase");
const User_1 = require("../../../domain/entities/User");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
jest.mock('jsonwebtoken');
describe('RefreshTokenUseCase', () => {
    let useCase;
    let mockRepository;
    let mockUser;
    // Configurar variables de entorno
    const originalEnv = process.env;
    beforeAll(() => {
        process.env.JWT_SECRET = 'test-secret';
        process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
        process.env.JWT_EXPIRES_IN = '15m';
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
        mockUser = new User_1.User('user-1', 'Juan', 'Pérez', 'juan123', 'hashed-password', 'administrador', new Date(), 'valid-refresh-token', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
        useCase = new RefreshTokenUseCase_1.RefreshTokenUseCase(mockRepository);
        jest.clearAllMocks();
    });
    it('debería generar un nuevo access token con refresh token válido', async () => {
        const refreshToken = 'valid-refresh-token';
        const payload = { id: 'user-1', role: 'administrador', firstName: 'Juan' };
        jsonwebtoken_1.default.verify.mockReturnValue(payload);
        mockRepository.findById.mockResolvedValue(mockUser);
        jsonwebtoken_1.default.sign.mockReturnValue('new-access-token');
        const result = await useCase.execute(refreshToken);
        expect(jsonwebtoken_1.default.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
        expect(mockRepository.findById).toHaveBeenCalledWith('user-1');
        expect(jsonwebtoken_1.default.sign).toHaveBeenCalledWith({ id: 'user-1', role: 'administrador', firstName: 'Juan' }, 'test-secret', { expiresIn: '15m' });
        expect(result).toEqual({
            accessToken: 'new-access-token',
            user: mockUser,
        });
    });
    it('debería lanzar error cuando JWT_SECRET no está definido', async () => {
        process.env.JWT_SECRET = '';
        await expect(useCase.execute('valid-refresh-token')).rejects.toThrow('JWT_SECRET o JWT_REFRESH_SECRET no definido');
        expect(jsonwebtoken_1.default.verify).not.toHaveBeenCalled();
        expect(mockRepository.findById).not.toHaveBeenCalled();
        // Restaurar para otros tests
        process.env.JWT_SECRET = 'test-secret';
    });
    it('debería lanzar error cuando JWT_REFRESH_SECRET no está definido', async () => {
        process.env.JWT_REFRESH_SECRET = '';
        await expect(useCase.execute('valid-refresh-token')).rejects.toThrow('JWT_SECRET o JWT_REFRESH_SECRET no definido');
        expect(jsonwebtoken_1.default.verify).not.toHaveBeenCalled();
        expect(mockRepository.findById).not.toHaveBeenCalled();
        // Restaurar para otros tests
        process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    });
    it('debería lanzar error cuando el usuario no existe', async () => {
        const refreshToken = 'valid-refresh-token';
        const payload = { id: 'nonexistent-user', role: 'comercial', firstName: 'Test' };
        jsonwebtoken_1.default.verify.mockReturnValue(payload);
        mockRepository.findById.mockResolvedValue(null);
        await expect(useCase.execute(refreshToken)).rejects.toThrow('Token inválido');
        expect(jsonwebtoken_1.default.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
        expect(mockRepository.findById).toHaveBeenCalledWith('nonexistent-user');
        expect(jsonwebtoken_1.default.sign).not.toHaveBeenCalled();
    });
    it('debería lanzar error cuando el refresh token no coincide', async () => {
        const refreshToken = 'different-refresh-token';
        const payload = { id: 'user-1', role: 'administrador', firstName: 'Juan' };
        jsonwebtoken_1.default.verify.mockReturnValue(payload);
        mockRepository.findById.mockResolvedValue(mockUser); // tiene 'valid-refresh-token'
        await expect(useCase.execute(refreshToken)).rejects.toThrow('Token inválido');
        expect(jsonwebtoken_1.default.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
        expect(mockRepository.findById).toHaveBeenCalledWith('user-1');
        expect(jsonwebtoken_1.default.sign).not.toHaveBeenCalled();
    });
    it('debería lanzar error cuando el refresh token es inválido o expirado', async () => {
        const refreshToken = 'invalid-refresh-token';
        jsonwebtoken_1.default.verify.mockImplementation(() => {
            throw new Error('JsonWebTokenError');
        });
        await expect(useCase.execute(refreshToken)).rejects.toThrow('Refresh token inválido o expirado');
        expect(jsonwebtoken_1.default.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(jsonwebtoken_1.default.sign).not.toHaveBeenCalled();
    });
    it('debería lanzar error cuando jwt.verify lanza TokenExpiredError', async () => {
        const refreshToken = 'expired-refresh-token';
        jsonwebtoken_1.default.verify.mockImplementation(() => {
            const error = new Error('TokenExpiredError');
            error.name = 'TokenExpiredError';
            throw error;
        });
        await expect(useCase.execute(refreshToken)).rejects.toThrow('Refresh token inválido o expirado');
        expect(jsonwebtoken_1.default.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(jsonwebtoken_1.default.sign).not.toHaveBeenCalled();
    });
    it('debería manejar errores del repositorio', async () => {
        const refreshToken = 'valid-refresh-token';
        const payload = { id: 'user-1', role: 'administrador', firstName: 'Juan' };
        jsonwebtoken_1.default.verify.mockReturnValue(payload);
        mockRepository.findById.mockRejectedValue(new Error('Database error'));
        // Los errores del repositorio se capturan y se re-lanzan como "Refresh token inválido o expirado"
        await expect(useCase.execute(refreshToken)).rejects.toThrow('Refresh token inválido o expirado');
        expect(jsonwebtoken_1.default.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
        expect(mockRepository.findById).toHaveBeenCalledWith('user-1');
        expect(jsonwebtoken_1.default.sign).not.toHaveBeenCalled();
    });
    it('debería funcionar con diferentes roles de usuario', async () => {
        const mockComercialUser = new User_1.User('user-2', 'Ana', 'García', 'ana123', 'hashed-password', 'comercial', new Date(), 'comercial-refresh-token', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
        const refreshToken = 'comercial-refresh-token';
        const payload = { id: 'user-2', role: 'comercial', firstName: 'Ana' };
        jsonwebtoken_1.default.verify.mockReturnValue(payload);
        mockRepository.findById.mockResolvedValue(mockComercialUser);
        jsonwebtoken_1.default.sign.mockReturnValue('comercial-access-token');
        const result = await useCase.execute(refreshToken);
        expect(result).toEqual({
            accessToken: 'comercial-access-token',
            user: mockComercialUser,
        });
        expect(jsonwebtoken_1.default.sign).toHaveBeenCalledWith({ id: 'user-2', role: 'comercial', firstName: 'Ana' }, 'test-secret', { expiresIn: '15m' });
    });
});
