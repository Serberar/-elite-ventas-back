import { prisma } from '@infrastructure/prisma/prismaClient';
import { IAllowedIpRepository } from '@domain/repositories/IAllowedIpRepository';
import { AllowedIp } from '@domain/entities/AllowedIp';
import { dbCircuitBreaker } from '@infrastructure/resilience';
import { cacheService, CACHE_KEYS } from '@infrastructure/cache/CacheService';

export class AllowedIpPrismaRepository implements IAllowedIpRepository {
  private invalidateCache(): void {
    cacheService.invalidatePattern('allowed_ips');
  }

  async list(empresaId: string): Promise<AllowedIp[]> {
    return cacheService.getOrSet(
      `${CACHE_KEYS.ALLOWED_IPS}:${empresaId}`,
      async () => {
        const rows = await dbCircuitBreaker.execute(() =>
          prisma.allowedIp.findMany({ where: { empresaId }, orderBy: { createdAt: 'desc' } })
        );
        return rows.map((r) => AllowedIp.fromPrisma(r));
      },
      30
    );
  }

  async listIpStrings(empresaId?: string): Promise<string[]> {
    const cacheKey = empresaId ? `${CACHE_KEYS.ALLOWED_IPS_STRINGS}:${empresaId}` : CACHE_KEYS.ALLOWED_IPS_STRINGS;
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const rows = await dbCircuitBreaker.execute(() =>
          prisma.allowedIp.findMany({
            where: empresaId ? { empresaId } : undefined,
            select: { ip: true },
          })
        );
        return rows.map((r) => r.ip.trim());
      },
      30
    );
  }

  async create(data: { ip: string; description?: string | null; empresaId: string }): Promise<AllowedIp> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.allowedIp.create({
        data: {
          ip: data.ip.trim(),
          description: data.description ?? null,
          empresaId: data.empresaId,
        },
      })
    );

    this.invalidateCache();
    return AllowedIp.fromPrisma(row);
  }

  async delete(id: string, empresaId: string): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.allowedIp.delete({ where: { id, empresaId } })
    );
    this.invalidateCache();
  }
}
