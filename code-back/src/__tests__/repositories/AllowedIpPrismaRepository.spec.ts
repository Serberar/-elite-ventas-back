import { AllowedIpPrismaRepository } from '@infrastructure/prisma/AllowedIpPrismaRepository';
import { prisma } from '@infrastructure/prisma/prismaClient';
import { AllowedIp } from '@domain/entities/AllowedIp';

jest.mock('@infrastructure/prisma/prismaClient', () => ({
  prisma: {
    allowedIp: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@infrastructure/resilience', () => ({
  dbCircuitBreaker: {
    execute: jest.fn((fn: () => Promise<any>) => fn()),
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
  CACHE_KEYS: {
    ALLOWED_IPS: 'allowed_ips:all',
    ALLOWED_IPS_STRINGS: 'allowed_ips:strings',
  },
}));

import { cacheService } from '@infrastructure/cache/CacheService';

describe('AllowedIpPrismaRepository', () => {
  let repository: AllowedIpPrismaRepository;

  const mockIpRow = {
    id: 'ip-1',
    ip: '192.168.1.1',
    description: 'Oficina',
    createdAt: new Date('2024-01-15'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new AllowedIpPrismaRepository();
  });

  describe('list', () => {
    it('should return list of AllowedIp entities', async () => {
      (prisma.allowedIp.findMany as jest.Mock).mockResolvedValue([mockIpRow]);

      const result = await repository.list();

      expect(prisma.allowedIp.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(AllowedIp);
      expect(result[0].ip).toBe('192.168.1.1');
    });

    it('should return empty array when no IPs exist', async () => {
      (prisma.allowedIp.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repository.list();

      expect(result).toEqual([]);
    });

    it('should use cache via getOrSet', async () => {
      (prisma.allowedIp.findMany as jest.Mock).mockResolvedValue([mockIpRow]);

      await repository.list();

      expect(cacheService.getOrSet).toHaveBeenCalledWith('allowed_ips:all', expect.any(Function), 30);
    });

    it('should propagate prisma errors', async () => {
      (prisma.allowedIp.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(repository.list()).rejects.toThrow('DB error');
    });
  });

  describe('listIpStrings', () => {
    it('should return array of trimmed IP strings', async () => {
      (prisma.allowedIp.findMany as jest.Mock).mockResolvedValue([
        { ip: ' 192.168.1.1 ' },
        { ip: '10.0.0.1' },
      ]);

      const result = await repository.listIpStrings();

      expect(prisma.allowedIp.findMany).toHaveBeenCalledWith({ select: { ip: true } });
      expect(result).toEqual(['192.168.1.1', '10.0.0.1']);
    });

    it('should use cache with correct key', async () => {
      (prisma.allowedIp.findMany as jest.Mock).mockResolvedValue([]);

      await repository.listIpStrings();

      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'allowed_ips:strings',
        expect.any(Function),
        30
      );
    });
  });

  describe('create', () => {
    it('should create and return an AllowedIp entity', async () => {
      (prisma.allowedIp.create as jest.Mock).mockResolvedValue(mockIpRow);

      const result = await repository.create({ ip: '192.168.1.1', description: 'Oficina' });

      expect(prisma.allowedIp.create).toHaveBeenCalledWith({
        data: { ip: '192.168.1.1', description: 'Oficina' },
      });
      expect(result).toBeInstanceOf(AllowedIp);
      expect(result.ip).toBe('192.168.1.1');
    });

    it('should trim whitespace from IP before saving', async () => {
      (prisma.allowedIp.create as jest.Mock).mockResolvedValue({ ...mockIpRow, ip: '10.0.0.5' });

      await repository.create({ ip: '  10.0.0.5  ' });

      expect(prisma.allowedIp.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ ip: '10.0.0.5' }) })
      );
    });

    it('should set description to null when not provided', async () => {
      (prisma.allowedIp.create as jest.Mock).mockResolvedValue({ ...mockIpRow, description: null });

      await repository.create({ ip: '192.168.1.1' });

      expect(prisma.allowedIp.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ description: null }) })
      );
    });

    it('should invalidate cache after creating', async () => {
      (prisma.allowedIp.create as jest.Mock).mockResolvedValue(mockIpRow);

      await repository.create({ ip: '192.168.1.1' });

      expect(cacheService.invalidatePattern).toHaveBeenCalledWith('allowed_ips');
    });

    it('should propagate prisma errors', async () => {
      (prisma.allowedIp.create as jest.Mock).mockRejectedValue(new Error('Unique constraint failed'));

      await expect(repository.create({ ip: '192.168.1.1' })).rejects.toThrow('Unique constraint failed');
    });
  });

  describe('delete', () => {
    it('should delete the IP by id', async () => {
      (prisma.allowedIp.delete as jest.Mock).mockResolvedValue(undefined);

      await repository.delete('ip-1');

      expect(prisma.allowedIp.delete).toHaveBeenCalledWith({ where: { id: 'ip-1' } });
    });

    it('should invalidate cache after deleting', async () => {
      (prisma.allowedIp.delete as jest.Mock).mockResolvedValue(undefined);

      await repository.delete('ip-1');

      expect(cacheService.invalidatePattern).toHaveBeenCalledWith('allowed_ips');
    });

    it('should propagate prisma errors', async () => {
      (prisma.allowedIp.delete as jest.Mock).mockRejectedValue(new Error('Record not found'));

      await expect(repository.delete('non-existent')).rejects.toThrow('Record not found');
    });
  });
});
