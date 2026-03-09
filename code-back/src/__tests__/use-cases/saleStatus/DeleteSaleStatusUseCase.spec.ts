import { DeleteSaleStatusUseCase } from '@application/use-cases/saleStatus/DeleteSaleStatusUseCase';
import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { SaleStatus } from '@domain/entities/SaleStatus';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError, NotFoundError, ValidationError } from '@application/shared/AppError';

describe('DeleteSaleStatusUseCase', () => {
  let useCase: DeleteSaleStatusUseCase;
  let mockRepository: jest.Mocked<ISaleStatusRepository>;

  const mockUser: CurrentUser = {
    id: 'user-123',
    role: 'administrador',
    firstName: 'Admin',
  };

  const regularStatus = new SaleStatus('status-1', 'En proceso', 2, '#00FF00', false, false, false);
  const systemStatus = new SaleStatus('status-sys', 'Sistema', 1, '#FFFFFF', false, false, true);
  const cancelledStatus = new SaleStatus('status-cancel', 'Cancelado', 5, '#FF0000', false, true, false);
  const finalStatus = new SaleStatus('status-final', 'Finalizado', 4, '#00FFFF', true, false, false);

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

    useCase = new DeleteSaleStatusUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should delete a regular status successfully', async () => {
      mockRepository.findById.mockResolvedValue(regularStatus);
      mockRepository.delete.mockResolvedValue(undefined);

      await useCase.execute('status-1', mockUser);

      expect(mockRepository.findById).toHaveBeenCalledWith('status-1');
      expect(mockRepository.delete).toHaveBeenCalledWith('status-1');
    });

    it('should throw NotFoundError when status does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent', mockUser)).rejects.toThrow(NotFoundError);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when trying to delete a system status', async () => {
      mockRepository.findById.mockResolvedValue(systemStatus);

      await expect(useCase.execute('status-sys', mockUser)).rejects.toThrow(ValidationError);
      await expect(useCase.execute('status-sys', mockUser)).rejects.toThrow(
        'No se puede eliminar un estado de sistema'
      );
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when trying to delete the cancelled status', async () => {
      mockRepository.findById.mockResolvedValue(cancelledStatus);

      await expect(useCase.execute('status-cancel', mockUser)).rejects.toThrow(ValidationError);
      await expect(useCase.execute('status-cancel', mockUser)).rejects.toThrow(
        'No se puede eliminar el estado de cancelación'
      );
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when trying to delete a final status', async () => {
      mockRepository.findById.mockResolvedValue(finalStatus);

      await expect(useCase.execute('status-final', mockUser)).rejects.toThrow(ValidationError);
      await expect(useCase.execute('status-final', mockUser)).rejects.toThrow(
        'No se puede eliminar un estado final'
      );
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw AuthorizationError for coordinador role', async () => {
      const coordinadorUser: CurrentUser = {
        id: 'user-456',
        role: 'coordinador',
        firstName: 'Coordinador',
      };

      await expect(useCase.execute('status-1', coordinadorUser)).rejects.toThrow(AuthorizationError);
      expect(mockRepository.findById).not.toHaveBeenCalled();
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw AuthorizationError for verificador role', async () => {
      const verificadorUser: CurrentUser = {
        id: 'user-789',
        role: 'verificador',
        firstName: 'Verificador',
      };

      await expect(useCase.execute('status-1', verificadorUser)).rejects.toThrow(AuthorizationError);
    });

    it('should handle repository errors on delete', async () => {
      mockRepository.findById.mockResolvedValue(regularStatus);
      mockRepository.delete.mockRejectedValue(new Error('DB error'));

      await expect(useCase.execute('status-1', mockUser)).rejects.toThrow('DB error');
    });
  });
});
