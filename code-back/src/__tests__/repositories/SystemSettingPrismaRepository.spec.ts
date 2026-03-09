import { SystemSettingPrismaRepository } from '@infrastructure/prisma/SystemSettingPrismaRepository';
import { prisma } from '@infrastructure/prisma/prismaClient';

jest.mock('@infrastructure/prisma/prismaClient', () => ({
  prisma: {
    systemSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@infrastructure/cache/CacheService', () => ({
  cacheService: {
    getOrSet: jest.fn((_key: string, factory: () => Promise<any>) => factory()),
    invalidatePattern: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    invalidate: jest.fn(),
  },
}));

import { cacheService } from '@infrastructure/cache/CacheService';

describe('SystemSettingPrismaRepository', () => {
  let repository: SystemSettingPrismaRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new SystemSettingPrismaRepository();
  });

  describe('get', () => {
    it('should return the value for an existing key', async () => {
      (prisma.systemSetting.findUnique as jest.Mock).mockResolvedValue({
        key: 'ip_filter_enabled',
        value: 'true',
      });

      const result = await repository.get('ip_filter_enabled');

      expect(prisma.systemSetting.findUnique).toHaveBeenCalledWith({
        where: { key: 'ip_filter_enabled' },
      });
      expect(result).toBe('true');
    });

    it('should return null when key does not exist', async () => {
      (prisma.systemSetting.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.get('non_existent_key');

      expect(result).toBeNull();
    });

    it('should use cache with prefixed key', async () => {
      (prisma.systemSetting.findUnique as jest.Mock).mockResolvedValue({ key: 'k', value: 'v' });

      await repository.get('my_setting');

      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'system_setting:my_setting',
        expect.any(Function),
        30
      );
    });

    it('should propagate prisma errors', async () => {
      (prisma.systemSetting.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(repository.get('any_key')).rejects.toThrow('DB error');
    });
  });

  describe('set', () => {
    it('should upsert the setting with key and value', async () => {
      (prisma.systemSetting.upsert as jest.Mock).mockResolvedValue(undefined);

      await repository.set('ip_filter_enabled', 'true');

      expect(prisma.systemSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'ip_filter_enabled' },
        update: { value: 'true' },
        create: { key: 'ip_filter_enabled', value: 'true' },
      });
    });

    it('should invalidate cache for the specific key after setting', async () => {
      (prisma.systemSetting.upsert as jest.Mock).mockResolvedValue(undefined);

      await repository.set('some_setting', 'value');

      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
        'system_setting:some_setting'
      );
    });

    it('should update existing key value on upsert', async () => {
      (prisma.systemSetting.upsert as jest.Mock).mockResolvedValue(undefined);

      await repository.set('ip_filter_enabled', 'false');

      expect(prisma.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { value: 'false' } })
      );
    });

    it('should resolve without error on success', async () => {
      (prisma.systemSetting.upsert as jest.Mock).mockResolvedValue(undefined);

      await expect(repository.set('key', 'value')).resolves.toBeUndefined();
    });

    it('should propagate prisma errors', async () => {
      (prisma.systemSetting.upsert as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(repository.set('key', 'value')).rejects.toThrow('DB error');
    });
  });

  describe('getBool', () => {
    it('should return true when value is "true"', async () => {
      (prisma.systemSetting.findUnique as jest.Mock).mockResolvedValue({
        key: 'ip_filter_enabled',
        value: 'true',
      });

      const result = await repository.getBool('ip_filter_enabled');

      expect(result).toBe(true);
    });

    it('should return false when value is "false"', async () => {
      (prisma.systemSetting.findUnique as jest.Mock).mockResolvedValue({
        key: 'ip_filter_enabled',
        value: 'false',
      });

      const result = await repository.getBool('ip_filter_enabled');

      expect(result).toBe(false);
    });

    it('should return false when key does not exist (null value)', async () => {
      (prisma.systemSetting.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.getBool('non_existent');

      expect(result).toBe(false);
    });

    it('should return false for any non-"true" string value', async () => {
      (prisma.systemSetting.findUnique as jest.Mock).mockResolvedValue({
        key: 'some_flag',
        value: '1',
      });

      const result = await repository.getBool('some_flag');

      expect(result).toBe(false);
    });

    it('should propagate errors from get()', async () => {
      (prisma.systemSetting.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(repository.getBool('key')).rejects.toThrow('DB error');
    });
  });
});
