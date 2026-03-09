"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ProductPrismaRepository_1 = require("../../infrastructure/prisma/ProductPrismaRepository");
const prismaClient_1 = require("../../infrastructure/prisma/prismaClient");
const Product_1 = require("../../domain/entities/Product");
jest.mock('@infrastructure/prisma/prismaClient', () => ({
    prisma: {
        product: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
    },
}));
describe('ProductPrismaRepository', () => {
    let repository;
    const mockProductData = {
        id: 'product-123',
        name: 'Test Product',
        description: 'Test description',
        sku: 'SKU-123',
        price: 99.99,
        active: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
    };
    beforeEach(() => {
        jest.clearAllMocks();
        repository = new ProductPrismaRepository_1.ProductPrismaRepository();
    });
    describe('findAll', () => {
        it('should find all products ordered by name', async () => {
            const products = [
                mockProductData,
                { ...mockProductData, id: 'product-456', name: 'Another Product' },
            ];
            prismaClient_1.prisma.product.findMany.mockResolvedValue(products);
            const result = await repository.findAll();
            expect(result).toHaveLength(2);
            expect(result[0]).toBeInstanceOf(Product_1.Product);
            expect(prismaClient_1.prisma.product.findMany).toHaveBeenCalledWith({
                orderBy: { name: 'asc' },
            });
        });
        it('should return empty array when no products exist', async () => {
            prismaClient_1.prisma.product.findMany.mockResolvedValue([]);
            const result = await repository.findAll();
            expect(result).toEqual([]);
        });
        it('should handle find all errors', async () => {
            const error = new Error('Database error');
            prismaClient_1.prisma.product.findMany.mockRejectedValue(error);
            await expect(repository.findAll()).rejects.toThrow(error);
        });
    });
    describe('findById', () => {
        it('should find product by id', async () => {
            prismaClient_1.prisma.product.findUnique.mockResolvedValue(mockProductData);
            const result = await repository.findById('product-123');
            expect(result).toBeInstanceOf(Product_1.Product);
            expect(result?.id).toBe('product-123');
            expect(prismaClient_1.prisma.product.findUnique).toHaveBeenCalledWith({
                where: { id: 'product-123' },
            });
        });
        it('should return null when product not found', async () => {
            prismaClient_1.prisma.product.findUnique.mockResolvedValue(null);
            const result = await repository.findById('nonexistent');
            expect(result).toBeNull();
        });
        it('should handle find by id errors', async () => {
            const error = new Error('Database error');
            prismaClient_1.prisma.product.findUnique.mockRejectedValue(error);
            await expect(repository.findById('product-123')).rejects.toThrow(error);
        });
    });
    describe('findBySKU', () => {
        it('should find product by SKU', async () => {
            prismaClient_1.prisma.product.findUnique.mockResolvedValue(mockProductData);
            const result = await repository.findBySKU('SKU-123');
            expect(result).toBeInstanceOf(Product_1.Product);
            expect(result?.sku).toBe('SKU-123');
            expect(prismaClient_1.prisma.product.findUnique).toHaveBeenCalledWith({
                where: { sku: 'SKU-123' },
            });
        });
        it('should return null when SKU not found', async () => {
            prismaClient_1.prisma.product.findUnique.mockResolvedValue(null);
            const result = await repository.findBySKU('nonexistent');
            expect(result).toBeNull();
        });
        it('should handle find by SKU errors', async () => {
            const error = new Error('Database error');
            prismaClient_1.prisma.product.findUnique.mockRejectedValue(error);
            await expect(repository.findBySKU('SKU-123')).rejects.toThrow(error);
        });
    });
    describe('create', () => {
        it('should create product with all fields', async () => {
            prismaClient_1.prisma.product.create.mockResolvedValue(mockProductData);
            const result = await repository.create({
                name: 'Test Product',
                description: 'Test description',
                sku: 'SKU-123',
                price: 99.99,
            });
            expect(result).toBeInstanceOf(Product_1.Product);
            expect(prismaClient_1.prisma.product.create).toHaveBeenCalledWith({
                data: {
                    name: 'Test Product',
                    description: 'Test description',
                    sku: 'SKU-123',
                    price: 99.99,
                    active: true,
                },
            });
        });
        it('should create product with null description and sku', async () => {
            const productWithNulls = { ...mockProductData, description: null, sku: null };
            prismaClient_1.prisma.product.create.mockResolvedValue(productWithNulls);
            const result = await repository.create({
                name: 'Test Product',
                price: 99.99,
            });
            expect(result).toBeInstanceOf(Product_1.Product);
            expect(prismaClient_1.prisma.product.create).toHaveBeenCalledWith({
                data: {
                    name: 'Test Product',
                    description: null,
                    sku: null,
                    price: 99.99,
                    active: true,
                },
            });
        });
        it('should handle creation errors', async () => {
            const error = new Error('Duplicate SKU');
            prismaClient_1.prisma.product.create.mockRejectedValue(error);
            await expect(repository.create({ name: 'Test', price: 99.99 })).rejects.toThrow(error);
        });
    });
    describe('update', () => {
        it('should update product', async () => {
            const updatedData = { ...mockProductData, name: 'Updated Product', price: 149.99 };
            prismaClient_1.prisma.product.update.mockResolvedValue(updatedData);
            const result = await repository.update('product-123', {
                name: 'Updated Product',
                price: 149.99,
            });
            expect(result).toBeInstanceOf(Product_1.Product);
            expect(result.name).toBe('Updated Product');
            expect(prismaClient_1.prisma.product.update).toHaveBeenCalledWith({
                where: { id: 'product-123' },
                data: {
                    name: 'Updated Product',
                    description: undefined,
                    sku: undefined,
                    price: 149.99,
                },
            });
        });
        it('should update only provided fields', async () => {
            prismaClient_1.prisma.product.update.mockResolvedValue(mockProductData);
            await repository.update('product-123', { price: 79.99 });
            expect(prismaClient_1.prisma.product.update).toHaveBeenCalledWith({
                where: { id: 'product-123' },
                data: {
                    name: undefined,
                    description: undefined,
                    sku: undefined,
                    price: 79.99,
                },
            });
        });
        it('should handle update errors', async () => {
            const error = new Error('Product not found');
            prismaClient_1.prisma.product.update.mockRejectedValue(error);
            await expect(repository.update('product-123', { name: 'Test' })).rejects.toThrow(error);
        });
    });
    describe('toggleActive', () => {
        it('should toggle active from true to false', async () => {
            prismaClient_1.prisma.product.findUnique.mockResolvedValue({ active: true });
            const inactiveProduct = { ...mockProductData, active: false };
            prismaClient_1.prisma.product.update.mockResolvedValue(inactiveProduct);
            const result = await repository.toggleActive('product-123');
            expect(result).toBeInstanceOf(Product_1.Product);
            expect(result.active).toBe(false);
            expect(prismaClient_1.prisma.product.findUnique).toHaveBeenCalledWith({
                where: { id: 'product-123' },
                select: { active: true },
            });
            expect(prismaClient_1.prisma.product.update).toHaveBeenCalledWith({
                where: { id: 'product-123' },
                data: { active: false },
            });
        });
        it('should toggle active from false to true', async () => {
            prismaClient_1.prisma.product.findUnique.mockResolvedValue({ active: false });
            prismaClient_1.prisma.product.update.mockResolvedValue(mockProductData);
            const result = await repository.toggleActive('product-123');
            expect(result).toBeInstanceOf(Product_1.Product);
            expect(result.active).toBe(true);
            expect(prismaClient_1.prisma.product.update).toHaveBeenCalledWith({
                where: { id: 'product-123' },
                data: { active: true },
            });
        });
        it('should throw error when product not found', async () => {
            prismaClient_1.prisma.product.findUnique.mockResolvedValue(null);
            await expect(repository.toggleActive('nonexistent')).rejects.toThrow('Product nonexistent not found');
            expect(prismaClient_1.prisma.product.update).not.toHaveBeenCalled();
        });
        it('should handle toggle errors during update', async () => {
            prismaClient_1.prisma.product.findUnique.mockResolvedValue({ active: true });
            const error = new Error('Update failed');
            prismaClient_1.prisma.product.update.mockRejectedValue(error);
            await expect(repository.toggleActive('product-123')).rejects.toThrow(error);
        });
        it('should handle errors during find', async () => {
            const error = new Error('Database error');
            prismaClient_1.prisma.product.findUnique.mockRejectedValue(error);
            await expect(repository.toggleActive('product-123')).rejects.toThrow(error);
        });
    });
});
