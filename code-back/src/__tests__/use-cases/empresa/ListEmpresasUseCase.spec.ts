import { ListEmpresasUseCase } from '@application/use-cases/empresa/ListEmpresasUseCase';
import { IEmpresaRepository } from '@domain/repositories/IEmpresaRepository';
import { Empresa } from '@domain/entities/Empresa';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError } from '@application/shared/AppError';

describe('ListEmpresasUseCase', () => {
  let useCase: ListEmpresasUseCase;
  let mockRepo: jest.Mocked<IEmpresaRepository>;

  const adminUser: CurrentUser = {
    id: 'user-admin',
    role: 'administrador',
    firstName: 'Admin',
    empresaId: '00000000-0000-0000-0000-000000000001',
  };

  const coordinadorUser: CurrentUser = {
    id: 'user-coord',
    role: 'coordinador',
    firstName: 'Coordinador',
    empresaId: '00000000-0000-0000-0000-000000000001',
  };

  const mockEmpresas = [
    new Empresa('e-1', 'Alpha', 'alpha', true),
    new Empresa('e-2', 'Beta', 'beta', true),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
    };
    useCase = new ListEmpresasUseCase(mockRepo);
  });

  it('should return list of empresas for admin', async () => {
    mockRepo.list.mockResolvedValue(mockEmpresas);

    const result = await useCase.execute(adminUser);

    expect(result).toHaveLength(2);
    expect(result[0]).toBeInstanceOf(Empresa);
    expect(result[0].nombre).toBe('Alpha');
    expect(mockRepo.list).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when no empresas exist', async () => {
    mockRepo.list.mockResolvedValue([]);

    const result = await useCase.execute(adminUser);

    expect(result).toEqual([]);
  });

  it('should throw AuthorizationError for non-admin users', async () => {
    await expect(useCase.execute(coordinadorUser)).rejects.toThrow(AuthorizationError);
    expect(mockRepo.list).not.toHaveBeenCalled();
  });

  it('should throw AuthorizationError for comercial users', async () => {
    const comercialUser: CurrentUser = { ...adminUser, role: 'comercial' };
    await expect(useCase.execute(comercialUser)).rejects.toThrow(AuthorizationError);
  });

  it('should propagate repository errors', async () => {
    mockRepo.list.mockRejectedValue(new Error('DB error'));

    await expect(useCase.execute(adminUser)).rejects.toThrow('DB error');
  });
});
