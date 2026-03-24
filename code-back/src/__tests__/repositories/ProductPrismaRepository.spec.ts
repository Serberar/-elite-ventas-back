import { ProductPrismaRepository } from '@infrastructure/prisma/ProductPrismaRepository';
import { prisma } from '@infrastructure/prisma/prismaClient';
import { Product } from '@domain/entities/Product';

jest.mock('@infrastructure/prisma/prismaClient', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
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

describe('ProductPrismaRepository', () => {
  let repository: ProductPrismaRepository;

  const mockProductData = {
    id: 'product-123',
    name: 'Test Product',
    description: 'Test description',
    sku: 'SKU-123',
    price: 99.99,
    active: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new ProductPrismaRepository();
  });

  describe('findAll', () => {
    it('should find all products ordered by name', async () => {
      const products = [
        mockProductData,
        { ...mockProductData, id: 'product-456', name: 'Another Product' },
      ];
      (prisma.product.findMany as jest.Mock).mockResolvedValue(products);

      const result = await repository.findAll('00000000-0000-0000-0000-000000000001');

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Product);
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { empresaId: '00000000-0000-0000-0000-000000000001' },
        orderBy: { name: 'asc' },
      });
    });

    it('should return empty array when no products exist', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repository.findAll('00000000-0000-0000-0000-000000000001');

      expect(result).toEqual([]);
    });

    it('should handle find all errors', async () => {
      const error = new Error('Database error');
      (prisma.product.findMany as jest.Mock).mockRejectedValue(error);

      await expect(repository.findAll('00000000-0000-0000-0000-000000000001')).rejects.toThrow(error);
    });
  });

  describe('findById', () => {
    it('should find product by id', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProductData);

      const result = await repository.findById('product-123');

      expect(result).toBeInstanceOf(Product);
      expect(result?.id).toBe('product-123');
      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-123' },
      });
    });

    it('should return null when product not found', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle find by id errors', async () => {
      const error = new Error('Database error');
      (prisma.product.findUnique as jest.Mock).mockRejectedValue(error);

      await expect(repository.findById('product-123')).rejects.toThrow(error);
    });
  });

  describe('findBySKU', () => {
    it('should find product by SKU', async () => {
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(mockProductData);

      const result = await repository.findBySKU('SKU-123', '00000000-0000-0000-0000-000000000001');

      expect(result).toBeInstanceOf(Product);
      expect(result?.sku).toBe('SKU-123');
      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { sku: 'SKU-123', empresaId: '00000000-0000-0000-0000-000000000001' },
      });
    });

    it('should return null when SKU not found', async () => {
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repository.findBySKU('nonexistent', '00000000-0000-0000-0000-000000000001');

      expect(result).toBeNull();
    });

    it('should handle find by SKU errors', async () => {
      const error = new Error('Database error');
      (prisma.product.findFirst as jest.Mock).mockRejectedValue(error);

      await expect(repository.findBySKU('SKU-123', '00000000-0000-0000-0000-000000000001')).rejects.toThrow(error);
    });
  });

  describe('create', () => {
    it('should create product with all fields', async () => {
      (prisma.product.create as jest.Mock).mockResolvedValue(mockProductData);

      const result = await repository.create({
        name: 'Test Product',
        description: 'Test description',
        sku: 'SKU-123',
        price: 99.99,
        empresaId: '00000000-0000-0000-0000-000000000001',
      });

      expect(result).toBeInstanceOf(Product);
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Product',
          description: 'Test description',
          sku: 'SKU-123',
          price: 99.99,
          active: true,
          empresaId: '00000000-0000-0000-0000-000000000001',
          tipo: 'unico',
          periodo: null,
          precioBase: null,
          precioConsumo: null,
          unidadConsumo: null,
        },
      });
    });

    it('should create product with null description and sku', async () => {
      const productWithNulls = { ...mockProductData, description: null, sku: null };
      (prisma.product.create as jest.Mock).mockResolvedValue(productWithNulls);

      const result = await repository.create({
        name: 'Test Product',
        price: 99.99,
        empresaId: '00000000-0000-0000-0000-000000000001',
      });

      expect(result).toBeInstanceOf(Product);
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Product',
          description: null,
          sku: null,
          price: 99.99,
          active: true,
          empresaId: '00000000-0000-0000-0000-000000000001',
          tipo: 'unico',
          periodo: null,
          precioBase: null,
          precioConsumo: null,
          unidadConsumo: null,
        },
      });
    });

    it('should handle creation errors', async () => {
      const error = new Error('Duplicate SKU');
      (prisma.product.create as jest.Mock).mockRejectedValue(error);

      await expect(
        repository.create({ name: 'Test', price: 99.99, empresaId: '00000000-0000-0000-0000-000000000001' })
      ).rejects.toThrow(error);
    });
  });

  describe('update', () => {
    it('should update product', async () => {
      const updatedData = { ...mockProductData, name: 'Updated Product', price: 149.99 };
      (prisma.product.update as jest.Mock).mockResolvedValue(updatedData);

      const result = await repository.update('product-123', {
        name: 'Updated Product',
        price: 149.99,
      });

      expect(result).toBeInstanceOf(Product);
      expect(result.name).toBe('Updated Product');
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-123' },
        data: {
          name: 'Updated Product',
          description: undefined,
          sku: undefined,
          price: 149.99,
        },
      });
    });

    it('should update only provided fields', async () => {
      (prisma.product.update as jest.Mock).mockResolvedValue(mockProductData);

      await repository.update('product-123', { price: 79.99 });

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-123' },
        data: {
          name: undefined,
          description: undefined,
          sku: undefined,
          price: 79.99,
        },
      });
    });

    it('should handle update errors', async () => {
      const error = new Error('Product not found');
      (prisma.product.update as jest.Mock).mockRejectedValue(error);

      await expect(repository.update('product-123', { name: 'Test' })).rejects.toThrow(error);
    });
  });

  describe('toggleActive', () => {
    it('should toggle active from true to false', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({ active: true });
      const inactiveProduct = { ...mockProductData, active: false };
      (prisma.product.update as jest.Mock).mockResolvedValue(inactiveProduct);

      const result = await repository.toggleActive('product-123');

      expect(result).toBeInstanceOf(Product);
      expect(result.active).toBe(false);
      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-123' },
        select: { active: true },
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-123' },
        data: { active: false },
      });
    });

    it('should toggle active from false to true', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({ active: false });
      (prisma.product.update as jest.Mock).mockResolvedValue(mockProductData);

      const result = await repository.toggleActive('product-123');

      expect(result).toBeInstanceOf(Product);
      expect(result.active).toBe(true);
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-123' },
        data: { active: true },
      });
    });

    it('should throw error when product not found', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(repository.toggleActive('nonexistent')).rejects.toThrow(
        'Product nonexistent not found'
      );
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('should handle toggle errors during update', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({ active: true });
      const error = new Error('Update failed');
      (prisma.product.update as jest.Mock).mockRejectedValue(error);

      await expect(repository.toggleActive('product-123')).rejects.toThrow(error);
    });

    it('should handle errors during find', async () => {
      const error = new Error('Database error');
      (prisma.product.findUnique as jest.Mock).mockRejectedValue(error);

      await expect(repository.toggleActive('product-123')).rejects.toThrow(error);
    });
  });
});
