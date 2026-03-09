"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetSalesStatsUseCase = void 0;
const prismaClient_1 = require("../../../infrastructure/prisma/prismaClient");
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
class GetSalesStatsUseCase {
    async execute(currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.sale.ListSalesWithFiltersUseCase, 'ver estadísticas de ventas');
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // Calcular inicio de semana (lunes)
        const startOfWeek = new Date(startOfDay);
        const dayOfWeek = startOfDay.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(startOfDay.getDate() - daysToMonday);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        // Obtener IDs de estados cancelados para excluirlos
        const cancelledStatuses = await prismaClient_1.prisma.saleStatus.findMany({
            where: { isCancelled: true },
            select: { id: true },
        });
        const cancelledIds = cancelledStatuses.map((s) => s.id);
        // Contar ventas excluyendo canceladas
        const whereNotCancelled = cancelledIds.length > 0
            ? { statusId: { notIn: cancelledIds } }
            : {};
        const [daily, weekly, monthly] = await Promise.all([
            prismaClient_1.prisma.sale.count({
                where: {
                    ...whereNotCancelled,
                    createdAt: { gte: startOfDay },
                },
            }),
            prismaClient_1.prisma.sale.count({
                where: {
                    ...whereNotCancelled,
                    createdAt: { gte: startOfWeek },
                },
            }),
            prismaClient_1.prisma.sale.count({
                where: {
                    ...whereNotCancelled,
                    createdAt: { gte: startOfMonth },
                },
            }),
        ]);
        return { daily, weekly, monthly };
    }
}
exports.GetSalesStatsUseCase = GetSalesStatsUseCase;
