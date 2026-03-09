import { prisma } from '@infrastructure/prisma/prismaClient';
import { IAllowedIpRepository } from '@domain/repositories/IAllowedIpRepository';
import { AllowedIp } from '@domain/entities/AllowedIp';
import { dbCircuitBreaker } from '@infrastructure/resilience';
import { cacheService, CACHE_KEYS } from '@infrastructure/cache/CacheService';

export class AllowedIpPrismaRepository implements IAllowedIpRepository {
  private invalidateCache(): void {
    cacheService.invalidatePattern('allowed_ips');
  }

  async list(): Promise<AllowedIp[]> {
    return cacheService.getOrSet(
      CACHE_KEYS.ALLOWED_IPS,
      async () => {
        const rows = await dbCircuitBreaker.execute(() =>
          prisma.allowedIp.findMany({ orderBy: { createdAt: 'desc' } })
        );
        return rows.map((r) => AllowedIp.fromPrisma(r));
      },
      30
    );
  }

  async listIpStrings(): Promise<string[]> {
    return cacheService.getOrSet(
      CACHE_KEYS.ALLOWED_IPS_STRINGS,
      async () => {
        const rows = await dbCircuitBreaker.execute(() =>
          prisma.allowedIp.findMany({ select: { ip: true } })
        );
        return rows.map((r) => r.ip.trim());
      },
      30
    );
  }

  async create(data: { ip: string; description?: string | null }): Promise<AllowedIp> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.allowedIp.create({
        data: {
          ip: data.ip.trim(),
          description: data.description ?? null,
        },
      })
    );

    this.invalidateCache();
    return AllowedIp.fromPrisma(row);
  }

  async delete(id: string): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.allowedIp.delete({ where: { id } })
    );
    this.invalidateCache();
  }
}
