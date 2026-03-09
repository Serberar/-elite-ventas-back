import { CreateAllowedIpUseCase } from '@application/use-cases/allowedIp/CreateAllowedIpUseCase';
import { IAllowedIpRepository } from '@domain/repositories/IAllowedIpRepository';
import { AllowedIp } from '@domain/entities/AllowedIp';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError } from '@application/shared/AppError';

describe('CreateAllowedIpUseCase', () => {
  let useCase: CreateAllowedIpUseCase;
  let mockRepository: jest.Mocked<IAllowedIpRepository>;

  const mockUser: CurrentUser = {
    id: 'user-123',
    role: 'administrador',
    firstName: 'Admin',
  };

  const mockAllowedIp = new AllowedIp('ip-123', '192.168.1.1', 'Office IP', new Date('2024-01-01'));

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      list: jest.fn(),
      listIpStrings: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new CreateAllowedIpUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should create allowed IP successfully', async () => {
      mockRepository.create.mockResolvedValue(mockAllowedIp);

      const result = await useCase.execute({ ip: '192.168.1.1', description: 'Office IP' }, mockUser);

      expect(result).toEqual(mockAllowedIp);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ip: '192.168.1.1',
        description: 'Office IP',
      });
    });

    it('should create IP without description', async () => {
      const ipWithoutDesc = new AllowedIp('ip-124', '10.0.0.1', null, new Date());
      mockRepository.create.mockResolvedValue(ipWithoutDesc);

      const result = await useCase.execute({ ip: '10.0.0.1' }, mockUser);

      expect(result).toEqual(ipWithoutDesc);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ip: '10.0.0.1',
        description: null,
      });
    });

    it('should throw AuthorizationError for coordinador role', async () => {
      const nonAdminUser: CurrentUser = {
        id: 'user-456',
        role: 'coordinador',
        firstName: 'Coordinador',
      };

      await expect(useCase.execute({ ip: '192.168.1.1' }, nonAdminUser)).rejects.toThrow(
        AuthorizationError
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should throw AuthorizationError for verificador role', async () => {
      const verificadorUser: CurrentUser = {
        id: 'user-789',
        role: 'verificador',
        firstName: 'Verificador',
      };

      await expect(useCase.execute({ ip: '192.168.1.1' }, verificadorUser)).rejects.toThrow(
        AuthorizationError
      );
    });

    it('should throw AuthorizationError for comercial role', async () => {
      const comercialUser: CurrentUser = {
        id: 'user-999',
        role: 'comercial',
        firstName: 'Comercial',
      };

      await expect(useCase.execute({ ip: '192.168.1.1' }, comercialUser)).rejects.toThrow(
        AuthorizationError
      );
    });

    it('should handle repository errors', async () => {
      const dbError = new Error('Database error');
      mockRepository.create.mockRejectedValue(dbError);

      await expect(useCase.execute({ ip: '192.168.1.1' }, mockUser)).rejects.toThrow(dbError);
    });

    it('should create IP with null description when undefined', async () => {
      mockRepository.create.mockResolvedValue(mockAllowedIp);

      await useCase.execute({ ip: '192.168.1.1', description: undefined }, mockUser);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ip: '192.168.1.1',
        description: null,
      });
    });
  });
});
