"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductPrismaRepository = void 0;
const prismaClient_1 = require("../prisma/prismaClient");
const Product_1 = require("../../domain/entities/Product");
const resilience_1 = require("../resilience");
const types_1 = require("../../domain/types");
class ProductPrismaRepository {
    async findAll() {
        const rows = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.product.findMany({
            orderBy: { name: 'asc' },
        }));
        return rows.map((row) => Product_1.Product.fromPrisma(row));
    }
    async findAllPaginated(pagination) {
        const [rows, total] = await resilience_1.dbCircuitBreaker.execute(() => Promise.all([
            prismaClient_1.prisma.product.findMany({
                orderBy: { name: 'asc' },
                skip: (0, types_1.calculateOffset)(pagination.page, pagination.limit),
                take: pagination.limit,
            }),
            prismaClient_1.prisma.product.count(),
        ]));
        return {
            data: rows.map((row) => Product_1.Product.fromPrisma(row)),
            meta: (0, types_1.buildPaginationMeta)(pagination.page, pagination.limit, total),
        };
    }
    async findById(id) {
        const row = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.product.findUnique({
            where: { id },
        }));
        return row ? Product_1.Product.fromPrisma(row) : null;
    }
    async findBySKU(sku) {
        const row = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.product.findUnique({
            where: { sku },
        }));
        return row ? Product_1.Product.fromPrisma(row) : null;
    }
    async create(data) {
        const row = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.product.create({
            data: {
                name: data.name,
                description: data.description ?? null,
                sku: data.sku ?? null,
                price: data.price,
                active: true,
            },
        }));
        return Product_1.Product.fromPrisma(row);
    }
    async update(id, data) {
        const row = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.product.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                sku: data.sku,
                price: data.price,
            },
        }));
        return Product_1.Product.fromPrisma(row);
    }
    async toggleActive(id) {
        const current = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.product.findUnique({
            where: { id },
            select: { active: true },
        }));
        if (!current) {
            throw new Error(`Product ${id} not found`);
        }
        const updated = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.product.update({
            where: { id },
            data: {
                active: !current.active,
            },
        }));
        return Product_1.Product.fromPrisma(updated);
    }
}
exports.ProductPrismaRepository = ProductPrismaRepository;
