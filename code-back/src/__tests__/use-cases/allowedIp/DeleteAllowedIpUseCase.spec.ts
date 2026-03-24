import { DeleteAllowedIpUseCase } from '@application/use-cases/allowedIp/DeleteAllowedIpUseCase';
import { IAllowedIpRepository } from '@domain/repositories/IAllowedIpRepository';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError } from '@application/shared/AppError';

describe('DeleteAllowedIpUseCase', () => {
  let useCase: DeleteAllowedIpUseCase;
  let mockRepository: jest.Mocked<IAllowedIpRepository>;

  const mockUser: CurrentUser = {
    id: 'user-123',
    role: 'administrador',
    firstName: 'Admin',
    empresaId: '00000000-0000-0000-0000-000000000001',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      list: jest.fn(),
      listIpStrings: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new DeleteAllowedIpUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should delete allowed IP successfully', async () => {
      mockRepository.delete.mockResolvedValue(undefined);

      await useCase.execute('ip-123', mockUser);

      expect(mockRepository.delete).toHaveBeenCalledWith('ip-123', '00000000-0000-0000-0000-000000000001');
    });

    it('should not return a value', async () => {
      mockRepository.delete.mockResolvedValue(undefined);

      const result = await useCase.execute('ip-123', mockUser);

      expect(result).toBeUndefined();
    });

    it('should throw AuthorizationError for coordinador role', async () => {
      const coordinadorUser: CurrentUser = {
        id: 'user-456',
        role: 'coordinador',
        firstName: 'Coordinador',
        empresaId: '00000000-0000-0000-0000-000000000001',
      };

      await expect(useCase.execute('ip-123', coordinadorUser)).rejects.toThrow(AuthorizationError);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw AuthorizationError for coordinador role', async () => {
      const verificadorUser: CurrentUser = {
        id: 'user-789',
        role: 'coordinador',
        firstName: 'Verificador',
        empresaId: '00000000-0000-0000-0000-000000000001',
      };

      await expect(useCase.execute('ip-123', verificadorUser)).rejects.toThrow(AuthorizationError);
    });

    it('should throw AuthorizationError for comercial role', async () => {
      const comercialUser: CurrentUser = {
        id: 'user-999',
        role: 'comercial',
        firstName: 'Comercial',
        empresaId: '00000000-0000-0000-0000-000000000001',
      };

      await expect(useCase.execute('ip-123', comercialUser)).rejects.toThrow(AuthorizationError);
    });

    it('should handle repository errors', async () => {
      const dbError = new Error('Database error');
      mockRepository.delete.mockRejectedValue(dbError);

      await expect(useCase.execute('ip-123', mockUser)).rejects.toThrow(dbError);
    });

    it('should pass correct ID to repository', async () => {
      mockRepository.delete.mockResolvedValue(undefined);

      await useCase.execute('specific-ip-id', mockUser);

      expect(mockRepository.delete).toHaveBeenCalledWith('specific-ip-id', '00000000-0000-0000-0000-000000000001');
      expect(mockRepository.delete).toHaveBeenCalledTimes(1);
    });
  });
});
