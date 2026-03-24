import { UpdateEmpresaUseCase } from '@application/use-cases/empresa/UpdateEmpresaUseCase';
import { IEmpresaRepository } from '@domain/repositories/IEmpresaRepository';
import { Empresa } from '@domain/entities/Empresa';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError, NotFoundError } from '@application/shared/AppError';

describe('UpdateEmpresaUseCase', () => {
  let useCase: UpdateEmpresaUseCase;
  let mockRepo: jest.Mocked<IEmpresaRepository>;

  const adminUser: CurrentUser = {
    id: 'user-admin',
    role: 'administrador',
    firstName: 'Admin',
    empresaId: '00000000-0000-0000-0000-000000000001',
  };

  const existingEmpresa = new Empresa(
    'empresa-123',
    'Empresa Original',
    'empresa-original',
    true,
    null,
    '#FF0000',
    '#0000FF',
    ['ventas'],
    new Date('2024-01-01')
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
    };
    useCase = new UpdateEmpresaUseCase(mockRepo);
  });

  it('should update nombre only', async () => {
    mockRepo.findById.mockResolvedValue(existingEmpresa);
    mockRepo.update.mockResolvedValue(undefined);

    const result = await useCase.execute('empresa-123', { nombre: 'Empresa Nueva' }, adminUser);

    expect(result.nombre).toBe('Empresa Nueva');
    expect(result.slug).toBe('empresa-original');
    expect(result.colorPrimario).toBe('#FF0000');
    expect(result.paginasHabilitadas).toEqual(['ventas']);
    expect(mockRepo.update).toHaveBeenCalledWith(expect.any(Empresa));
  });

  it('should update paginasHabilitadas', async () => {
    mockRepo.findById.mockResolvedValue(existingEmpresa);
    mockRepo.update.mockResolvedValue(undefined);

    const result = await useCase.execute(
      'empresa-123',
      { paginasHabilitadas: ['ventas', 'buscador', 'aplicaciones'] },
      adminUser
    );

    expect(result.paginasHabilitadas).toEqual(['ventas', 'buscador', 'aplicaciones']);
  });

  it('should update logo to null explicitly', async () => {
    const empresaWithLogo = new Empresa('empresa-123', 'Test', 'test', true, 'logo.png');
    mockRepo.findById.mockResolvedValue(empresaWithLogo);
    mockRepo.update.mockResolvedValue(undefined);

    const result = await useCase.execute('empresa-123', { logo: null }, adminUser);

    expect(result.logo).toBeNull();
  });

  it('should preserve logo when not provided', async () => {
    const empresaWithLogo = new Empresa('empresa-123', 'Test', 'test', true, 'logo.png');
    mockRepo.findById.mockResolvedValue(empresaWithLogo);
    mockRepo.update.mockResolvedValue(undefined);

    const result = await useCase.execute('empresa-123', { nombre: 'Updated' }, adminUser);

    expect(result.logo).toBe('logo.png');
  });

  it('should update activa flag', async () => {
    mockRepo.findById.mockResolvedValue(existingEmpresa);
    mockRepo.update.mockResolvedValue(undefined);

    const result = await useCase.execute('empresa-123', { activa: false }, adminUser);

    expect(result.activa).toBe(false);
  });

  it('should preserve createdAt', async () => {
    mockRepo.findById.mockResolvedValue(existingEmpresa);
    mockRepo.update.mockResolvedValue(undefined);

    const result = await useCase.execute('empresa-123', { nombre: 'Updated' }, adminUser);

    expect(result.createdAt).toEqual(existingEmpresa.createdAt);
  });

  it('should throw AuthorizationError for non-admin', async () => {
    const comercialUser: CurrentUser = { ...adminUser, role: 'comercial' };

    await expect(
      useCase.execute('empresa-123', { nombre: 'Test' }, comercialUser)
    ).rejects.toThrow(AuthorizationError);

    expect(mockRepo.findById).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when empresa does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('nonexistent', { nombre: 'Test' }, adminUser)
    ).rejects.toThrow(NotFoundError);

    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('should propagate repository update errors', async () => {
    mockRepo.findById.mockResolvedValue(existingEmpresa);
    mockRepo.update.mockRejectedValue(new Error('DB error'));

    await expect(
      useCase.execute('empresa-123', { nombre: 'Test' }, adminUser)
    ).rejects.toThrow('DB error');
  });
});
