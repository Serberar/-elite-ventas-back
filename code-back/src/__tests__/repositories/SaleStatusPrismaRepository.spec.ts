import { SaleStatusPrismaRepository } from '@infrastructure/prisma/SaleStatusPrismaRepository';
import { prisma } from '@infrastructure/prisma/prismaClient';
import { SaleStatus } from '@domain/entities/SaleStatus';

jest.mock('@infrastructure/prisma/prismaClient', () => ({
  prisma: {
    saleStatus: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@infrastructure/resilience', () => ({
  dbCircuitBreaker: {
    execute: jest.fn((fn: () => Promise<any>) => fn()),
  },
}));

// Mock cacheService to bypass caching between tests
jest.mock('@infrastructure/cache/CacheService', () => ({
  cacheService: {
    getOrSet: jest.fn((key: string, factory: () => Promise<any>) => factory()),
    invalidatePattern: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    invalidate: jest.fn(),
  },
  CACHE_KEYS: {
    SALE_STATUSES: 'sale_statuses',
    SALE_STATUS_INITIAL: 'sale_status_initial',
    PRODUCTS: 'products',
    USERS: 'users',
  },
}));

describe('SaleStatusPrismaRepository', () => {
  let repository: SaleStatusPrismaRepository;

  const mockStatusData = {
    id: 'status-123',
    name: 'Pending',
    order: 1,
    color: '#FFFF00',
    isFinal: false,
    isCancelled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new SaleStatusPrismaRepository();
  });

  describe('findById', () => {
    it('should find status by id', async () => {
      (prisma.saleStatus.findUnique as jest.Mock).mockResolvedValue(mockStatusData);

      const result = await repository.findById('status-123');

      expect(result).toBeInstanceOf(SaleStatus);
      expect(result?.id).toBe('status-123');
      expect(prisma.saleStatus.findUnique).toHaveBeenCalledWith({
        where: { id: 'status-123' },
      });
    });

    it('should return null when status not found', async () => {
      (prisma.saleStatus.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle find by id errors', async () => {
      (prisma.saleStatus.findUnique as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(repository.findById('status-123')).rejects.toThrow('Database error');
    });
  });

  describe('list', () => {
    it('should list all statuses ordered by order', async () => {
      const statuses = [
        mockStatusData,
        { ...mockStatusData, id: 'status-456', name: 'Completed', order: 2 },
        { ...mockStatusData, id: 'status-789', name: 'Cancelled', order: 3, isFinal: true, isCancelled: true },
      ];
      (prisma.saleStatus.findMany as jest.Mock).mockResolvedValue(statuses);

      const result = await repository.list();

      expect(result).toHaveLength(3);
      expect(result[0]).toBeInstanceOf(SaleStatus);
      expect(prisma.saleStatus.findMany).toHaveBeenCalledWith({
        orderBy: { order: 'asc' },
      });
    });

    it('should return empty array when no statuses exist', async () => {
      (prisma.saleStatus.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repository.list();

      expect(result).toEqual([]);
    });

    it('should handle list errors', async () => {
      (prisma.saleStatus.findMany as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(repository.list()).rejects.toThrow('Database error');
    });
  });

  describe('findInitialStatus', () => {
    it('should find initial non-final status', async () => {
      (prisma.saleStatus.findFirst as jest.Mock).mockResolvedValue(mockStatusData);

      const result = await repository.findInitialStatus();

      expect(result).toBeInstanceOf(SaleStatus);
      expect(result?.isFinal).toBe(false);
      expect(prisma.saleStatus.findFirst).toHaveBeenCalledWith({
        orderBy: { order: 'asc' },
        where: { isFinal: false },
      });
    });

    it('should return null when no initial status exists', async () => {
      (prisma.saleStatus.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repository.findInitialStatus();

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create status with all fields', async () => {
      (prisma.saleStatus.create as jest.Mock).mockResolvedValue(mockStatusData);

      const result = await repository.create({
        name: 'Pending',
        order: 1,
        color: '#FFFF00',
        isFinal: false,
        isCancelled: false,
      });

      expect(result).toBeInstanceOf(SaleStatus);
      expect(prisma.saleStatus.create).toHaveBeenCalledWith({
        data: {
          name: 'Pending',
          order: 1,
          color: '#FFFF00',
          isFinal: false,
          isCancelled: false,
        },
      });
    });

    it('should create status with default values', async () => {
      const statusWithDefaults = { ...mockStatusData, color: null, isFinal: false, isCancelled: false };
      (prisma.saleStatus.create as jest.Mock).mockResolvedValue(statusWithDefaults);

      const result = await repository.create({
        name: 'Pending',
        order: 1,
      });

      expect(result).toBeInstanceOf(SaleStatus);
      expect(prisma.saleStatus.create).toHaveBeenCalledWith({
        data: {
          name: 'Pending',
          order: 1,
          color: null,
          isFinal: false,
          isCancelled: false,
        },
      });
    });

    it('should create status with null color', async () => {
      const statusWithNullColor = { ...mockStatusData, color: null };
      (prisma.saleStatus.create as jest.Mock).mockResolvedValue(statusWithNullColor);

      const result = await repository.create({
        name: 'Pending',
        order: 1,
        color: null,
      });

      expect(result).toBeInstanceOf(SaleStatus);
    });

    it('should handle creation errors', async () => {
      (prisma.saleStatus.create as jest.Mock).mockRejectedValueOnce(new Error('Duplicate order error'));

      await expect(
        repository.create({ name: 'Pending', order: 1 })
      ).rejects.toThrow('Duplicate order error');
    });
  });

  describe('update', () => {
    it('should update status', async () => {
      const updatedData = { ...mockStatusData, name: 'Updated Status' };
      (prisma.saleStatus.update as jest.Mock).mockResolvedValue(updatedData);

      const result = await repository.update('status-123', {
        name: 'Updated Status',
        color: '#FF0000',
      });

      expect(result).toBeInstanceOf(SaleStatus);
      expect(prisma.saleStatus.update).toHaveBeenCalledWith({
        where: { id: 'status-123' },
        data: {
          name: 'Updated Status',
          order: undefined,
          color: '#FF0000',
          isFinal: undefined,
          isCancelled: undefined,
        },
      });
    });

    it('should update only provided fields', async () => {
      (prisma.saleStatus.update as jest.Mock).mockResolvedValue(mockStatusData);

      await repository.update('status-123', { isFinal: true });

      expect(prisma.saleStatus.update).toHaveBeenCalledWith({
        where: { id: 'status-123' },
        data: {
          name: undefined,
          order: undefined,
          color: undefined,
          isFinal: true,
          isCancelled: undefined,
        },
      });
    });

    it('should update isCancelled field', async () => {
      const updatedData = { ...mockStatusData, isCancelled: true };
      (prisma.saleStatus.update as jest.Mock).mockResolvedValue(updatedData);

      await repository.update('status-123', { isCancelled: true });

      expect(prisma.saleStatus.update).toHaveBeenCalledWith({
        where: { id: 'status-123' },
        data: {
          name: undefined,
          order: undefined,
          color: undefined,
          isFinal: undefined,
          isCancelled: true,
        },
      });
    });

    it('should handle update errors', async () => {
      (prisma.saleStatus.update as jest.Mock).mockRejectedValueOnce(new Error('Status not found'));

      await expect(repository.update('status-123', { name: 'Test' })).rejects.toThrow('Status not found');
    });
  });

  describe('reorder', () => {
    it('should reorder multiple statuses in transaction', async () => {
      const orderList = [
        { id: 'status-1', order: 2 },
        { id: 'status-2', order: 1 },
        { id: 'status-3', order: 3 },
      ];

      (prisma.$transaction as jest.Mock).mockResolvedValue([]);
      (prisma.saleStatus.findMany as jest.Mock).mockResolvedValue([
        { ...mockStatusData, id: 'status-2', order: 1 },
        { ...mockStatusData, id: 'status-1', order: 2 },
        { ...mockStatusData, id: 'status-3', order: 3 },
      ]);

      const result = await repository.reorder(orderList);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(3);
      expect(result[0]).toBeInstanceOf(SaleStatus);
    });

    it('should reorder single status', async () => {
      const orderList = [{ id: 'status-1', order: 5 }];

      (prisma.$transaction as jest.Mock).mockResolvedValue([]);
      (prisma.saleStatus.findMany as jest.Mock).mockResolvedValue([
        { ...mockStatusData, id: 'status-1', order: 5 },
      ]);

      const result = await repository.reorder(orderList);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should handle empty reorder list', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([]);
      (prisma.saleStatus.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repository.reorder([]);

      expect(prisma.$transaction).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });

    it('should handle reorder errors', async () => {
      (prisma.$transaction as jest.Mock).mockRejectedValueOnce(new Error('Transaction failed'));

      await expect(
        repository.reorder([{ id: 'status-1', order: 1 }])
      ).rejects.toThrow('Transaction failed');
    });
  });

  describe('delete', () => {
    it('should delete status by id', async () => {
      (prisma.saleStatus.delete as jest.Mock).mockResolvedValue(mockStatusData);

      await repository.delete('status-123');

      expect(prisma.saleStatus.delete).toHaveBeenCalledWith({
        where: { id: 'status-123' },
      });
    });

    it('should handle delete errors', async () => {
      (prisma.saleStatus.delete as jest.Mock).mockRejectedValueOnce(new Error('Cannot delete'));

      await expect(repository.delete('status-123')).rejects.toThrow('Cannot delete');
    });
  });
});
