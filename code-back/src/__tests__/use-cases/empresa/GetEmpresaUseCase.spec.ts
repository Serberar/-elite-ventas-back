import { GetEmpresaUseCase } from '@application/use-cases/empresa/GetEmpresaUseCase';
import { IEmpresaRepository } from '@domain/repositories/IEmpresaRepository';
import { Empresa } from '@domain/entities/Empresa';
import { NotFoundError } from '@application/shared/AppError';

describe('GetEmpresaUseCase', () => {
  let useCase: GetEmpresaUseCase;
  let mockRepo: jest.Mocked<IEmpresaRepository>;

  const mockEmpresa = new Empresa(
    'empresa-123',
    'Empresa Test',
    'empresa-test',
    true,
    null,
    '#FF0000',
    null,
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
    useCase = new GetEmpresaUseCase(mockRepo);
  });

  it('should return empresa when found', async () => {
    mockRepo.findById.mockResolvedValue(mockEmpresa);

    const result = await useCase.execute('empresa-123');

    expect(result).toBeInstanceOf(Empresa);
    expect(result.id).toBe('empresa-123');
    expect(result.nombre).toBe('Empresa Test');
    expect(mockRepo.findById).toHaveBeenCalledWith('empresa-123');
  });

  it('should throw NotFoundError when empresa does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent')).rejects.toThrow(NotFoundError);
    await expect(useCase.execute('nonexistent')).rejects.toThrow('nonexistent');
  });

  it('should propagate repository errors', async () => {
    mockRepo.findById.mockRejectedValue(new Error('DB error'));

    await expect(useCase.execute('empresa-123')).rejects.toThrow('DB error');
  });
});
