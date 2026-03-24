import { GetProductUseCase } from '@application/use-cases/product/GetProductUseCase';
import { IProductRepository } from '@domain/repositories/IProductRepository';
import { Product } from '@domain/entities/Product';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError } from '@application/shared/AppError';

jest.mock('@infrastructure/observability/logger/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('GetProductUseCase', () => {
  let useCase: GetProductUseCase;
  let mockRepository: jest.Mocked<IProductRepository>;

  const mockUser: CurrentUser = {
    id: 'user-123',
    role: 'administrador',
    firstName: 'Test',
    empresaId: '00000000-0000-0000-0000-000000000001',
  };

  const mockProduct = new Product(
    'product-123',
    'Test Product',
    'Test Description',
    'SKU-123',
    99.99,
    true,
    new Date('2024-01-01'),
    new Date('2024-01-01'),
    'unico',
    null,
    null,
    null,
    null,
    '00000000-0000-0000-0000-000000000001'
  );

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findAllPaginated: jest.fn(),
      update: jest.fn(),
      toggleActive: jest.fn(),
      findBySKU: jest.fn(),
    };

    useCase = new GetProductUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should return product when found', async () => {
      mockRepository.findById.mockResolvedValue(mockProduct);

      const result = await useCase.execute('product-123', mockUser);

      expect(result).toEqual(mockProduct);
      expect(mockRepository.findById).toHaveBeenCalledWith('product-123');
    });

    it('should throw error when product does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent-id', mockUser)).rejects.toThrow(
        'Producto con ID non-existent-id no encontrado'
      );
      expect(mockRepository.findById).toHaveBeenCalledWith('non-existent-id');
    });

    it('should work with coordinador role', async () => {
      const userWithPermission: CurrentUser = {
        id: 'user-456',
        role: 'coordinador',
        firstName: 'Viewer',
        empresaId: '00000000-0000-0000-0000-000000000001',
      };

      mockRepository.findById.mockResolvedValue(mockProduct);

      const result = await useCase.execute('product-123', userWithPermission);

      expect(result).toEqual(mockProduct);
      expect(mockRepository.findById).toHaveBeenCalledWith('product-123');
    });

    it('should work with MANAGER role', async () => {
      const managerUser: CurrentUser = {
        id: 'user-789',
        role: 'coordinador',
        firstName: 'Manager',
        empresaId: '00000000-0000-0000-0000-000000000001',
      };

      mockRepository.findById.mockResolvedValue(mockProduct);

      const result = await useCase.execute('product-123', managerUser);

      expect(result).toEqual(mockProduct);
    });

    it('should allow comercial role (all roles can access)', async () => {
      const comercialUser: CurrentUser = {
        id: 'user-999',
        role: 'comercial',
        firstName: 'User',
        empresaId: '00000000-0000-0000-0000-000000000001',
      };

      mockRepository.findById.mockResolvedValue(mockProduct);

      const result = await useCase.execute('product-123', comercialUser);

      expect(result).toEqual(mockProduct);
      expect(mockRepository.findById).toHaveBeenCalledWith('product-123');
    });

    it('should throw AuthorizationError for unknown role', async () => {
      const unknownUser: CurrentUser = {
        id: 'user-999',
        role: 'unknown_role' as any,
        firstName: 'User',
        empresaId: '00000000-0000-0000-0000-000000000001',
      };

      await expect(useCase.execute('product-123', unknownUser)).rejects.toThrow(
        AuthorizationError
      );
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      const dbError = new Error('Database error');
      mockRepository.findById.mockRejectedValue(dbError);

      await expect(useCase.execute('product-123', mockUser)).rejects.toThrow(dbError);
    });

    it('should return inactive products', async () => {
      const inactiveProduct = new Product(
        'product-123',
        'Test Product',
        'Test Description',
        'SKU-123',
        99.99,
        false,
        new Date('2024-01-01'),
        new Date('2024-01-01'),
        'unico',
        null,
        null,
        null,
        null,
        '00000000-0000-0000-0000-000000000001'
      );

      mockRepository.findById.mockResolvedValue(inactiveProduct);

      const result = await useCase.execute('product-123', mockUser);

      expect(result).toEqual(inactiveProduct);
      expect(result.active).toBe(false);
    });

    it('should return products with null fields', async () => {
      const productWithNulls = new Product(
        'product-123',
        'Test Product',
        null,
        null,
        99.99,
        true,
        new Date('2024-01-01'),
        new Date('2024-01-01'),
        'unico',
        null,
        null,
        null,
        null,
        '00000000-0000-0000-0000-000000000001'
      );

      mockRepository.findById.mockResolvedValue(productWithNulls);

      const result = await useCase.execute('product-123', mockUser);

      expect(result).toEqual(productWithNulls);
      expect(result.description).toBeNull();
      expect(result.sku).toBeNull();
    });

    it('should handle UUID formatted IDs', async () => {
      const uuidId = '550e8400-e29b-41d4-a716-446655440000';

      const productWithUuid = new Product(
        uuidId,
        'Test Product',
        'Test Description',
        'SKU-123',
        99.99,
        true,
        new Date('2024-01-01'),
        new Date('2024-01-01'),
        'unico',
        null,
        null,
        null,
        null,
        '00000000-0000-0000-0000-000000000001'
      );

      mockRepository.findById.mockResolvedValue(productWithUuid);

      const result = await useCase.execute(uuidId, mockUser);

      expect(result.id).toBe(uuidId);
      expect(mockRepository.findById).toHaveBeenCalledWith(uuidId);
    });
  });
});
