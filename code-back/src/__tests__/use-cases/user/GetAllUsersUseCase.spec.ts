import { GetAllUsersUseCase } from '@application/use-cases/user/GetAllUsersUseCase';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { User } from '@domain/entities/User';

jest.mock('@infrastructure/observability/logger/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('GetAllUsersUseCase', () => {
  let useCase: GetAllUsersUseCase;
  let mockRepository: jest.Mocked<IUserRepository>;

  const createdAt = new Date('2024-01-01');
  const lastLoginAt = new Date('2024-06-01');

  const mockUsers: User[] = [
    new User('user-1', 'John', 'Doe', 'johndoe', 'hashed_pw', 'administrador', true, 0, createdAt, lastLoginAt),
    new User('user-2', 'Jane', 'Smith', 'janesmith', 'hashed_pw2', 'coordinador', true, 0, createdAt, null),
    new User('user-3', 'Bob', 'Brown', 'bobbrown', 'hashed_pw3', 'verificador', false, 3, createdAt, null),
  ];

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

    useCase = new GetAllUsersUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should return all users as DTOs', async () => {
      mockRepository.findAll.mockResolvedValue(mockUsers);

      const result = await useCase.execute();

      expect(result).toHaveLength(3);
      expect(mockRepository.findAll).toHaveBeenCalled();
    });

    it('should map users to DTOs correctly', async () => {
      mockRepository.findAll.mockResolvedValue([mockUsers[0]]);

      const result = await useCase.execute();

      expect(result[0]).toEqual({
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        role: 'administrador',
        active: true,
        failedLoginAttempts: 0,
        createdAt: createdAt.toISOString(),
        lastLoginAt: lastLoginAt.toISOString(),
      });
    });

    it('should set lastLoginAt to null when user has never logged in', async () => {
      mockRepository.findAll.mockResolvedValue([mockUsers[1]]);

      const result = await useCase.execute();

      expect(result[0].lastLoginAt).toBeNull();
    });

    it('should return empty array when no users exist', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      const result = await useCase.execute();

      expect(result).toEqual([]);
    });

    it('should exclude password from result', async () => {
      mockRepository.findAll.mockResolvedValue(mockUsers);

      const result = await useCase.execute();

      result.forEach((user) => {
        expect(user).not.toHaveProperty('password');
      });
    });

    it('should include inactive users with their failedLoginAttempts', async () => {
      mockRepository.findAll.mockResolvedValue([mockUsers[2]]);

      const result = await useCase.execute();

      expect(result[0].active).toBe(false);
      expect(result[0].failedLoginAttempts).toBe(3);
    });

    it('should handle repository errors', async () => {
      mockRepository.findAll.mockRejectedValue(new Error('DB error'));

      await expect(useCase.execute()).rejects.toThrow('DB error');
    });

    it('should return ISO string for createdAt', async () => {
      mockRepository.findAll.mockResolvedValue([mockUsers[0]]);

      const result = await useCase.execute();

      expect(typeof result[0].createdAt).toBe('string');
      expect(result[0].createdAt).toBe(createdAt.toISOString());
    });
  });
});
