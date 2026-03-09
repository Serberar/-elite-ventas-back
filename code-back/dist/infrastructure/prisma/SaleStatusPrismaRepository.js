"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaleStatusPrismaRepository = void 0;
const prismaClient_1 = require("../prisma/prismaClient");
const SaleStatus_1 = require("../../domain/entities/SaleStatus");
const resilience_1 = require("../resilience");
class SaleStatusPrismaRepository {
    async findById(id) {
        const row = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.saleStatus.findUnique({ where: { id } }));
        return row ? SaleStatus_1.SaleStatus.fromPrisma(row) : null;
    }
    async list() {
        const rows = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.saleStatus.findMany({ orderBy: { order: 'asc' } }));
        return rows.map((r) => SaleStatus_1.SaleStatus.fromPrisma(r));
    }
    async findInitialStatus() {
        const row = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.saleStatus.findFirst({
            orderBy: { order: 'asc' },
            where: { isFinal: false }
        }));
        return row ? SaleStatus_1.SaleStatus.fromPrisma(row) : null;
    }
    async create(data) {
        const row = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.saleStatus.create({
            data: {
                name: data.name,
                order: data.order,
                color: data.color ?? null,
                isFinal: data.isFinal ?? false,
                isCancelled: data.isCancelled ?? false,
            },
        }));
        return SaleStatus_1.SaleStatus.fromPrisma(row);
    }
    async update(id, data) {
        const row = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.saleStatus.update({
            where: { id },
            data: {
                name: data.name,
                order: data.order,
                color: data.color,
                isFinal: data.isFinal,
                isCancelled: data.isCancelled,
            },
        }));
        return SaleStatus_1.SaleStatus.fromPrisma(row);
    }
    async reorder(orderList) {
        // La transacción se ejecuta dentro del circuit breaker
        await resilience_1.dbCircuitBreaker.execute(async () => {
            const ops = orderList.map((o) => prismaClient_1.prisma.saleStatus.update({
                where: { id: o.id },
                data: { order: o.order },
            }));
            return prismaClient_1.prisma.$transaction(ops);
        });
        // Devolver lista actualizada ordenada
        const rows = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.saleStatus.findMany({ orderBy: { order: 'asc' } }));
        return rows.map((r) => SaleStatus_1.SaleStatus.fromPrisma(r));
    }
    async delete(id) {
        await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.saleStatus.delete({ where: { id } }));
    }
}
exports.SaleStatusPrismaRepository = SaleStatusPrismaRepository;
