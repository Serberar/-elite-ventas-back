import { CreateEmpresaUseCase } from '@application/use-cases/empresa/CreateEmpresaUseCase';
import { IEmpresaRepository } from '@domain/repositories/IEmpresaRepository';
import { Empresa } from '@domain/entities/Empresa';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError, ConflictError } from '@application/shared/AppError';

describe('CreateEmpresaUseCase', () => {
  let useCase: CreateEmpresaUseCase;
  let mockRepo: jest.Mocked<IEmpresaRepository>;

  const adminUser: CurrentUser = {
    id: 'user-admin',
    role: 'administrador',
    firstName: 'Admin',
    empresaId: '00000000-0000-0000-0000-000000000001',
  };

  const comercialUser: CurrentUser = {
    id: 'user-comercial',
    role: 'comercial',
    firstName: 'Comercial',
    empresaId: '00000000-0000-0000-0000-000000000001',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
    };
    useCase = new CreateEmpresaUseCase(mockRepo);
  });

  it('should create empresa successfully', async () => {
    mockRepo.findBySlug.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(undefined);

    const result = await useCase.execute(
      { nombre: 'Empresa Test', slug: 'empresa-test' },
      adminUser
    );

    expect(result).toBeInstanceOf(Empresa);
    expect(result.nombre).toBe('Empresa Test');
    expect(result.slug).toBe('empresa-test');
    expect(result.activa).toBe(true);
    expect(result.logo).toBeNull();
    expect(result.colorPrimario).toBeNull();
    expect(result.colorSecundario).toBeNull();
    expect(result.paginasHabilitadas).toEqual([]);
    expect(mockRepo.findBySlug).toHaveBeenCalledWith('empresa-test');
    expect(mockRepo.create).toHaveBeenCalledWith(expect.any(Empresa));
  });

  it('should create empresa with all optional fields', async () => {
    mockRepo.findBySlug.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(undefined);

    const result = await useCase.execute(
      {
        nombre: 'Empresa Completa',
        slug: 'empresa-completa',
        logo: 'https://example.com/logo.png',
        colorPrimario: '#FF0000',
        colorSecundario: '#00FF00',
        paginasHabilitadas: ['ventas', 'buscador'],
      },
      adminUser
    );

    expect(result.logo).toBe('https://example.com/logo.png');
    expect(result.colorPrimario).toBe('#FF0000');
    expect(result.colorSecundario).toBe('#00FF00');
    expect(result.paginasHabilitadas).toEqual(['ventas', 'buscador']);
  });

  it('should throw AuthorizationError if user is not administrador', async () => {
    await expect(
      useCase.execute({ nombre: 'Test', slug: 'test' }, comercialUser)
    ).rejects.toThrow(AuthorizationError);

    expect(mockRepo.findBySlug).not.toHaveBeenCalled();
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('should throw ConflictError if slug already exists', async () => {
    const existingEmpresa = new Empresa(
      'empresa-existente',
      'Empresa Existente',
      'empresa-test',
      true
    );
    mockRepo.findBySlug.mockResolvedValue(existingEmpresa);

    await expect(
      useCase.execute({ nombre: 'Nueva Empresa', slug: 'empresa-test' }, adminUser)
    ).rejects.toThrow(ConflictError);

    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('should generate a valid UUID for empresa id', async () => {
    mockRepo.findBySlug.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(undefined);

    const result = await useCase.execute({ nombre: 'Test', slug: 'test' }, adminUser);

    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('should propagate repository errors', async () => {
    mockRepo.findBySlug.mockResolvedValue(null);
    mockRepo.create.mockRejectedValue(new Error('DB error'));

    await expect(
      useCase.execute({ nombre: 'Test', slug: 'test' }, adminUser)
    ).rejects.toThrow('DB error');
  });
});
