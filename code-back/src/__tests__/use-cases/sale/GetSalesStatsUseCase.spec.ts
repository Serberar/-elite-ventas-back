import { GetSalesStatsUseCase } from '@application/use-cases/sale/GetSalesStatsUseCase';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError } from '@application/shared/AppError';

// GetSalesStatsUseCase accede directamente al singleton de prisma (no inyectado)
jest.mock('@infrastructure/prisma/prismaClient', () => ({
  prisma: {
    saleStatus: { findMany: jest.fn() },
    saleItem: { aggregate: jest.fn() },
  },
}));

import { prisma } from '@infrastructure/prisma/prismaClient';

describe('GetSalesStatsUseCase', () => {
  let useCase: GetSalesStatsUseCase;

  const adminUser: CurrentUser = { id: 'user-1', role: 'administrador', firstName: 'Admin' };
  const coordinadorUser: CurrentUser = { id: 'user-2', role: 'coordinador', firstName: 'Coord' };
  const verificadorUser: CurrentUser = { id: 'user-3', role: 'verificador', firstName: 'Verif' };
  const comercialUser: CurrentUser = { id: 'user-4', role: 'comercial', firstName: 'Com' };

  const mockAggregate = (quantity: number | null) =>
    ({ _sum: { quantity } });

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetSalesStatsUseCase();
    // Defaults: no cancelled statuses, quantities 5/20/50
    (prisma.saleStatus.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.saleItem.aggregate as jest.Mock)
      .mockResolvedValueOnce(mockAggregate(5))   // daily
      .mockResolvedValueOnce(mockAggregate(20))  // weekly
      .mockResolvedValueOnce(mockAggregate(50)); // monthly
  });

  describe('autorización', () => {
    it('should execute for administrador', async () => {
      const result = await useCase.execute(adminUser);
      expect(result).toEqual({ daily: 5, weekly: 20, monthly: 50 });
    });

    it('should execute for coordinador', async () => {
      const result = await useCase.execute(coordinadorUser);
      expect(result).toEqual({ daily: 5, weekly: 20, monthly: 50 });
    });

    it('should execute for verificador', async () => {
      const result = await useCase.execute(verificadorUser);
      expect(result).toEqual({ daily: 5, weekly: 20, monthly: 50 });
    });

    it('should throw AuthorizationError for comercial', async () => {
      await expect(useCase.execute(comercialUser)).rejects.toThrow(AuthorizationError);
      expect(prisma.saleItem.aggregate).not.toHaveBeenCalled();
    });

    it('should throw AuthorizationError for unknown role', async () => {
      const unknownUser: CurrentUser = { id: 'u5', role: 'unknown' as never, firstName: 'X' };
      await expect(useCase.execute(unknownUser)).rejects.toThrow(AuthorizationError);
    });
  });

  describe('cálculo de estadísticas', () => {
    it('should return 0 when aggregate returns null quantities', async () => {
      (prisma.saleItem.aggregate as jest.Mock).mockReset();
      (prisma.saleItem.aggregate as jest.Mock)
        .mockResolvedValueOnce(mockAggregate(null))
        .mockResolvedValueOnce(mockAggregate(null))
        .mockResolvedValueOnce(mockAggregate(null));

      const result = await useCase.execute(adminUser);

      expect(result).toEqual({ daily: 0, weekly: 0, monthly: 0 });
    });

    it('should exclude cancelled statuses from queries', async () => {
      (prisma.saleStatus.findMany as jest.Mock).mockResolvedValue([
        { id: 'status-cancelled-1' },
        { id: 'status-cancelled-2' },
      ]);

      await useCase.execute(adminUser);

      const calls = (prisma.saleItem.aggregate as jest.Mock).mock.calls;
      expect(calls[0][0].where.sale.statusId).toEqual({
        notIn: ['status-cancelled-1', 'status-cancelled-2'],
      });
    });

    it('should not add statusId filter when no cancelled statuses exist', async () => {
      (prisma.saleStatus.findMany as jest.Mock).mockResolvedValue([]);

      await useCase.execute(adminUser);

      const calls = (prisma.saleItem.aggregate as jest.Mock).mock.calls;
      expect(calls[0][0].where.sale).not.toHaveProperty('statusId');
    });

    it('should run all three aggregates in parallel', async () => {
      await useCase.execute(adminUser);
      expect(prisma.saleItem.aggregate).toHaveBeenCalledTimes(3);
    });

    it('should filter daily by start of today', async () => {
      await useCase.execute(adminUser);

      const dailyCall = (prisma.saleItem.aggregate as jest.Mock).mock.calls[0][0];
      const gte: Date = dailyCall.where.sale.createdAt.gte;
      const now = new Date();

      expect(gte.getFullYear()).toBe(now.getFullYear());
      expect(gte.getMonth()).toBe(now.getMonth());
      expect(gte.getDate()).toBe(now.getDate());
      expect(gte.getHours()).toBe(0);
    });

    it('should filter monthly by start of current month', async () => {
      await useCase.execute(adminUser);

      const monthlyCall = (prisma.saleItem.aggregate as jest.Mock).mock.calls[2][0];
      const gte: Date = monthlyCall.where.sale.createdAt.gte;
      const now = new Date();

      expect(gte.getFullYear()).toBe(now.getFullYear());
      expect(gte.getMonth()).toBe(now.getMonth());
      expect(gte.getDate()).toBe(1);
    });
  });

  describe('manejo de errores', () => {
    it('should propagate prisma errors', async () => {
      (prisma.saleStatus.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(useCase.execute(adminUser)).rejects.toThrow('DB error');
    });

    it('should propagate aggregate errors', async () => {
      (prisma.saleItem.aggregate as jest.Mock).mockReset();
      (prisma.saleItem.aggregate as jest.Mock).mockRejectedValue(new Error('Aggregate failed'));

      await expect(useCase.execute(adminUser)).rejects.toThrow('Aggregate failed');
    });
  });
});
