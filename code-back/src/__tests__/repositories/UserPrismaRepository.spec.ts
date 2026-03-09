import { UserPrismaRepository } from '@infrastructure/prisma/UserPrismaRepository';
import { prisma } from '@infrastructure/prisma/prismaClient';
import { User } from '@domain/entities/User';

jest.mock('@infrastructure/prisma/prismaClient', () => ({
  prisma: {
    user: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe('UserPrismaRepository', () => {
  let repository: UserPrismaRepository;

  const mockUserData = {
    id: 'user-123',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    password: 'hashed123',
    role: 'administrador' as const,
    active: true,
    failedLoginAttempts: 0,
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-02'),
    refreshToken: 'token123',
    refreshTokenExpiresAt: new Date('2024-12-31'),
  };

  const mockUser = User.fromPrisma(mockUserData);

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new UserPrismaRepository();
  });

  describe('create', () => {
    it('should create a user', async () => {
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUserData);

      await repository.create(mockUser);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: mockUser.toPrisma(),
      });
    });

    it('should handle creation errors', async () => {
      const error = new Error('Database error');
      (prisma.user.create as jest.Mock).mockRejectedValue(error);

      await expect(repository.create(mockUser)).rejects.toThrow(error);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUserData);

      await repository.update(mockUser);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: mockUser.toPrisma(),
      });
    });

    it('should handle update errors', async () => {
      const error = new Error('User not found');
      (prisma.user.update as jest.Mock).mockRejectedValue(error);

      await expect(repository.update(mockUser)).rejects.toThrow(error);
    });
  });

  describe('updateLastLogin', () => {
    it('should update user last login date', async () => {
      const loginDate = new Date('2024-06-15');
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUserData,
        lastLoginAt: loginDate,
      });

      await repository.updateLastLogin('user-123', loginDate);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { lastLoginAt: loginDate },
      });
    });

    it('should handle update last login errors', async () => {
      const error = new Error('Database error');
      (prisma.user.update as jest.Mock).mockRejectedValue(error);

      await expect(repository.updateLastLogin('user-123', new Date())).rejects.toThrow(error);
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserData);

      const result = await repository.findByUsername('testuser');

      expect(result).toBeInstanceOf(User);
      expect(result?.username).toBe('testuser');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should return null when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByUsername('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle find by username errors', async () => {
      const error = new Error('Database error');
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(error);

      await expect(repository.findByUsername('testuser')).rejects.toThrow(error);
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserData);

      const result = await repository.findById('user-123');

      expect(result).toBeInstanceOf(User);
      expect(result?.id).toBe('user-123');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should return null when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle find by id errors', async () => {
      const error = new Error('Database error');
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(error);

      await expect(repository.findById('user-123')).rejects.toThrow(error);
    });
  });

  describe('saveRefreshToken', () => {
    it('should save refresh token', async () => {
      const token = 'new-token';
      const expiresAt = new Date('2025-12-31');
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUserData,
        refreshToken: token,
        refreshTokenExpiresAt: expiresAt,
      });

      await repository.saveRefreshToken('user-123', token, expiresAt);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { refreshToken: token, refreshTokenExpiresAt: expiresAt },
      });
    });

    it('should handle save refresh token errors', async () => {
      const error = new Error('Database error');
      (prisma.user.update as jest.Mock).mockRejectedValue(error);

      await expect(
        repository.saveRefreshToken('user-123', 'token', new Date())
      ).rejects.toThrow(error);
    });
  });

  describe('findByRefreshToken', () => {
    it('should find user by refresh token', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUserData);

      const result = await repository.findByRefreshToken('token123');

      expect(result).toBeInstanceOf(User);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { refreshToken: 'token123' },
      });
    });

    it('should return null when token not found', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByRefreshToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should handle find by refresh token errors', async () => {
      const error = new Error('Database error');
      (prisma.user.findFirst as jest.Mock).mockRejectedValue(error);

      await expect(repository.findByRefreshToken('token123')).rejects.toThrow(error);
    });
  });

  describe('clearRefreshToken', () => {
    it('should clear refresh token', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUserData,
        refreshToken: null,
        refreshTokenExpiresAt: null,
      });

      await repository.clearRefreshToken('user-123');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { refreshToken: null, refreshTokenExpiresAt: null },
      });
    });

    it('should handle clear refresh token errors', async () => {
      const error = new Error('Database error');
      (prisma.user.update as jest.Mock).mockRejectedValue(error);

      await expect(repository.clearRefreshToken('user-123')).rejects.toThrow(error);
    });
  });
});
