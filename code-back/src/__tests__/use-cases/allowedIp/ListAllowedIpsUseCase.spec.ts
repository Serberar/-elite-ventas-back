import { ListAllowedIpsUseCase } from '@application/use-cases/allowedIp/ListAllowedIpsUseCase';
import { IAllowedIpRepository } from '@domain/repositories/IAllowedIpRepository';
import { AllowedIp } from '@domain/entities/AllowedIp';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError } from '@application/shared/AppError';

describe('ListAllowedIpsUseCase', () => {
  let useCase: ListAllowedIpsUseCase;
  let mockRepository: jest.Mocked<IAllowedIpRepository>;

  const mockUser: CurrentUser = {
    id: 'user-123',
    role: 'administrador',
    firstName: 'Admin',
    empresaId: '00000000-0000-0000-0000-000000000001',
  };

  const mockIps: AllowedIp[] = [
    new AllowedIp('ip-1', '192.168.1.1', 'Office', new Date('2024-01-01')),
    new AllowedIp('ip-2', '10.0.0.1', null, new Date('2024-01-02')),
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      list: jest.fn(),
      listIpStrings: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new ListAllowedIpsUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should return all allowed IPs', async () => {
      mockRepository.list.mockResolvedValue(mockIps);

      const result = await useCase.execute(mockUser);

      expect(result).toEqual(mockIps);
      expect(result.length).toBe(2);
      expect(mockRepository.list).toHaveBeenCalled();
    });

    it('should return empty array when no IPs exist', async () => {
      mockRepository.list.mockResolvedValue([]);

      const result = await useCase.execute(mockUser);

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should throw AuthorizationError for coordinador role', async () => {
      const coordinadorUser: CurrentUser = {
        id: 'user-456',
        role: 'coordinador',
        firstName: 'Coordinador',
        empresaId: '00000000-0000-0000-0000-000000000001',
      };

      await expect(useCase.execute(coordinadorUser)).rejects.toThrow(AuthorizationError);
      expect(mockRepository.list).not.toHaveBeenCalled();
    });

    it('should throw AuthorizationError for coordinador role', async () => {
      const verificadorUser: CurrentUser = {
        id: 'user-789',
        role: 'coordinador',
        firstName: 'Verificador',
        empresaId: '00000000-0000-0000-0000-000000000001',
      };

      await expect(useCase.execute(verificadorUser)).rejects.toThrow(AuthorizationError);
    });

    it('should throw AuthorizationError for comercial role', async () => {
      const comercialUser: CurrentUser = {
        id: 'user-999',
        role: 'comercial',
        firstName: 'Comercial',
        empresaId: '00000000-0000-0000-0000-000000000001',
      };

      await expect(useCase.execute(comercialUser)).rejects.toThrow(AuthorizationError);
    });

    it('should handle repository errors', async () => {
      const dbError = new Error('Database error');
      mockRepository.list.mockRejectedValue(dbError);

      await expect(useCase.execute(mockUser)).rejects.toThrow(dbError);
    });

    it('should return IPs with null descriptions', async () => {
      const ipsWithNulls = [new AllowedIp('ip-1', '10.0.0.1', null, new Date())];
      mockRepository.list.mockResolvedValue(ipsWithNulls);

      const result = await useCase.execute(mockUser);

      expect(result[0].description).toBeNull();
    });
  });
});
