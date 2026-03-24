import { UpdateSaleItemUseCase } from '@application/use-cases/sale/UpdateSaleItemUseCase';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { Sale } from '@domain/entities/Sale';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError } from '@application/shared/AppError';

jest.mock('@infrastructure/observability/metrics/prometheusMetrics', () => ({
  businessSaleItemsUpdated: {
    inc: jest.fn(),
  },
}));

describe('UpdateSaleItemUseCase', () => {
  let useCase: UpdateSaleItemUseCase;
  let mockRepository: jest.Mocked<ISaleRepository>;

  const mockUser: CurrentUser = {
    id: 'user-123',
    role: 'administrador',
    firstName: 'Admin',
    empresaId: '00000000-0000-0000-0000-000000000001',
  };

  const mockSale = new Sale(
    'sale-123', 'client-1', 'status-1', 100, null, null, null, null, null,
    new Date('2024-01-01'), new Date('2024-01-01'), null, '00000000-0000-0000-0000-000000000001'
  );

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
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

    mockRepository.findById.mockResolvedValue(mockSale);
    useCase = new UpdateSaleItemUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should update a single sale item', async () => {
      const dto = {
        saleId: 'sale-123',
        items: [{ id: 'item-1', unitPrice: 150, quantity: 3, finalPrice: 450 }],
      };
      mockRepository.updateItem.mockResolvedValue({} as any);
      mockRepository.addHistory.mockResolvedValue({} as any);

      await useCase.execute(dto, mockUser);

      expect(mockRepository.updateItem).toHaveBeenCalledWith('item-1', {
        unitPrice: 150,
        quantity: 3,
        finalPrice: 450,
      });
      expect(mockRepository.addHistory).toHaveBeenCalledWith({
        saleId: 'sale-123',
        userId: 'user-123',
        action: 'update_item',
        payload: dto.items[0],
      });
    });

    it('should update multiple sale items', async () => {
      const dto = {
        saleId: 'sale-123',
        items: [
          { id: 'item-1', unitPrice: 100, quantity: 2, finalPrice: 200 },
          { id: 'item-2', unitPrice: 50, quantity: 4, finalPrice: 200 },
        ],
      };
      mockRepository.updateItem.mockResolvedValue({} as any);
      mockRepository.addHistory.mockResolvedValue({} as any);

      await useCase.execute(dto, mockUser);

      expect(mockRepository.updateItem).toHaveBeenCalledTimes(2);
      expect(mockRepository.addHistory).toHaveBeenCalledTimes(2);
    });

    it('should increment metrics with item count', async () => {
      const { businessSaleItemsUpdated } = require('@infrastructure/observability/metrics/prometheusMetrics');
      const dto = {
        saleId: 'sale-123',
        items: [
          { id: 'item-1', unitPrice: 100, quantity: 2, finalPrice: 200 },
          { id: 'item-2', unitPrice: 50, quantity: 4, finalPrice: 200 },
        ],
      };
      mockRepository.updateItem.mockResolvedValue({} as any);
      mockRepository.addHistory.mockResolvedValue({} as any);

      await useCase.execute(dto, mockUser);

      expect(businessSaleItemsUpdated.inc).toHaveBeenCalledWith(2);
    });

    it('should work with coordinador role', async () => {
      const coordinadorUser: CurrentUser = { id: 'u2', role: 'coordinador', firstName: 'C', empresaId: '00000000-0000-0000-0000-000000000001' };
      const dto = { saleId: 'sale-123', items: [{ id: 'item-1', unitPrice: 100, quantity: 1, finalPrice: 100 }] };
      mockRepository.updateItem.mockResolvedValue({} as any);
      mockRepository.addHistory.mockResolvedValue({} as any);

      await useCase.execute(dto, coordinadorUser);

      expect(mockRepository.updateItem).toHaveBeenCalled();
    });

    it('should work with comercial role', async () => {
      const comercialUser: CurrentUser = { id: 'u4', role: 'comercial', firstName: 'Com', empresaId: '00000000-0000-0000-0000-000000000001' };
      const dto = { saleId: 'sale-123', items: [{ id: 'item-1', unitPrice: 100, quantity: 1, finalPrice: 100 }] };

      mockRepository.updateItem.mockResolvedValue({} as any);
      mockRepository.addHistory.mockResolvedValue({} as any);

      await useCase.execute(dto, comercialUser);
      expect(mockRepository.updateItem).toHaveBeenCalled();
    });

    it('should handle empty items array without error', async () => {
      const dto = { saleId: 'sale-123', items: [] };

      await useCase.execute(dto, mockUser);

      expect(mockRepository.updateItem).not.toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      const dto = { saleId: 'sale-123', items: [{ id: 'item-1', unitPrice: 100, quantity: 1, finalPrice: 100 }] };
      mockRepository.updateItem.mockRejectedValue(new Error('DB error'));

      await expect(useCase.execute(dto, mockUser)).rejects.toThrow('DB error');
    });
  });
});
