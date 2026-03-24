import { RemoveSaleItemUseCase } from '@application/use-cases/sale/RemoveSaleItemUseCase';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { Sale } from '@domain/entities/Sale';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError } from '@application/shared/AppError';

jest.mock('@infrastructure/observability/metrics/prometheusMetrics', () => ({
  businessSaleItemsDeleted: {
    inc: jest.fn(),
  },
}));

describe('RemoveSaleItemUseCase', () => {
  let useCase: RemoveSaleItemUseCase;
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
    useCase = new RemoveSaleItemUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should remove sale item successfully', async () => {
      mockRepository.removeItem.mockResolvedValue(undefined);
      mockRepository.addHistory.mockResolvedValue({} as any);

      await useCase.execute('sale-123', 'item-456', mockUser);

      expect(mockRepository.removeItem).toHaveBeenCalledWith('item-456');
      expect(mockRepository.addHistory).toHaveBeenCalledWith({
        saleId: 'sale-123',
        userId: 'user-123',
        action: 'delete_item',
        payload: { itemId: 'item-456' },
      });
    });

    it('should increment metrics on delete', async () => {
      const { businessSaleItemsDeleted } = require('@infrastructure/observability/metrics/prometheusMetrics');
      mockRepository.removeItem.mockResolvedValue(undefined);
      mockRepository.addHistory.mockResolvedValue({} as any);

      await useCase.execute('sale-123', 'item-456', mockUser);

      expect(businessSaleItemsDeleted.inc).toHaveBeenCalled();
    });

    it('should work with coordinador role', async () => {
      const coordinadorUser: CurrentUser = { id: 'u2', role: 'coordinador', firstName: 'C', empresaId: '00000000-0000-0000-0000-000000000001' };
      mockRepository.removeItem.mockResolvedValue(undefined);
      mockRepository.addHistory.mockResolvedValue({} as any);

      await useCase.execute('sale-123', 'item-456', coordinadorUser);

      expect(mockRepository.removeItem).toHaveBeenCalled();
    });

    it('should work with coordinador role', async () => {
      const verificadorUser: CurrentUser = { id: 'u3', role: 'coordinador', firstName: 'V', empresaId: '00000000-0000-0000-0000-000000000001' };
      mockRepository.removeItem.mockResolvedValue(undefined);
      mockRepository.addHistory.mockResolvedValue({} as any);

      await useCase.execute('sale-123', 'item-456', verificadorUser);

      expect(mockRepository.removeItem).toHaveBeenCalled();
    });

    it('should work with comercial role', async () => {
      const comercialUser: CurrentUser = { id: 'u4', role: 'comercial', firstName: 'Com', empresaId: '00000000-0000-0000-0000-000000000001' };

      mockRepository.removeItem.mockResolvedValue(undefined);
      mockRepository.addHistory.mockResolvedValue({} as any);

      await useCase.execute('sale-123', 'item-456', comercialUser);
      expect(mockRepository.removeItem).toHaveBeenCalled();
    });

    it('should handle repository errors on removeItem', async () => {
      mockRepository.removeItem.mockRejectedValue(new Error('DB error'));

      await expect(useCase.execute('sale-123', 'item-456', mockUser)).rejects.toThrow('DB error');
    });

    it('should call removeItem before addHistory', async () => {
      const callOrder: string[] = [];
      mockRepository.removeItem.mockImplementation(async () => { callOrder.push('removeItem'); });
      mockRepository.addHistory.mockImplementation(async () => { callOrder.push('addHistory'); return {} as any; });

      await useCase.execute('sale-123', 'item-456', mockUser);

      expect(callOrder).toEqual(['removeItem', 'addHistory']);
    });
  });
});
