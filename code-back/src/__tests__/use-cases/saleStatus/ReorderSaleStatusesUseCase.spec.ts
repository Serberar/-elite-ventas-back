import { ReorderSaleStatusesUseCase } from '@application/use-cases/saleStatus/ReorderSaleStatusesUseCase';
import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { SaleStatus } from '@domain/entities/SaleStatus';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError } from '@application/shared/AppError';

describe('ReorderSaleStatusesUseCase', () => {
  let useCase: ReorderSaleStatusesUseCase;
  let mockRepository: jest.Mocked<ISaleStatusRepository>;

  const mockUser: CurrentUser = {
    id: 'user-123',
    role: 'administrador',
    firstName: 'Admin',
  };

  const reorderedStatuses: SaleStatus[] = [
    new SaleStatus('status-1', 'Primero', 1, '#FF0000', false, false, false),
    new SaleStatus('status-2', 'Segundo', 2, '#00FF00', false, false, false),
    new SaleStatus('status-3', 'Tercero', 3, '#0000FF', false, false, false),
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      findById: jest.fn(),
      list: jest.fn(),
      findInitialStatus: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      reorder: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new ReorderSaleStatusesUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should reorder statuses successfully', async () => {
      const dto = {
        statuses: [
          { id: 'status-1', order: 1 },
          { id: 'status-2', order: 2 },
          { id: 'status-3', order: 3 },
        ],
      };
      mockRepository.reorder.mockResolvedValue(reorderedStatuses);

      const result = await useCase.execute(dto, mockUser);

      expect(result).toEqual(reorderedStatuses);
      expect(mockRepository.reorder).toHaveBeenCalledWith(dto.statuses);
    });

    it('should handle single status reorder', async () => {
      const dto = { statuses: [{ id: 'status-1', order: 1 }] };
      mockRepository.reorder.mockResolvedValue([reorderedStatuses[0]]);

      const result = await useCase.execute(dto, mockUser);

      expect(result.length).toBe(1);
    });

    it('should pass the statuses array directly to repository', async () => {
      const orderList = [
        { id: 'status-3', order: 1 },
        { id: 'status-1', order: 2 },
        { id: 'status-2', order: 3 },
      ];
      mockRepository.reorder.mockResolvedValue(reorderedStatuses);

      await useCase.execute({ statuses: orderList }, mockUser);

      expect(mockRepository.reorder).toHaveBeenCalledWith(orderList);
    });

    it('should throw AuthorizationError for coordinador role', async () => {
      const coordinadorUser: CurrentUser = {
        id: 'user-456',
        role: 'coordinador',
        firstName: 'Coordinador',
      };

      await expect(useCase.execute({ statuses: [] }, coordinadorUser)).rejects.toThrow(
        AuthorizationError
      );
      expect(mockRepository.reorder).not.toHaveBeenCalled();
    });

    it('should throw AuthorizationError for verificador role', async () => {
      const verificadorUser: CurrentUser = {
        id: 'user-789',
        role: 'verificador',
        firstName: 'Verificador',
      };

      await expect(useCase.execute({ statuses: [] }, verificadorUser)).rejects.toThrow(
        AuthorizationError
      );
    });

    it('should throw AuthorizationError for comercial role', async () => {
      const comercialUser: CurrentUser = {
        id: 'user-999',
        role: 'comercial',
        firstName: 'Comercial',
      };

      await expect(useCase.execute({ statuses: [] }, comercialUser)).rejects.toThrow(
        AuthorizationError
      );
    });

    it('should handle repository errors', async () => {
      const dbError = new Error('Database error');
      mockRepository.reorder.mockRejectedValue(dbError);

      await expect(
        useCase.execute({ statuses: [{ id: 'status-1', order: 1 }] }, mockUser)
      ).rejects.toThrow(dbError);
    });
  });
});
