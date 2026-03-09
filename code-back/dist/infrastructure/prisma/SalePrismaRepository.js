"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalePrismaRepository = void 0;
const prismaClient_1 = require("../prisma/prismaClient");
const client_1 = require("@prisma/client");
const Sale_1 = require("../../domain/entities/Sale");
const SaleItem_1 = require("../../domain/entities/SaleItem");
const SaleHistory_1 = require("../../domain/entities/SaleHistory");
const SaleAssignment_1 = require("../../domain/entities/SaleAssignment");
const resilience_1 = require("../resilience");
const types_1 = require("../../domain/types");
class SalePrismaRepository {
    async create(data) {
        const row = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.sale.create({
            data: {
                clientId: data.clientId,
                statusId: data.statusId,
                totalAmount: data.totalAmount ?? 0,
                notes: data.notes ?? client_1.Prisma.JsonNull,
                metadata: data.metadata ?? client_1.Prisma.JsonNull,
                clientSnapshot: data.clientSnapshot ?? client_1.Prisma.JsonNull,
                addressSnapshot: data.addressSnapshot ?? client_1.Prisma.JsonNull,
            },
        }));
        return Sale_1.Sale.fromPrisma(row);
    }
    async update(saleId, data) {
        const updated = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.sale.update({
            where: { id: saleId },
            data: {
                statusId: data.statusId,
                totalAmount: data.totalAmount,
                notes: data.notes ?? client_1.Prisma.JsonNull,
                metadata: data.metadata ?? client_1.Prisma.JsonNull,
                closedAt: data.closedAt,
            },
        }));
        return Sale_1.Sale.fromPrisma(updated);
    }
    async findById(id) {
        const row = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.sale.findUnique({ where: { id } }));
        return row ? Sale_1.Sale.fromPrisma(row) : null;
    }
    async findWithRelations(id) {
        const row = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.sale.findUnique({
            where: { id },
            include: {
                items: true,
                assignments: true,
                histories: true,
                client: true, // inclusión cliente
                status: true, // inclusión estado
            },
        }));
        if (!row)
            return null;
        return {
            sale: Sale_1.Sale.fromPrisma(row),
            items: row.items.map((i) => SaleItem_1.SaleItem.fromPrisma(i)),
            assignments: row.assignments.map((a) => SaleAssignment_1.SaleAssignment.fromPrisma(a)),
            histories: row.histories.map((h) => SaleHistory_1.SaleHistory.fromPrisma(h)),
            client: row.client ?? null,
            status: row.status ?? null,
        };
    }
    async list(filters) {
        const rows = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.sale.findMany({
            where: {
                clientId: filters.clientId,
                statusId: filters.statusId,
                createdAt: filters.from || filters.to
                    ? {
                        ...(filters.from ? { gte: filters.from } : {}),
                        ...(filters.to ? { lte: filters.to } : {}),
                    }
                    : undefined,
            },
            orderBy: { createdAt: 'desc' },
        }));
        return rows.map((r) => Sale_1.Sale.fromPrisma(r));
    }
    async listPaginated(filters, pagination) {
        const where = {
            clientId: filters.clientId,
            statusId: filters.statusId,
            createdAt: filters.from || filters.to
                ? {
                    ...(filters.from ? { gte: filters.from } : {}),
                    ...(filters.to ? { lte: filters.to } : {}),
                }
                : undefined,
        };
        const [rows, total] = await resilience_1.dbCircuitBreaker.execute(() => Promise.all([
            prismaClient_1.prisma.sale.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (0, types_1.calculateOffset)(pagination.page, pagination.limit),
                take: pagination.limit,
            }),
            prismaClient_1.prisma.sale.count({ where }),
        ]));
        return {
            data: rows.map((r) => Sale_1.Sale.fromPrisma(r)),
            meta: (0, types_1.buildPaginationMeta)(pagination.page, pagination.limit, total),
        };
    }
    async addItem(saleId, data) {
        const row = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.saleItem.create({
            data: {
                saleId,
                productId: data.productId ?? null,
                nameSnapshot: data.nameSnapshot,
                skuSnapshot: data.skuSnapshot ?? null,
                unitPrice: data.unitPrice,
                quantity: data.quantity,
                finalPrice: data.finalPrice,
            },
        }));
        return SaleItem_1.SaleItem.fromPrisma(row);
    }
    async updateItem(itemId, data) {
        const row = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.saleItem.update({
            where: { id: itemId },
            data: {
                unitPrice: data.unitPrice,
                quantity: data.quantity,
                finalPrice: data.finalPrice,
            },
        }));
        return SaleItem_1.SaleItem.fromPrisma(row);
    }
    async removeItem(itemId) {
        await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.saleItem.delete({ where: { id: itemId } }));
    }
    async updateClientSnapshot(saleId, clientSnapshot) {
        const updated = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.sale.update({
            where: { id: saleId },
            data: {
                clientSnapshot: clientSnapshot ?? client_1.Prisma.JsonNull,
            },
        }));
        return Sale_1.Sale.fromPrisma(updated);
    }
    async addHistory(data) {
        const row = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.saleHistory.create({
            data: {
                saleId: data.saleId,
                userId: data.userId ?? null,
                action: data.action,
                payload: data.payload ?? client_1.Prisma.JsonNull,
            },
        }));
        return SaleHistory_1.SaleHistory.fromPrisma(row);
    }
    async assignUser(data) {
        const row = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.saleAssignment.create({
            data: {
                saleId: data.saleId,
                userId: data.userId,
                role: data.role,
            },
        }));
        return SaleAssignment_1.SaleAssignment.fromPrisma(row);
    }
}
exports.SalePrismaRepository = SalePrismaRepository;
