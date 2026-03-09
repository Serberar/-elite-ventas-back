import { DeleteUserUseCase } from '@application/use-cases/user/DeleteUserUseCase';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { User } from '@domain/entities/User';
import { NotFoundError } from '@application/shared/AppError';

jest.mock('@infrastructure/observability/logger/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let mockRepository: jest.Mocked<IUserRepository>;

  const existingUser = new User(
    'user-123',
    'John',
    'Doe',
    'johndoe',
    'hashed_password',
    'administrador',
    true,
    0,
    new Date('2024-01-01'),
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

    useCase = new DeleteUserUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should delete user successfully', async () => {
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.delete.mockResolvedValue(undefined);

      await useCase.execute('user-123');

      expect(mockRepository.findById).toHaveBeenCalledWith('user-123');
      expect(mockRepository.delete).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent')).rejects.toThrow(NotFoundError);
      await expect(useCase.execute('non-existent')).rejects.toThrow('Usuario no encontrado');

      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should not return a value', async () => {
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.delete.mockResolvedValue(undefined);

      const result = await useCase.execute('user-123');

      expect(result).toBeUndefined();
    });

    it('should handle repository errors on delete', async () => {
      mockRepository.findById.mockResolvedValue(existingUser);
      mockRepository.delete.mockRejectedValue(new Error('DB error'));

      await expect(useCase.execute('user-123')).rejects.toThrow('DB error');
    });

    it('should check user existence before deleting', async () => {
      const callOrder: string[] = [];

      mockRepository.findById.mockImplementation(async () => {
        callOrder.push('findById');
        return existingUser;
      });

      mockRepository.delete.mockImplementation(async () => {
        callOrder.push('delete');
      });

      await useCase.execute('user-123');

      expect(callOrder).toEqual(['findById', 'delete']);
    });
  });
});
