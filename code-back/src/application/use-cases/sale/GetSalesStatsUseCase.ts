import { prisma } from '@infrastructure/prisma/prismaClient';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';

export interface SalesStats {
  daily: number;
  weekly: number;
  monthly: number;
}

export class GetSalesStatsUseCase {
  async execute(currentUser: CurrentUser): Promise<SalesStats> {
    checkRolePermission(
      currentUser,
      rolePermissions.sale.ListSalesWithFiltersUseCase,
      'ver estadísticas de ventas'
    );

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calcular inicio de semana (lunes)
    const startOfWeek = new Date(startOfDay);
    const dayOfWeek = startOfDay.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(startOfDay.getDate() - daysToMonday);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Obtener IDs de estados cancelados para excluirlos
    const cancelledStatuses = await prisma.saleStatus.findMany({
      where: { isCancelled: true },
      select: { id: true },
    });
    const cancelledIds = cancelledStatuses.map((s) => s.id);

    // Contar ventas excluyendo canceladas
    const whereNotCancelled = cancelledIds.length > 0
      ? { statusId: { notIn: cancelledIds } }
      : {};

    // Sumar cantidad de productos vendidos (no importe, sino unidades)
    const [dailyResult, weeklyResult, monthlyResult] = await Promise.all([
      prisma.saleItem.aggregate({
        where: {
          sale: {
            ...whereNotCancelled,
            createdAt: { gte: startOfDay },
          },
        },
        _sum: { quantity: true },
      }),
      prisma.saleItem.aggregate({
        where: {
          sale: {
            ...whereNotCancelled,
            createdAt: { gte: startOfWeek },
          },
        },
        _sum: { quantity: true },
      }),
      prisma.saleItem.aggregate({
        where: {
          sale: {
            ...whereNotCancelled,
            createdAt: { gte: startOfMonth },
          },
        },
        _sum: { quantity: true },
      }),
    ]);

    return {
      daily: dailyResult._sum.quantity ?? 0,
      weekly: weeklyResult._sum.quantity ?? 0,
      monthly: monthlyResult._sum.quantity ?? 0,
    };
  }
}
