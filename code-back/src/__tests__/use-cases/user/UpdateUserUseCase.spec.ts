import { UpdateUserUseCase } from '@application/use-cases/user/UpdateUserUseCase';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { User } from '@domain/entities/User';
import { NotFoundError, ConflictError } from '@application/shared/AppError';

jest.mock('@infrastructure/observability/logger/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('new_hashed_password'),
}));

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let mockRepository: jest.Mocked<IUserRepository>;

  const createdAt = new Date('2024-01-01');

  const existingUser = new User(
    'user-123',
    'John',
    'Doe',
    'johndoe',
    'old_hashed_password',
    'coordinador',
    true,
    0,
    createdAt,
    null
  );

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateLastLogin: jest.fn(),
      findByUsername: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      saveRefreshToken: jest.fn(),
      findByRefreshToken: jest.fn(),
      clearRefreshToken: jest.fn(),
      updateFailedAttempts: jest.fn(),
    };

    useCase = new UpdateUserUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should update firstName and lastName', async () => {
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.update.mockResolvedValue(undefined);

      const result = await useCase.execute('user-123', {
        firstName: 'Jane',
        lastName: 'Smith',
      });

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.username).toBe('johndoe');
    });

    it('should update username when not taken', async () => {
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.findByUsername.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue(undefined);

      const result = await useCase.execute('user-123', { username: 'newusername' });

      expect(result.username).toBe('newusername');
      expect(mockRepository.findByUsername).toHaveBeenCalledWith('newusername');
    });

    it('should throw ConflictError when username is already taken', async () => {
      const anotherUser = new User('other-user', 'Other', 'User', 'newusername', 'pw', 'comercial', true, 0, new Date(), null);
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.findByUsername.mockResolvedValue(anotherUser);

      await expect(useCase.execute('user-123', { username: 'newusername' })).rejects.toThrow(
        ConflictError
      );
      await expect(useCase.execute('user-123', { username: 'newusername' })).rejects.toThrow(
        'El nombre de usuario ya está en uso'
      );
    });

    it('should allow keeping the same username without conflict check', async () => {
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.update.mockResolvedValue(undefined);

      const result = await useCase.execute('user-123', { username: 'johndoe' });

      expect(result.username).toBe('johndoe');
      expect(mockRepository.findByUsername).not.toHaveBeenCalled();
    });

    it('should hash password when updating', async () => {
      const { hash } = require('bcryptjs');
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.update.mockResolvedValue(undefined);

      await useCase.execute('user-123', { password: 'newpassword' });

      expect(hash).toHaveBeenCalledWith('newpassword', 10);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent', { firstName: 'Jane' })).rejects.toThrow(
        NotFoundError
      );
    });

    it('should reset failedLoginAttempts when reactivating user', async () => {
      const lockedUser = new User('user-123', 'John', 'Doe', 'johndoe', 'pw', 'coordinador', false, 5, createdAt, null);
      mockRepository.findById.mockResolvedValue(lockedUser);
      mockRepository.update.mockResolvedValue(undefined);

      const result = await useCase.execute('user-123', { active: true });

      expect(result.active).toBe(true);
      expect(result.failedLoginAttempts).toBe(0);
    });

    it('should preserve failedLoginAttempts when not changing active state', async () => {
      const userWithAttempts = new User('user-123', 'John', 'Doe', 'johndoe', 'pw', 'coordinador', true, 3, createdAt, null);
      mockRepository.findById.mockResolvedValue(userWithAttempts);
      mockRepository.update.mockResolvedValue(undefined);

      const result = await useCase.execute('user-123', { firstName: 'Jane' });

      expect(result.failedLoginAttempts).toBe(3);
    });

    it('should return ISO string for createdAt', async () => {
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.update.mockResolvedValue(undefined);

      const result = await useCase.execute('user-123', {});

      expect(typeof result.createdAt).toBe('string');
      expect(result.createdAt).toBe(createdAt.toISOString());
    });

    it('should handle repository errors', async () => {
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.update.mockRejectedValue(new Error('DB error'));

      await expect(useCase.execute('user-123', {})).rejects.toThrow('DB error');
    });

    it('should update role', async () => {
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.update.mockResolvedValue(undefined);

      const result = await useCase.execute('user-123', { role: 'verificador' });

      expect(result.role).toBe('verificador');
    });
  });
});
