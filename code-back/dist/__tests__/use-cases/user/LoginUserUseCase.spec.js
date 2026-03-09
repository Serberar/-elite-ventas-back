"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const LoginUserUseCase_1 = require("../../../application/use-cases/user/LoginUserUseCase");
const User_1 = require("../../../domain/entities/User");
const AppError_1 = require("../../../application/shared/AppError");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('@infrastructure/observability/logger/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));
describe('LoginUserUseCase', () => {
    let loginUserUseCase;
    let mockUserRepository;
    const mockUser = new User_1.User('123', 'Test', 'User', 'testuser', '$2a$10$hashedpassword', 'administrador', null, undefined, undefined);
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        // Setup mock repository
        mockUserRepository = {
            findByUsername: jest.fn(),
            saveRefreshToken: jest.fn(),
            updateLastLogin: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
            findByRefreshToken: jest.fn(),
            clearRefreshToken: jest.fn(),
            update: jest.fn(),
        };
        // Setup environment variables
        process.env.JWT_SECRET = 'test-secret';
        process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
        process.env.JWT_EXPIRES_IN = '15m';
        process.env.JWT_REFRESH_EXPIRES_IN = '7d';
        loginUserUseCase = new LoginUserUseCase_1.LoginUserUseCase(mockUserRepository);
    });
    describe('execute', () => {
        it('should successfully login user with valid credentials', async () => {
            // Arrange
            const loginData = {
                username: 'testuser',
                password: 'correctpassword',
            };
            mockUserRepository.findByUsername.mockResolvedValue(mockUser);
            bcryptjs_1.default.compare.mockResolvedValue(true);
            jsonwebtoken_1.default.sign
                .mockReturnValueOnce('mock-access-token')
                .mockReturnValueOnce('mock-refresh-token');
            // Act
            const result = await loginUserUseCase.execute(loginData);
            // Assert
            expect(result).toEqual({
                user: mockUser,
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
            });
            expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('testuser');
            expect(bcryptjs_1.default.compare).toHaveBeenCalledWith('correctpassword', mockUser.password);
            expect(jsonwebtoken_1.default.sign).toHaveBeenCalledTimes(2);
            expect(mockUserRepository.saveRefreshToken).toHaveBeenCalledWith(mockUser.id, 'mock-refresh-token', expect.any(Date));
            expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(mockUser.id, expect.any(Date));
        });
        it('should throw AuthenticationError when user does not exist', async () => {
            // Arrange
            const loginData = {
                username: 'nonexistent',
                password: 'password',
            };
            mockUserRepository.findByUsername.mockResolvedValue(null);
            // Act & Assert
            await expect(loginUserUseCase.execute(loginData)).rejects.toThrow(AppError_1.AuthenticationError);
            await expect(loginUserUseCase.execute(loginData)).rejects.toThrow('Usuario o contraseña incorrectos');
            expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('nonexistent');
            expect(bcryptjs_1.default.compare).not.toHaveBeenCalled();
        });
        it('should throw AuthenticationError when password is incorrect', async () => {
            // Arrange
            const loginData = {
                username: 'testuser',
                password: 'wrongpassword',
            };
            mockUserRepository.findByUsername.mockResolvedValue(mockUser);
            bcryptjs_1.default.compare.mockResolvedValue(false);
            // Act & Assert
            await expect(loginUserUseCase.execute(loginData)).rejects.toThrow(AppError_1.AuthenticationError);
            await expect(loginUserUseCase.execute(loginData)).rejects.toThrow('Usuario o contraseña incorrectos');
            expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('testuser');
            expect(bcryptjs_1.default.compare).toHaveBeenCalledWith('wrongpassword', mockUser.password);
            expect(jsonwebtoken_1.default.sign).not.toHaveBeenCalled();
        });
        it('should throw Error when JWT_SECRET is not defined', async () => {
            // Arrange
            delete process.env.JWT_SECRET;
            const loginData = {
                username: 'testuser',
                password: 'correctpassword',
            };
            mockUserRepository.findByUsername.mockResolvedValue(mockUser);
            bcryptjs_1.default.compare.mockResolvedValue(true);
            // Act & Assert
            await expect(loginUserUseCase.execute(loginData)).rejects.toThrow('JWT_SECRET o JWT_REFRESH_SECRET no están definidas');
            expect(jsonwebtoken_1.default.sign).not.toHaveBeenCalled();
        });
        it('should throw Error when JWT_REFRESH_SECRET is not defined', async () => {
            // Arrange
            delete process.env.JWT_REFRESH_SECRET;
            const loginData = {
                username: 'testuser',
                password: 'correctpassword',
            };
            mockUserRepository.findByUsername.mockResolvedValue(mockUser);
            bcryptjs_1.default.compare.mockResolvedValue(true);
            // Act & Assert
            await expect(loginUserUseCase.execute(loginData)).rejects.toThrow('JWT_SECRET o JWT_REFRESH_SECRET no están definidas');
            expect(jsonwebtoken_1.default.sign).not.toHaveBeenCalled();
        });
        it('should generate tokens with correct payload and options', async () => {
            // Arrange
            const loginData = {
                username: 'testuser',
                password: 'correctpassword',
            };
            mockUserRepository.findByUsername.mockResolvedValue(mockUser);
            bcryptjs_1.default.compare.mockResolvedValue(true);
            jsonwebtoken_1.default.sign
                .mockReturnValueOnce('mock-access-token')
                .mockReturnValueOnce('mock-refresh-token');
            // Act
            await loginUserUseCase.execute(loginData);
            // Assert - Access Token
            expect(jsonwebtoken_1.default.sign).toHaveBeenNthCalledWith(1, { id: mockUser.id, role: mockUser.role, firstName: mockUser.firstName }, 'test-secret', { expiresIn: '15m' });
            // Assert - Refresh Token
            expect(jsonwebtoken_1.default.sign).toHaveBeenNthCalledWith(2, { id: mockUser.id }, 'test-refresh-secret', { expiresIn: '7d' });
        });
        it('should save refresh token with correct expiration date', async () => {
            // Arrange
            const loginData = {
                username: 'testuser',
                password: 'correctpassword',
            };
            const now = new Date('2024-06-01T12:00:00Z');
            jest.useFakeTimers();
            jest.setSystemTime(now);
            mockUserRepository.findByUsername.mockResolvedValue(mockUser);
            bcryptjs_1.default.compare.mockResolvedValue(true);
            jsonwebtoken_1.default.sign
                .mockReturnValueOnce('mock-access-token')
                .mockReturnValueOnce('mock-refresh-token');
            // Act
            await loginUserUseCase.execute(loginData);
            // Assert
            const expectedExpirationDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            expect(mockUserRepository.saveRefreshToken).toHaveBeenCalledWith(mockUser.id, 'mock-refresh-token', expectedExpirationDate);
            jest.useRealTimers();
        });
        it('should update last login timestamp', async () => {
            // Arrange
            const loginData = {
                username: 'testuser',
                password: 'correctpassword',
            };
            mockUserRepository.findByUsername.mockResolvedValue(mockUser);
            bcryptjs_1.default.compare.mockResolvedValue(true);
            jsonwebtoken_1.default.sign
                .mockReturnValueOnce('mock-access-token')
                .mockReturnValueOnce('mock-refresh-token');
            // Act
            await loginUserUseCase.execute(loginData);
            // Assert
            expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(mockUser.id, expect.any(Date));
        });
        it('should handle repository errors gracefully', async () => {
            // Arrange
            const loginData = {
                username: 'testuser',
                password: 'correctpassword',
            };
            const dbError = new Error('Database connection failed');
            mockUserRepository.findByUsername.mockRejectedValue(dbError);
            // Act & Assert
            await expect(loginUserUseCase.execute(loginData)).rejects.toThrow(dbError);
        });
        it('should handle bcrypt errors gracefully', async () => {
            // Arrange
            const loginData = {
                username: 'testuser',
                password: 'correctpassword',
            };
            mockUserRepository.findByUsername.mockResolvedValue(mockUser);
            const bcryptError = new Error('Bcrypt error');
            bcryptjs_1.default.compare.mockRejectedValue(bcryptError);
            // Act & Assert
            await expect(loginUserUseCase.execute(loginData)).rejects.toThrow(bcryptError);
        });
        it('should handle jwt sign errors gracefully', async () => {
            // Arrange
            const loginData = {
                username: 'testuser',
                password: 'correctpassword',
            };
            mockUserRepository.findByUsername.mockResolvedValue(mockUser);
            bcryptjs_1.default.compare.mockResolvedValue(true);
            const jwtError = new Error('JWT signing failed');
            jsonwebtoken_1.default.sign.mockImplementation(() => {
                throw jwtError;
            });
            // Act & Assert
            await expect(loginUserUseCase.execute(loginData)).rejects.toThrow(jwtError);
        });
        it('should handle saveRefreshToken errors gracefully', async () => {
            // Arrange
            const loginData = {
                username: 'testuser',
                password: 'correctpassword',
            };
            mockUserRepository.findByUsername.mockResolvedValue(mockUser);
            bcryptjs_1.default.compare.mockResolvedValue(true);
            jsonwebtoken_1.default.sign
                .mockReturnValueOnce('mock-access-token')
                .mockReturnValueOnce('mock-refresh-token');
            const saveError = new Error('Failed to save refresh token');
            mockUserRepository.saveRefreshToken.mockRejectedValue(saveError);
            // Act & Assert
            await expect(loginUserUseCase.execute(loginData)).rejects.toThrow(saveError);
        });
        it('should handle updateLastLogin errors gracefully', async () => {
            // Arrange
            const loginData = {
                username: 'testuser',
                password: 'correctpassword',
            };
            mockUserRepository.findByUsername.mockResolvedValue(mockUser);
            bcryptjs_1.default.compare.mockResolvedValue(true);
            jsonwebtoken_1.default.sign
                .mockReturnValueOnce('mock-access-token')
                .mockReturnValueOnce('mock-refresh-token');
            const updateError = new Error('Failed to update last login');
            mockUserRepository.updateLastLogin.mockRejectedValue(updateError);
            // Act & Assert
            await expect(loginUserUseCase.execute(loginData)).rejects.toThrow(updateError);
        });
    });
});
