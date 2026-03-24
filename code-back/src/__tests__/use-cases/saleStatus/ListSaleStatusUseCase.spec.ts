import { ListSaleStatusUseCase } from '@application/use-cases/saleStatus/ListSaleStatusUseCase';
import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { SaleStatus } from '@domain/entities/SaleStatus';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError } from '@application/shared/AppError';

describe('ListSaleStatusUseCase', () => {
  let useCase: ListSaleStatusUseCase;
  let mockRepository: jest.Mocked<ISaleStatusRepository>;

  const mockUser: CurrentUser = {
    id: 'user-123',
    role: 'administrador',
    firstName: 'Test',
    empresaId: '00000000-0000-0000-0000-000000000001',
  };

  const mockStatuses = [
    new SaleStatus('status-1', 'Pending', 1, '#FFFF00', false, false, false),
    new SaleStatus('status-2', 'Completed', 2, '#00FF00', false, false, false),
    new SaleStatus('status-3', 'Cancelled', 3, '#FF0000', true, true, false),
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      findById: jest.fn(),
      findInitialStatus: jest.fn(),
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      reorder: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new ListSaleStatusUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should list all sale statuses', async () => {
      mockRepository.list.mockResolvedValue(mockStatuses);

      const result = await useCase.execute(mockUser);

      expect(result).toEqual(mockStatuses);
      expect(result.length).toBe(3);
      expect(mockRepository.list).toHaveBeenCalled();
    });

    it('should return empty array when no statuses exist', async () => {
      mockRepository.list.mockResolvedValue([]);

      const result = await useCase.execute(mockUser);

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should work with coordinador role', async () => {
      const coordinadorUser: CurrentUser = {
        id: 'user-456',
        role: 'coordinador',
        firstName: 'Coordinador',
        empresaId: '00000000-0000-0000-0000-000000000001',
      };

      mockRepository.list.mockResolvedValue(mockStatuses);

      const result = await useCase.execute(coordinadorUser);

      expect(result).toEqual(mockStatuses);
    });

    it('should work with coordinador role', async () => {
      const verificadorUser: CurrentUser = {
        id: 'user-789',
        role: 'coordinador',
        firstName: 'Verificador',
        empresaId: '00000000-0000-0000-0000-000000000001',
      };

      mockRepository.list.mockResolvedValue(mockStatuses);

      const result = await useCase.execute(verificadorUser);

      expect(result).toEqual(mockStatuses);
    });

    it('should work with comercial role', async () => {
      const comercialUser: CurrentUser = {
        id: 'user-999',
        role: 'comercial',
        firstName: 'Comercial',
        empresaId: '00000000-0000-0000-0000-000000000001',
      };

      mockRepository.list.mockResolvedValue(mockStatuses);

      const result = await useCase.execute(comercialUser);
      expect(result).toEqual(mockStatuses);
      expect(mockRepository.list).toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      const dbError = new Error('Database error');
      mockRepository.list.mockRejectedValue(dbError);

      await expect(useCase.execute(mockUser)).rejects.toThrow(dbError);
    });
  });
});
