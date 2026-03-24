import { prisma } from '@infrastructure/prisma/prismaClient';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { User } from '@domain/entities/User';
import { dbCircuitBreaker } from '@infrastructure/resilience';
import { cacheService, CACHE_KEYS } from '@infrastructure/cache/CacheService';

export class UserPrismaRepository implements IUserRepository {
  private invalidateCache(): void {
    cacheService.invalidatePattern('users');
  }

  async create(user: User): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.user.create({ data: user.toPrisma() })
    );
    this.invalidateCache();
  }

  async update(user: User): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.user.update({
        where: { id: user.id },
        data: user.toPrisma(),
      })
    );
    this.invalidateCache();
  }

  async delete(userId: string): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.user.delete({
        where: { id: userId },
      })
    );
    this.invalidateCache();
  }

  async updateLastLogin(userId: string, date: Date): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: date },
      })
    );
    // No invalidamos cache porque lastLoginAt no se usa en listados
  }

  async findByUsername(username: string): Promise<User | null> {
    const userData = await dbCircuitBreaker.execute(() =>
      prisma.user.findUnique({ where: { username } })
    );
    return userData ? User.fromPrisma(userData) : null;
  }

  async findById(id: string): Promise<User | null> {
    const userData = await dbCircuitBreaker.execute(() =>
      prisma.user.findUnique({ where: { id } })
    );
    return userData ? User.fromPrisma(userData) : null;
  }

  async findAll(empresaId?: string): Promise<User[]> {
    const cacheKey = empresaId ? `${CACHE_KEYS.USERS}:${empresaId}` : `${CACHE_KEYS.USERS}:all`;
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const usersData = await dbCircuitBreaker.execute(() =>
          prisma.user.findMany({
            where: empresaId ? { empresaId } : undefined,
            orderBy: { firstName: 'asc' },
          })
        );
        return usersData.map((userData) => User.fromPrisma(userData));
      },
      300 // 5 minutos
    );
  }

  async saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.user.update({
        where: { id: userId },
        data: { refreshToken: token, refreshTokenExpiresAt: expiresAt },
      })
    );
  }

  async findByRefreshToken(token: string): Promise<User | null> {
    const userData = await dbCircuitBreaker.execute(() =>
      prisma.user.findFirst({ where: { refreshToken: token } })
    );
    return userData ? User.fromPrisma(userData) : null;
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null, refreshTokenExpiresAt: null },
      })
    );
  }

  async updateFailedAttempts(userId: string, attempts: number): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: attempts },
      })
    );
    this.invalidateCache();
  }
}
