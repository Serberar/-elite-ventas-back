import { EmpresaPrismaRepository } from '@infrastructure/prisma/EmpresaPrismaRepository';
import { prisma } from '@infrastructure/prisma/prismaClient';
import { Empresa } from '@domain/entities/Empresa';
import { SYSTEM_STATUSES } from '@domain/constants';

jest.mock('@infrastructure/prisma/prismaClient', () => ({
  prisma: {
    empresa: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    saleStatus: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@infrastructure/resilience', () => ({
  dbCircuitBreaker: {
    execute: jest.fn((fn: () => Promise<any>) => fn()),
  },
}));

describe('EmpresaPrismaRepository', () => {
  let repository: EmpresaPrismaRepository;

  const mockEmpresaRow = {
    id: 'empresa-123',
    nombre: 'Empresa Test',
    slug: 'empresa-test',
    activa: true,
    logo: null,
    colorPrimario: '#FF0000',
    colorSecundario: null,
    paginasHabilitadas: ['ventas'],
    createdAt: new Date('2024-01-01'),
  };

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
    repository = new EmpresaPrismaRepository();
  });

  describe('create', () => {
    it('should create empresa and generate its own system SaleStatuses in transaction', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => fn(prisma));
      (prisma.empresa.create as jest.Mock).mockResolvedValue(undefined);
      (prisma.saleStatus.create as jest.Mock).mockResolvedValue(undefined);

      await repository.create(mockEmpresa);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.empresa.create).toHaveBeenCalledWith({
        data: mockEmpresa.toPrisma(),
      });
      expect(prisma.saleStatus.findMany).not.toHaveBeenCalled();
      expect(prisma.saleStatus.create).toHaveBeenCalledTimes(SYSTEM_STATUSES.length);
      expect(prisma.saleStatus.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ empresaId: 'empresa-123', isSystem: true }),
      });
    });

    it('should create each SYSTEM_STATUS with correct fields', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => fn(prisma));
      (prisma.empresa.create as jest.Mock).mockResolvedValue(undefined);
      (prisma.saleStatus.create as jest.Mock).mockResolvedValue(undefined);

      await repository.create(mockEmpresa);

      SYSTEM_STATUSES.forEach((s) => {
        expect(prisma.saleStatus.create).toHaveBeenCalledWith({
          data: { ...s, empresaId: 'empresa-123' },
        });
      });
    });

    it('should handle transaction errors', async () => {
      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('Transaction failed'));

      await expect(repository.create(mockEmpresa)).rejects.toThrow('Transaction failed');
    });
  });

  describe('findById', () => {
    it('should return Empresa when found', async () => {
      (prisma.empresa.findUnique as jest.Mock).mockResolvedValue(mockEmpresaRow);

      const result = await repository.findById('empresa-123');

      expect(result).toBeInstanceOf(Empresa);
      expect(result?.id).toBe('empresa-123');
      expect(result?.nombre).toBe('Empresa Test');
      expect(prisma.empresa.findUnique).toHaveBeenCalledWith({ where: { id: 'empresa-123' } });
    });

    it('should return null when not found', async () => {
      (prisma.empresa.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      (prisma.empresa.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(repository.findById('empresa-123')).rejects.toThrow('DB error');
    });
  });

  describe('findBySlug', () => {
    it('should return Empresa when found by slug', async () => {
      (prisma.empresa.findUnique as jest.Mock).mockResolvedValue(mockEmpresaRow);

      const result = await repository.findBySlug('empresa-test');

      expect(result).toBeInstanceOf(Empresa);
      expect(result?.slug).toBe('empresa-test');
      expect(prisma.empresa.findUnique).toHaveBeenCalledWith({ where: { slug: 'empresa-test' } });
    });

    it('should return null when slug not found', async () => {
      (prisma.empresa.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findBySlug('no-existe');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should return all empresas ordered by nombre', async () => {
      const rows = [
        { ...mockEmpresaRow, id: 'e-1', nombre: 'Alpha' },
        { ...mockEmpresaRow, id: 'e-2', nombre: 'Beta' },
      ];
      (prisma.empresa.findMany as jest.Mock).mockResolvedValue(rows);

      const result = await repository.list();

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Empresa);
      expect(result[0].nombre).toBe('Alpha');
      expect(prisma.empresa.findMany).toHaveBeenCalledWith({ orderBy: { nombre: 'asc' } });
    });

    it('should return empty array when no empresas exist', async () => {
      (prisma.empresa.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repository.list();

      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      (prisma.empresa.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(repository.list()).rejects.toThrow('DB error');
    });
  });

  describe('update', () => {
    it('should update empresa fields', async () => {
      (prisma.empresa.update as jest.Mock).mockResolvedValue(undefined);

      await repository.update(mockEmpresa);

      expect(prisma.empresa.update).toHaveBeenCalledWith({
        where: { id: 'empresa-123' },
        data: {
          nombre: 'Empresa Test',
          slug: 'empresa-test',
          activa: true,
          logo: null,
          colorPrimario: '#FF0000',
          colorSecundario: null,
          paginasHabilitadas: ['ventas'],
          paginaInicio: null,
          colorNombreEmpresa: null,
        },
      });
    });

    it('should handle update errors', async () => {
      (prisma.empresa.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

      await expect(repository.update(mockEmpresa)).rejects.toThrow('Update failed');
    });
  });
});
