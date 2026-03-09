"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UserPrismaRepository_1 = require("../../infrastructure/prisma/UserPrismaRepository");
const prismaClient_1 = require("../../infrastructure/prisma/prismaClient");
const User_1 = require("../../domain/entities/User");
jest.mock('@infrastructure/prisma/prismaClient', () => ({
    prisma: {
        user: {
            create: jest.fn(),
            update: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
        },
    },
}));
describe('UserPrismaRepository', () => {
    let repository;
    const mockUserData = {
        id: 'user-123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'hashed123',
        role: 'administrador',
        lastLoginAt: new Date('2024-01-02'),
        refreshToken: 'token123',
        refreshTokenExpiresAt: new Date('2024-12-31'),
    };
    const mockUser = User_1.User.fromPrisma(mockUserData);
    beforeEach(() => {
        jest.clearAllMocks();
        repository = new UserPrismaRepository_1.UserPrismaRepository();
    });
    describe('create', () => {
        it('should create a user', async () => {
            prismaClient_1.prisma.user.create.mockResolvedValue(mockUserData);
            await repository.create(mockUser);
            expect(prismaClient_1.prisma.user.create).toHaveBeenCalledWith({
                data: mockUser.toPrisma(),
            });
        });
        it('should handle creation errors', async () => {
            const error = new Error('Database error');
            prismaClient_1.prisma.user.create.mockRejectedValue(error);
            await expect(repository.create(mockUser)).rejects.toThrow(error);
        });
    });
    describe('update', () => {
        it('should update a user', async () => {
            prismaClient_1.prisma.user.update.mockResolvedValue(mockUserData);
            await repository.update(mockUser);
            expect(prismaClient_1.prisma.user.update).toHaveBeenCalledWith({
                where: { id: mockUser.id },
                data: mockUser.toPrisma(),
            });
        });
        it('should handle update errors', async () => {
            const error = new Error('User not found');
            prismaClient_1.prisma.user.update.mockRejectedValue(error);
            await expect(repository.update(mockUser)).rejects.toThrow(error);
        });
    });
    describe('updateLastLogin', () => {
        it('should update user last login date', async () => {
            const loginDate = new Date('2024-06-15');
            prismaClient_1.prisma.user.update.mockResolvedValue({
                ...mockUserData,
                lastLoginAt: loginDate,
            });
            await repository.updateLastLogin('user-123', loginDate);
            expect(prismaClient_1.prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user-123' },
                data: { lastLoginAt: loginDate },
            });
        });
        it('should handle update last login errors', async () => {
            const error = new Error('Database error');
            prismaClient_1.prisma.user.update.mockRejectedValue(error);
            await expect(repository.updateLastLogin('user-123', new Date())).rejects.toThrow(error);
        });
    });
    describe('findByUsername', () => {
        it('should find user by username', async () => {
            prismaClient_1.prisma.user.findUnique.mockResolvedValue(mockUserData);
            const result = await repository.findByUsername('testuser');
            expect(result).toBeInstanceOf(User_1.User);
            expect(result?.username).toBe('testuser');
            expect(prismaClient_1.prisma.user.findUnique).toHaveBeenCalledWith({
                where: { username: 'testuser' },
            });
        });
        it('should return null when user not found', async () => {
            prismaClient_1.prisma.user.findUnique.mockResolvedValue(null);
            const result = await repository.findByUsername('nonexistent');
            expect(result).toBeNull();
        });
        it('should handle find by username errors', async () => {
            const error = new Error('Database error');
            prismaClient_1.prisma.user.findUnique.mockRejectedValue(error);
            await expect(repository.findByUsername('testuser')).rejects.toThrow(error);
        });
    });
    describe('findById', () => {
        it('should find user by id', async () => {
            prismaClient_1.prisma.user.findUnique.mockResolvedValue(mockUserData);
            const result = await repository.findById('user-123');
            expect(result).toBeInstanceOf(User_1.User);
            expect(result?.id).toBe('user-123');
            expect(prismaClient_1.prisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: 'user-123' },
            });
        });
        it('should return null when user not found', async () => {
            prismaClient_1.prisma.user.findUnique.mockResolvedValue(null);
            const result = await repository.findById('nonexistent');
            expect(result).toBeNull();
        });
        it('should handle find by id errors', async () => {
            const error = new Error('Database error');
            prismaClient_1.prisma.user.findUnique.mockRejectedValue(error);
            await expect(repository.findById('user-123')).rejects.toThrow(error);
        });
    });
    describe('saveRefreshToken', () => {
        it('should save refresh token', async () => {
            const token = 'new-token';
            const expiresAt = new Date('2025-12-31');
            prismaClient_1.prisma.user.update.mockResolvedValue({
                ...mockUserData,
                refreshToken: token,
                refreshTokenExpiresAt: expiresAt,
            });
            await repository.saveRefreshToken('user-123', token, expiresAt);
            expect(prismaClient_1.prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user-123' },
                data: { refreshToken: token, refreshTokenExpiresAt: expiresAt },
            });
        });
        it('should handle save refresh token errors', async () => {
            const error = new Error('Database error');
            prismaClient_1.prisma.user.update.mockRejectedValue(error);
            await expect(repository.saveRefreshToken('user-123', 'token', new Date())).rejects.toThrow(error);
        });
    });
    describe('findByRefreshToken', () => {
        it('should find user by refresh token', async () => {
            prismaClient_1.prisma.user.findFirst.mockResolvedValue(mockUserData);
            const result = await repository.findByRefreshToken('token123');
            expect(result).toBeInstanceOf(User_1.User);
            expect(prismaClient_1.prisma.user.findFirst).toHaveBeenCalledWith({
                where: { refreshToken: 'token123' },
            });
        });
        it('should return null when token not found', async () => {
            prismaClient_1.prisma.user.findFirst.mockResolvedValue(null);
            const result = await repository.findByRefreshToken('invalid-token');
            expect(result).toBeNull();
        });
        it('should handle find by refresh token errors', async () => {
            const error = new Error('Database error');
            prismaClient_1.prisma.user.findFirst.mockRejectedValue(error);
            await expect(repository.findByRefreshToken('token123')).rejects.toThrow(error);
        });
    });
    describe('clearRefreshToken', () => {
        it('should clear refresh token', async () => {
            prismaClient_1.prisma.user.update.mockResolvedValue({
                ...mockUserData,
                refreshToken: null,
                refreshTokenExpiresAt: null,
            });
            await repository.clearRefreshToken('user-123');
            expect(prismaClient_1.prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user-123' },
                data: { refreshToken: null, refreshTokenExpiresAt: null },
            });
        });
        it('should handle clear refresh token errors', async () => {
            const error = new Error('Database error');
            prismaClient_1.prisma.user.update.mockRejectedValue(error);
            await expect(repository.clearRefreshToken('user-123')).rejects.toThrow(error);
        });
    });
});
