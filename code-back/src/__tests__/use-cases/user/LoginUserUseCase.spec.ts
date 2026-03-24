import { LoginUserUseCase } from '@application/use-cases/user/LoginUserUseCase';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { User } from '@domain/entities/User';
import { AuthenticationError } from '@application/shared/AppError';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('@infrastructure/observability/logger/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('LoginUserUseCase', () => {
  let loginUserUseCase: LoginUserUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  const mockUser = new User(
    '123',
    'Test',
    'User',
    'testuser',
    '$2a$10$hashedpassword',
    'administrador',
    '00000000-0000-0000-0000-000000000001',
    true,
    0,
    new Date('2024-01-01'),
    null,
    undefined,
    undefined
  );

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
      delete: jest.fn(),
      findAll: jest.fn(),
      updateFailedAttempts: jest.fn(),
    };

    // Setup environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';

    loginUserUseCase = new LoginUserUseCase(mockUserRepository);
  });

  describe('execute', () => {
    it('should successfully login user with valid credentials', async () => {
      // Arrange
      const loginData = {
        username: 'testuser',
        password: 'correctpassword',
      };

      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock)
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
      expect(bcrypt.compare).toHaveBeenCalledWith('correctpassword', mockUser.password);
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(mockUserRepository.saveRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        'mock-refresh-token',
        expect.any(Date)
      );
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
      await expect(loginUserUseCase.execute(loginData)).rejects.toThrow(AuthenticationError);
      await expect(loginUserUseCase.execute(loginData)).rejects.toThrow('Usuario o contraseña incorrectos');
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('nonexistent');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw AuthenticationError when password is incorrect', async () => {
      // Arrange
      const loginData = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(loginUserUseCase.execute(loginData)).rejects.toThrow(AuthenticationError);
      await expect(loginUserUseCase.execute(loginData)).rejects.toThrow('Usuario o contraseña incorrectos');
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('testuser');
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', mockUser.password);
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should throw AuthenticationError when account is inactive', async () => {
      // Arrange
      const inactiveUser = new User(
        '123', 'Test', 'User', 'testuser', '$2a$10$hashedpassword', 'administrador',
        '00000000-0000-0000-0000-000000000001', false, // active = false
        0, new Date('2024-01-01'), null
      );
      const loginData = { username: 'testuser', password: 'anypassword' };

      mockUserRepository.findByUsername.mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(loginUserUseCase.execute(loginData)).rejects.toThrow(AuthenticationError);
      await expect(loginUserUseCase.execute(loginData)).rejects.toThrow(
        'Cuenta desactivada. Contacte con el administrador.'
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw AuthenticationError when account is locked (20 failed attempts)', async () => {
      // Arrange
      const lockedUser = new User(
        '123', 'Test', 'User', 'testuser', '$2a$10$hashedpassword', 'administrador',
        '00000000-0000-0000-0000-000000000001', true, // active
        20,   // failedLoginAttempts >= MAX
        new Date('2024-01-01'), null
      );
      const loginData = { username: 'testuser', password: 'anypassword' };

      mockUserRepository.findByUsername.mockResolvedValue(lockedUser);

      // Act & Assert
      await expect(loginUserUseCase.execute(loginData)).rejects.toThrow(AuthenticationError);
      await expect(loginUserUseCase.execute(loginData)).rejects.toThrow(
        'Cuenta bloqueada por demasiados intentos fallidos. Contacte con el administrador.'
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw AuthenticationError when account has more than 20 failed attempts', async () => {
      // Arrange
      const overLockedUser = new User(
        '123', 'Test', 'User', 'testuser', '$2a$10$hashedpassword', 'administrador',
        '00000000-0000-0000-0000-000000000001', true, 25, new Date('2024-01-01'), null
      );
      mockUserRepository.findByUsername.mockResolvedValue(overLockedUser);

      // Act & Assert
      await expect(loginUserUseCase.execute({ username: 'testuser', password: 'pw' }))
        .rejects.toThrow('Cuenta bloqueada por demasiados intentos fallidos. Contacte con el administrador.');
    });

    it('should increment failedLoginAttempts on wrong password', async () => {
      // Arrange
      const userWith5Attempts = new User(
        '123', 'Test', 'User', 'testuser', '$2a$10$hashedpassword', 'administrador',
        '00000000-0000-0000-0000-000000000001', true, 5, new Date('2024-01-01'), null
      );
      const loginData = { username: 'testuser', password: 'wrongpassword' };

      mockUserRepository.findByUsername.mockResolvedValue(userWith5Attempts);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(loginUserUseCase.execute(loginData)).rejects.toThrow('Usuario o contraseña incorrectos');
      expect(mockUserRepository.updateFailedAttempts).toHaveBeenCalledWith('123', 6);
    });

    it('should lock account and throw lockout error when reaching 20 attempts on wrong password', async () => {
      // Arrange
      const userWith19Attempts = new User(
        '123', 'Test', 'User', 'testuser', '$2a$10$hashedpassword', 'administrador',
        '00000000-0000-0000-0000-000000000001', true, 19, new Date('2024-01-01'), null
      );
      const loginData = { username: 'testuser', password: 'wrongpassword' };

      mockUserRepository.findByUsername.mockResolvedValue(userWith19Attempts);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(loginUserUseCase.execute(loginData)).rejects.toThrow(
        'Cuenta bloqueada por demasiados intentos fallidos. Contacte con el administrador.'
      );
      expect(mockUserRepository.updateFailedAttempts).toHaveBeenCalledWith('123', 20);
    });

    it('should reset failedLoginAttempts to 0 on successful login when attempts > 0', async () => {
      // Arrange
      const userWithAttempts = new User(
        '123', 'Test', 'User', 'testuser', '$2a$10$hashedpassword', 'administrador',
        '00000000-0000-0000-0000-000000000001', true, 3, new Date('2024-01-01'), null
      );
      const loginData = { username: 'testuser', password: 'correctpassword' };

      mockUserRepository.findByUsername.mockResolvedValue(userWithAttempts);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      // Act
      await loginUserUseCase.execute(loginData);

      // Assert
      expect(mockUserRepository.updateFailedAttempts).toHaveBeenCalledWith('123', 0);
    });

    it('should NOT call updateFailedAttempts on successful login when attempts are already 0', async () => {
      // Arrange — mockUser has failedLoginAttempts = 0
      const loginData = { username: 'testuser', password: 'correctpassword' };

      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      // Act
      await loginUserUseCase.execute(loginData);

      // Assert — no debería llamar updateFailedAttempts si ya estaba en 0
      expect(mockUserRepository.updateFailedAttempts).not.toHaveBeenCalled();
    });

    it('should throw Error when JWT_SECRET is not defined', async () => {
      // Arrange
      delete process.env.JWT_SECRET;

      const loginData = {
        username: 'testuser',
        password: 'correctpassword',
      };

      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(loginUserUseCase.execute(loginData)).rejects.toThrow(
        'Configuración de JWT no disponible'
      );
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should throw Error when JWT_REFRESH_SECRET is not defined', async () => {
      // Arrange
      delete process.env.JWT_REFRESH_SECRET;

      const loginData = {
        username: 'testuser',
        password: 'correctpassword',
      };

      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(loginUserUseCase.execute(loginData)).rejects.toThrow(
        'Configuración de JWT no disponible'
      );
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should generate tokens with correct payload and options', async () => {
      // Arrange
      const loginData = {
        username: 'testuser',
        password: 'correctpassword',
      };

      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      // Act
      await loginUserUseCase.execute(loginData);

      // Assert - Access Token
      expect(jwt.sign).toHaveBeenNthCalledWith(
        1,
        { id: mockUser.id, role: mockUser.role, firstName: mockUser.firstName, lastName: mockUser.lastName, empresaId: mockUser.empresaId },
        'test-secret',
        { expiresIn: '15m' }
      );

      // Assert - Refresh Token
      expect(jwt.sign).toHaveBeenNthCalledWith(
        2,
        { id: mockUser.id },
        'test-refresh-secret',
        { expiresIn: '7d' }
      );
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
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      // Act
      await loginUserUseCase.execute(loginData);

      // Assert
      const expectedExpirationDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      expect(mockUserRepository.saveRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        'mock-refresh-token',
        expectedExpirationDate
      );

      jest.useRealTimers();
    });

    it('should update last login timestamp', async () => {
      // Arrange
      const loginData = {
        username: 'testuser',
        password: 'correctpassword',
      };

      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock)
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
      (bcrypt.compare as jest.Mock).mockRejectedValue(bcryptError);

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
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const jwtError = new Error('JWT signing failed');
      (jwt.sign as jest.Mock).mockImplementation(() => {
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
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock)
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
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      const updateError = new Error('Failed to update last login');
      mockUserRepository.updateLastLogin.mockRejectedValue(updateError);

      // Act & Assert
      await expect(loginUserUseCase.execute(loginData)).rejects.toThrow(updateError);
    });
  });
});
