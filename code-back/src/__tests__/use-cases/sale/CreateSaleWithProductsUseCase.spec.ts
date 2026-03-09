import { CreateSaleWithProductsUseCase } from '@application/use-cases/sale/CreateSaleWithProductsUseCase';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { IProductRepository } from '@domain/repositories/IProductRepository';
import { Sale } from '@domain/entities/Sale';
import { SaleStatus } from '@domain/entities/SaleStatus';
import { Product } from '@domain/entities/Product';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError, NotFoundError, ValidationError } from '@application/shared/AppError';

jest.mock('@infrastructure/observability/metrics/prometheusMetrics', () => ({
  businessSalesCreated: { inc: jest.fn() },
  businessSaleItemsAdded: { inc: jest.fn() },
}));

describe('CreateSaleWithProductsUseCase', () => {
  let useCase: CreateSaleWithProductsUseCase;
  let mockSaleRepo: jest.Mocked<ISaleRepository>;
  let mockStatusRepo: jest.Mocked<ISaleStatusRepository>;
  let mockProductRepo: jest.Mocked<IProductRepository>;

  const mockUser: CurrentUser = {
    id: 'user-123',
    role: 'administrador',
    firstName: 'Admin',
  };

  const initialStatus = new SaleStatus('status-initial', 'Inicial', 1, '#FFF', false, false, true);

  const mockProduct = new Product(
    'prod-1', 'Test Product', 'SKU-001', 'Description', 99.99, true, new Date(), new Date()
  );

  const mockCreatedSale = new Sale(
    'sale-new', 'client-1', 'status-initial', 199.98, null, null,
    { id: 'client-1', firstName: 'John' }, null, null,
    new Date(), new Date(), null
  );

  const validDto = {
    client: { id: 'client-1', firstName: 'John', lastName: 'Doe' },
    items: [{ productId: 'prod-1', name: 'Test Product', price: 99.99, quantity: 2 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSaleRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findWithRelations: jest.fn(),
      update: jest.fn(),
      addItem: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
      addHistory: jest.fn(),
      list: jest.fn(),
      listPaginated: jest.fn(),
      listWithRelations: jest.fn(),
      listPaginatedWithRelations: jest.fn(),
      createWithItemsTransaction: jest.fn(),
      assignUser: jest.fn(),
      updateClientSnapshot: jest.fn(),
      getDistinctComerciales: jest.fn(),
    };

    mockStatusRepo = {
      findById: jest.fn(),
      list: jest.fn(),
      findInitialStatus: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      reorder: jest.fn(),
      delete: jest.fn(),
    };

    mockProductRepo = {
      findAll: jest.fn(),
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      findBySKU: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      toggleActive: jest.fn(),
    };

    useCase = new CreateSaleWithProductsUseCase(mockSaleRepo, mockStatusRepo, mockProductRepo);
  });

  describe('execute', () => {
    it('should create sale with products and initial status', async () => {
      mockStatusRepo.findInitialStatus.mockResolvedValue(initialStatus);
      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockSaleRepo.createWithItemsTransaction.mockResolvedValue(mockCreatedSale);

      const result = await useCase.execute(validDto as any, mockUser);

      expect(result).toEqual(mockCreatedSale);
      expect(mockStatusRepo.findInitialStatus).toHaveBeenCalled();
      expect(mockProductRepo.findById).toHaveBeenCalledWith('prod-1');
      expect(mockSaleRepo.createWithItemsTransaction).toHaveBeenCalled();
    });

    it('should use provided statusId when given', async () => {
      const dtoWithStatus = { ...validDto, statusId: 'status-custom' };
      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockSaleRepo.createWithItemsTransaction.mockResolvedValue(mockCreatedSale);

      await useCase.execute(dtoWithStatus as any, mockUser);

      expect(mockStatusRepo.findInitialStatus).not.toHaveBeenCalled();
      expect(mockSaleRepo.createWithItemsTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ statusId: 'status-custom' })
      );
    });

    it('should throw ValidationError when client has no id', async () => {
      const dtoWithoutClientId = {
        ...validDto,
        client: { firstName: 'John', lastName: 'Doe' },
      };

      await expect(useCase.execute(dtoWithoutClientId as any, mockUser)).rejects.toThrow(
        ValidationError
      );
      await expect(useCase.execute(dtoWithoutClientId as any, mockUser)).rejects.toThrow(
        'El cliente es obligatorio y debe tener un id válido'
      );
    });

    it('should throw ValidationError when no initial status found', async () => {
      mockStatusRepo.findInitialStatus.mockResolvedValue(null);

      await expect(useCase.execute(validDto as any, mockUser)).rejects.toThrow(ValidationError);
      await expect(useCase.execute(validDto as any, mockUser)).rejects.toThrow(
        'No se encontró un estado inicial para las ventas'
      );
    });

    it('should throw NotFoundError when product not found', async () => {
      mockStatusRepo.findInitialStatus.mockResolvedValue(initialStatus);
      mockProductRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute(validDto as any, mockUser)).rejects.toThrow(NotFoundError);
    });

    it('should create sale with items without productId', async () => {
      const dtoWithoutProductId = {
        client: { id: 'client-1', firstName: 'John' },
        items: [{ name: 'Custom Service', price: 50, quantity: 1 }],
      };
      mockStatusRepo.findInitialStatus.mockResolvedValue(initialStatus);
      mockSaleRepo.createWithItemsTransaction.mockResolvedValue(mockCreatedSale);

      const result = await useCase.execute(dtoWithoutProductId as any, mockUser);

      expect(result).toEqual(mockCreatedSale);
      expect(mockProductRepo.findById).not.toHaveBeenCalled();
    });

    it('should work with coordinador role', async () => {
      const coordinadorUser: CurrentUser = { id: 'u2', role: 'coordinador', firstName: 'C' };
      mockStatusRepo.findInitialStatus.mockResolvedValue(initialStatus);
      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockSaleRepo.createWithItemsTransaction.mockResolvedValue(mockCreatedSale);

      const result = await useCase.execute(validDto as any, coordinadorUser);

      expect(result).toEqual(mockCreatedSale);
    });

    it('should work with comercial role', async () => {
      const comercialUser: CurrentUser = { id: 'u4', role: 'comercial', firstName: 'Com' };
      mockStatusRepo.findInitialStatus.mockResolvedValue(initialStatus);
      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockSaleRepo.createWithItemsTransaction.mockResolvedValue(mockCreatedSale);

      const result = await useCase.execute(validDto as any, comercialUser);

      expect(result).toEqual(mockCreatedSale);
    });

    it('should throw AuthorizationError for unknown role', async () => {
      const unknownUser: CurrentUser = { id: 'u5', role: 'unknown_role' as any, firstName: 'U' };

      await expect(useCase.execute(validDto as any, unknownUser)).rejects.toThrow(AuthorizationError);
    });

    it('should increment metrics on success', async () => {
      const { businessSalesCreated, businessSaleItemsAdded } = require('@infrastructure/observability/metrics/prometheusMetrics');
      mockStatusRepo.findInitialStatus.mockResolvedValue(initialStatus);
      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockSaleRepo.createWithItemsTransaction.mockResolvedValue(mockCreatedSale);

      await useCase.execute(validDto as any, mockUser);

      expect(businessSalesCreated.inc).toHaveBeenCalled();
      expect(businessSaleItemsAdded.inc).toHaveBeenCalledWith(1);
    });

    it('should pass comercial field when provided', async () => {
      const dtoWithComercial = { ...validDto, comercial: 'agente-juan' };
      mockStatusRepo.findInitialStatus.mockResolvedValue(initialStatus);
      mockProductRepo.findById.mockResolvedValue(mockProduct);
      mockSaleRepo.createWithItemsTransaction.mockResolvedValue(mockCreatedSale);

      await useCase.execute(dtoWithComercial as any, mockUser);

      expect(mockSaleRepo.createWithItemsTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ comercial: 'agente-juan' })
      );
    });
  });
});
