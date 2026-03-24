import { SwitchEmpresaUseCase } from '@application/use-cases/user/SwitchEmpresaUseCase';
import { IEmpresaRepository } from '@domain/repositories/IEmpresaRepository';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { Empresa } from '@domain/entities/Empresa';
import { User } from '@domain/entities/User';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError, NotFoundError } from '@application/shared/AppError';

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mocked-access-token'),
}));

jest.mock('@infrastructure/observability/metrics/prometheusMetrics', () => ({
  loginSuccessCounter: { inc: jest.fn() },
  loginFailureCounter: { inc: jest.fn() },
}));

import jwt from 'jsonwebtoken';

describe('SwitchEmpresaUseCase', () => {
  let useCase: SwitchEmpresaUseCase;
  let mockEmpresaRepo: jest.Mocked<IEmpresaRepository>;
  let mockUserRepo: jest.Mocked<IUserRepository>;

  const adminUser: CurrentUser = {
    id: 'user-admin',
    role: 'administrador',
    firstName: 'Admin',
    empresaId: '00000000-0000-0000-0000-000000000001',
  };

  const targetEmpresa = new Empresa(
    'empresa-456',
    'Empresa Destino',
    'empresa-destino',
    true,
    null,
    null,
    null,
    ['ventas', 'buscador']
  );

  const mockUser = new User(
    'user-admin',
    'Admin',
    'User',
    'admin@test.com',
    'hashed-password',
    'administrador',
    '00000000-0000-0000-0000-000000000001'
  );

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '1h';

    mockEmpresaRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
    };

    mockUserRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateLastLogin: jest.fn(),
      findByUsername: jest.fn(),
      saveRefreshToken: jest.fn(),
      findByRefreshToken: jest.fn(),
      clearRefreshToken: jest.fn(),
      updateFailedAttempts: jest.fn(),
    };

    useCase = new SwitchEmpresaUseCase(mockEmpresaRepo, mockUserRepo);
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;
  });

  it('should switch empresa and return new token', async () => {
    mockEmpresaRepo.findById.mockResolvedValue(targetEmpresa);
    mockUserRepo.findById.mockResolvedValue(mockUser);

    const result = await useCase.execute(adminUser, 'empresa-456');

    expect(result.accessToken).toBe('mocked-access-token');
    expect(result.empresa.id).toBe('empresa-456');
    expect(result.empresa.nombre).toBe('Empresa Destino');
    expect(result.empresa.slug).toBe('empresa-destino');
    expect(result.empresa.paginasHabilitadas).toEqual(['ventas', 'buscador']);
  });

  it('should sign JWT with target empresaId', async () => {
    mockEmpresaRepo.findById.mockResolvedValue(targetEmpresa);
    mockUserRepo.findById.mockResolvedValue(mockUser);

    await useCase.execute(adminUser, 'empresa-456');

    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ empresaId: 'empresa-456' }),
      'test-secret',
      expect.any(Object)
    );
  });

  it('should throw AuthorizationError for non-admin user', async () => {
    const comercialUser: CurrentUser = { ...adminUser, role: 'comercial' };

    await expect(useCase.execute(comercialUser, 'empresa-456')).rejects.toThrow(AuthorizationError);
    expect(mockEmpresaRepo.findById).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when target empresa does not exist', async () => {
    mockEmpresaRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(adminUser, 'nonexistent')).rejects.toThrow(NotFoundError);
    expect(mockUserRepo.findById).not.toHaveBeenCalled();
  });

  it('should throw AuthorizationError when empresa is inactive', async () => {
    const inactiveEmpresa = new Empresa('empresa-456', 'Inactiva', 'inactiva', false);
    mockEmpresaRepo.findById.mockResolvedValue(inactiveEmpresa);

    await expect(useCase.execute(adminUser, 'empresa-456')).rejects.toThrow(AuthorizationError);
  });

  it('should throw NotFoundError when user not found', async () => {
    mockEmpresaRepo.findById.mockResolvedValue(targetEmpresa);
    mockUserRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(adminUser, 'empresa-456')).rejects.toThrow(NotFoundError);
  });

  it('should throw error when JWT_SECRET is not defined', async () => {
    delete process.env.JWT_SECRET;
    mockEmpresaRepo.findById.mockResolvedValue(targetEmpresa);
    mockUserRepo.findById.mockResolvedValue(mockUser);

    await expect(useCase.execute(adminUser, 'empresa-456')).rejects.toThrow('JWT_SECRET');
  });
});
