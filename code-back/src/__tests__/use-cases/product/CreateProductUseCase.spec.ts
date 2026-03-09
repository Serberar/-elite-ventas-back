import { CreateProductUseCase } from '@application/use-cases/product/CreateProductUseCase';
import { IProductRepository } from '@domain/repositories/IProductRepository';
import { Product } from '@domain/entities/Product';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError } from '@application/shared/AppError';
import crypto from 'crypto';

jest.mock('crypto');
jest.mock('@infrastructure/observability/logger/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('@infrastructure/observability/metrics/prometheusMetrics', () => ({
  businessProductsCreated: {
    inc: jest.fn(),
  },
}));

describe('CreateProductUseCase', () => {
  let useCase: CreateProductUseCase;
  let mockRepository: jest.Mocked<IProductRepository>;

  const mockUser: CurrentUser = {
    id: 'user-123',
    role: 'administrador',
    firstName: 'Test',
  };

  const mockProductData = {
    name: 'Test Product',
    description: 'Test Description',
    sku: 'SKU-123',
    price: 99.99,
  };

  const mockProduct = new Product(
    'product-123',
    'Test Product',
    'Test Description',
    'SKU-123',
    99.99,
    true,
    new Date(),
    new Date()
  );

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findAllPaginated: jest.fn(),
      findBySKU: jest.fn(),
      update: jest.fn(),
      toggleActive: jest.fn(),
    };

    useCase = new CreateProductUseCase(mockRepository);

    (crypto.randomUUID as jest.Mock).mockReturnValue('product-123');
  });

  describe('execute', () => {
    it('should create a product successfully with all fields', async () => {
      mockRepository.create.mockResolvedValue(mockProduct);

      const result = await useCase.execute(mockProductData, mockUser);

      expect(result).toEqual(mockProduct);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'product-123',
          name: 'Test Product',
          description: 'Test Description',
          sku: 'SKU-123',
          price: 99.99,
          active: true,
        })
      );
    });

    it('should create a product with null description and sku', async () => {
      const minimalData = {
        name: 'Minimal Product',
        price: 49.99,
      };

      const minimalProduct = new Product(
        'product-123',
        'Minimal Product',
        null,
        null,
        49.99,
        true,
        new Date(),
        new Date()
      );

      mockRepository.create.mockResolvedValue(minimalProduct);

      const result = await useCase.execute(minimalData, mockUser);

      expect(result).toEqual(minimalProduct);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Minimal Product',
          description: null,
          sku: null,
          price: 49.99,
        })
      );
    });

    it('should throw AuthorizationError when user lacks permission', async () => {
      const userWithoutPermission: CurrentUser = {
        id: 'user-456',
        role: 'verificador',
        firstName: 'Viewer',
      };

      await expect(useCase.execute(mockProductData, userWithoutPermission)).rejects.toThrow(
        AuthorizationError
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should generate a unique UUID for the product', async () => {
      (crypto.randomUUID as jest.Mock).mockReturnValue('unique-uuid-123');

      mockRepository.create.mockResolvedValue(mockProduct);

      await useCase.execute(mockProductData, mockUser);

      expect(crypto.randomUUID).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'unique-uuid-123',
        })
      );
    });

    it('should set product as active by default', async () => {
      mockRepository.create.mockResolvedValue(mockProduct);

      await useCase.execute(mockProductData, mockUser);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          active: true,
        })
      );
    });

    it('should handle repository errors', async () => {
      const dbError = new Error('Database error');
      mockRepository.create.mockRejectedValue(dbError);

      await expect(useCase.execute(mockProductData, mockUser)).rejects.toThrow(dbError);
    });

    it('should only work with administrador role', async () => {
      // Verify that only administrador role can create products
      mockRepository.create.mockResolvedValue(mockProduct);

      const result = await useCase.execute(mockProductData, mockUser);

      expect(result).toEqual(mockProduct);
      expect(mockRepository.create).toHaveBeenCalled();

      // Verify other roles cannot create
      const coordinadorUser: CurrentUser = {
        id: 'user-789',
        role: 'coordinador',
        firstName: 'Coordinador',
      };

      await expect(useCase.execute(mockProductData, coordinadorUser)).rejects.toThrow(
        AuthorizationError
      );
    });

    it('should handle numeric price correctly', async () => {
      const dataWithPrice = {
        ...mockProductData,
        price: 0.01,
      };

      const productWithPrice = new Product(
        'product-123',
        'Test Product',
        'Test Description',
        'SKU-123',
        0.01,
        true,
        new Date(),
        new Date()
      );

      mockRepository.create.mockResolvedValue(productWithPrice);

      await useCase.execute(dataWithPrice, mockUser);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 0.01,
        })
      );
    });

    it('should handle large prices', async () => {
      const dataWithLargePrice = {
        ...mockProductData,
        price: 999999.99,
      };

      const productWithLargePrice = new Product(
        'product-123',
        'Test Product',
        'Test Description',
        'SKU-123',
        999999.99,
        true,
        new Date(),
        new Date()
      );

      mockRepository.create.mockResolvedValue(productWithLargePrice);

      await useCase.execute(dataWithLargePrice, mockUser);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 999999.99,
        })
      );
    });

    it('should create products with special characters in name', async () => {
      const specialData = {
        ...mockProductData,
        name: 'Product™ & Co. (2024)',
      };

      const productWithSpecialName = new Product(
        'product-123',
        'Product™ & Co. (2024)',
        'Test Description',
        'SKU-123',
        99.99,
        true,
        new Date(),
        new Date()
      );

      mockRepository.create.mockResolvedValue(productWithSpecialName);

      await useCase.execute(specialData, mockUser);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Product™ & Co. (2024)',
        })
      );
    });
  });
});
