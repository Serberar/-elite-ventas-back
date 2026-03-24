import { ListSalesWithFiltersUseCase } from '@application/use-cases/sale/ListSalesWithFiltersUseCase';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { Sale } from '@domain/entities/Sale';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError } from '@application/shared/AppError';

describe('ListSalesWithFiltersUseCase', () => {
  let useCase: ListSalesWithFiltersUseCase;
  let mockRepository: jest.Mocked<ISaleRepository>;

  const mockUser: CurrentUser = {
    id: 'user-123',
    role: 'administrador',
    firstName: 'Admin',
    empresaId: '00000000-0000-0000-0000-000000000001',
  };

  const mockSales: Sale[] = [
    new Sale('sale-1', 'client-1', 'status-1', 100, null, null, null, null, null, new Date('2024-01-01'), new Date('2024-01-01'), null),
    new Sale('sale-2', 'client-2', 'status-2', 200, null, null, null, null, null, new Date('2024-01-02'), new Date('2024-01-02'), null),
  ];

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

    useCase = new ListSalesWithFiltersUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should return all sales with empty filters', async () => {
      mockRepository.list.mockResolvedValue(mockSales);

      const result = await useCase.execute({}, mockUser);

      expect(result).toEqual(mockSales);
      expect(mockRepository.list).toHaveBeenCalledWith({ empresaId: '00000000-0000-0000-0000-000000000001' });
    });

    it('should pass filters directly to repository', async () => {
      mockRepository.list.mockResolvedValue([mockSales[0]]);

      await useCase.execute({ statusId: 'status-1' }, mockUser);

      expect(mockRepository.list).toHaveBeenCalledWith({ statusId: 'status-1', empresaId: '00000000-0000-0000-0000-000000000001' });
    });

    it('should return empty array when no sales match', async () => {
      mockRepository.list.mockResolvedValue([]);

      const result = await useCase.execute({ statusId: 'non-existent' }, mockUser);

      expect(result).toEqual([]);
    });

    it('should work with coordinador role', async () => {
      const coordinadorUser: CurrentUser = { id: 'u2', role: 'coordinador', firstName: 'C', empresaId: '00000000-0000-0000-0000-000000000001' };
      mockRepository.list.mockResolvedValue(mockSales);

      const result = await useCase.execute({}, coordinadorUser);

      expect(result).toEqual(mockSales);
    });

    it('should work with coordinador role', async () => {
      const verificadorUser: CurrentUser = { id: 'u3', role: 'coordinador', firstName: 'V', empresaId: '00000000-0000-0000-0000-000000000001' };
      mockRepository.list.mockResolvedValue(mockSales);

      const result = await useCase.execute({}, verificadorUser);

      expect(result).toEqual(mockSales);
    });

    it('should work with comercial role', async () => {
      const comercialUser: CurrentUser = { id: 'u4', role: 'comercial', firstName: 'Com', empresaId: '00000000-0000-0000-0000-000000000001' };
      mockRepository.list.mockResolvedValue(mockSales);

      const result = await useCase.execute({}, comercialUser);
      expect(result).toEqual(mockSales);
      expect(mockRepository.list).toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      mockRepository.list.mockRejectedValue(new Error('DB error'));

      await expect(useCase.execute({}, mockUser)).rejects.toThrow('DB error');
    });
  });
});
