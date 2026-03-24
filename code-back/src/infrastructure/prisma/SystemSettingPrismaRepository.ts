import { prisma } from '@infrastructure/prisma/prismaClient';
import { cacheService } from '@infrastructure/cache/CacheService';

const CACHE_PREFIX = 'system_setting:';
const CACHE_TTL = 30; // segundos

export class SystemSettingPrismaRepository {
  async get(key: string, empresaId: string): Promise<string | null> {
    return cacheService.getOrSet(
      `${CACHE_PREFIX}${empresaId}:${key}`,
      async () => {
        const row = await prisma.systemSetting.findUnique({
          where: { key_empresaId: { key, empresaId } },
        });
        return row?.value ?? null;
      },
      CACHE_TTL
    );
  }

  async set(key: string, value: string, empresaId: string): Promise<void> {
    await prisma.systemSetting.upsert({
      where: { key_empresaId: { key, empresaId } },
      update: { value },
      create: { key, empresaId, value },
    });
    cacheService.invalidatePattern(`${CACHE_PREFIX}${empresaId}:${key}`);
  }

  async getBool(key: string, empresaId: string): Promise<boolean> {
    const val = await this.get(key, empresaId);
    return val === 'true';
  }
}
