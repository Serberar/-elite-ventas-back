import { UpdateSaleStatusUseCase } from '@application/use-cases/saleStatus/UpdateSaleStatusUseCase';
import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { SaleStatus } from '@domain/entities/SaleStatus';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError, NotFoundError, ValidationError } from '@application/shared/AppError';

describe('UpdateSaleStatusUseCase', () => {
  let useCase: UpdateSaleStatusUseCase;
  let mockRepository: jest.Mocked<ISaleStatusRepository>;

  const mockUser: CurrentUser = {
    id: 'user-123',
    role: 'administrador',
    firstName: 'Test',
    empresaId: '00000000-0000-0000-0000-000000000001',
  };

  const existingStatus = new SaleStatus('status-1', 'Existing Status', 1, '#000000', false, false, false, '00000000-0000-0000-0000-000000000001');

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

    mockRepository.findById.mockResolvedValue(existingStatus);

    useCase = new UpdateSaleStatusUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should update sale status successfully', async () => {
      const dto = { id: 'status-1', name: 'Updated Status', color: '#FF0000', isFinal: true };
      const mockStatus = new SaleStatus('status-1', 'Updated Status', 1, '#FF0000', true, false, false);

      mockRepository.update.mockResolvedValue(mockStatus);

      const result = await useCase.execute(dto, mockUser);

      expect(result).toEqual(mockStatus);
      expect(mockRepository.findById).toHaveBeenCalledWith('status-1');
      expect(mockRepository.update).toHaveBeenCalledWith('status-1', {
        name: 'Updated Status',
        color: '#FF0000',
        isFinal: true,
        isCancelled: undefined,
      });
    });

    it('should update status with null color', async () => {
      const dto = { id: 'status-1', name: 'Updated Status', isFinal: false };
      const mockStatus = new SaleStatus('status-1', 'Updated Status', 1, null, false, false, false);

      mockRepository.update.mockResolvedValue(mockStatus);

      await useCase.execute(dto, mockUser);

      expect(mockRepository.update).toHaveBeenCalledWith('status-1', {
        name: 'Updated Status',
        color: null,
        isFinal: false,
        isCancelled: undefined,
      });
    });

    it('should update only name and keep other fields', async () => {
      const dto = { id: 'status-1', name: 'New Name', color: '#0000FF', isFinal: false };
      const mockStatus = new SaleStatus('status-1', 'New Name', 1, '#0000FF', false, false, false);

      mockRepository.update.mockResolvedValue(mockStatus);

      await useCase.execute(dto, mockUser);

      expect(mockRepository.update).toHaveBeenCalledWith('status-1', {
        name: 'New Name',
        color: '#0000FF',
        isFinal: false,
        isCancelled: undefined,
      });
    });

    it('should throw NotFoundError when status does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);
      const dto = { id: 'non-existent', name: 'Updated Status', isFinal: false };

      await expect(useCase.execute(dto, mockUser)).rejects.toThrow(NotFoundError);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when trying to update a system status', async () => {
      const systemStatus = new SaleStatus('status-sys', 'System Status', 1, null, false, false, true, '00000000-0000-0000-0000-000000000001');
      mockRepository.findById.mockResolvedValue(systemStatus);

      const dto = { id: 'status-sys', name: 'New Name', isFinal: false };

      await expect(useCase.execute(dto, mockUser)).rejects.toThrow(ValidationError);
      await expect(useCase.execute(dto, mockUser)).rejects.toThrow(
        'No se puede modificar un estado de sistema'
      );
    });

    it('should work with coordinador role', async () => {
      const coordinadorUser: CurrentUser = {
        id: 'user-456',
        role: 'coordinador',
        firstName: 'Coordinador',
        empresaId: '00000000-0000-0000-0000-000000000001',
      };

      const dto = { id: 'status-1', name: 'Updated Status', color: '#FF0000', isFinal: false };
      const mockStatus = new SaleStatus('status-1', 'Updated Status', 1, '#FF0000', false, false, false);
      mockRepository.update.mockResolvedValue(mockStatus);

      const result = await useCase.execute(dto, coordinadorUser);
      expect(result).toEqual(mockStatus);
    });

    it('should also work with coordinador role (duplicate check)', async () => {
      const verificadorUser: CurrentUser = {
        id: 'user-789',
        role: 'coordinador',
        firstName: 'Verificador',
        empresaId: '00000000-0000-0000-0000-000000000001',
      };

      const dto = { id: 'status-1', name: 'Updated Status', color: '#FF0000', isFinal: false };
      const mockStatus = new SaleStatus('status-1', 'Updated Status', 1, '#FF0000', false, false, false);
      mockRepository.update.mockResolvedValue(mockStatus);

      const result = await useCase.execute(dto, verificadorUser);
      expect(result).toEqual(mockStatus);
    });

    it('should throw AuthorizationError for comercial role', async () => {
      const comercialUser: CurrentUser = {
        id: 'user-999',
        role: 'comercial',
        firstName: 'Comercial',
        empresaId: '00000000-0000-0000-0000-000000000001',
      };

      const dto = { id: 'status-1', name: 'Updated Status', isFinal: false };

      await expect(useCase.execute(dto, comercialUser)).rejects.toThrow(AuthorizationError);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should handle repository errors on update', async () => {
      const dto = { id: 'status-1', name: 'Updated Status', isFinal: false };
      const dbError = new Error('Database error');
      mockRepository.update.mockRejectedValue(dbError);

      await expect(useCase.execute(dto, mockUser)).rejects.toThrow(dbError);
    });

    it('should handle updating to final status', async () => {
      const dto = { id: 'status-1', name: 'Final Status', color: '#FF0000', isFinal: true };
      const mockStatus = new SaleStatus('status-1', 'Final Status', 1, '#FF0000', true, false, false);

      mockRepository.update.mockResolvedValue(mockStatus);

      const result = await useCase.execute(dto, mockUser);

      expect(result.isFinal).toBe(true);
      expect(mockRepository.update).toHaveBeenCalledWith('status-1', expect.objectContaining({
        name: 'Final Status',
        color: '#FF0000',
        isFinal: true,
      }));
    });

    it('should handle updating from final to non-final status', async () => {
      const dto = { id: 'status-1', name: 'Active Status', color: '#00FF00', isFinal: false };
      const mockStatus = new SaleStatus('status-1', 'Active Status', 1, '#00FF00', false, false, false);

      mockRepository.update.mockResolvedValue(mockStatus);

      const result = await useCase.execute(dto, mockUser);

      expect(result.isFinal).toBe(false);
    });

    it('should update isCancelled field when provided', async () => {
      const dto = { id: 'status-1', name: 'Cancelled Status', isFinal: false, isCancelled: true };
      const mockStatus = new SaleStatus('status-1', 'Cancelled Status', 1, null, false, true, false);

      mockRepository.update.mockResolvedValue(mockStatus);

      const result = await useCase.execute(dto, mockUser);

      expect(result.isCancelled).toBe(true);
      expect(mockRepository.update).toHaveBeenCalledWith('status-1', expect.objectContaining({
        isCancelled: true,
      }));
    });
  });
});
