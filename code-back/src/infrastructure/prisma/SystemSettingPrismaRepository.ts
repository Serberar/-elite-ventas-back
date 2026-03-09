import { prisma } from '@infrastructure/prisma/prismaClient';
import { cacheService } from '@infrastructure/cache/CacheService';

const CACHE_PREFIX = 'system_setting:';
const CACHE_TTL = 30; // segundos

export class SystemSettingPrismaRepository {
  async get(key: string): Promise<string | null> {
    return cacheService.getOrSet(
      `${CACHE_PREFIX}${key}`,
      async () => {
        const row = await prisma.systemSetting.findUnique({ where: { key } });
        return row?.value ?? null;
      },
      CACHE_TTL
    );
  }

  async set(key: string, value: string): Promise<void> {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    cacheService.invalidatePattern(`${CACHE_PREFIX}${key}`);
  }

  async getBool(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val === 'true';
  }
}
