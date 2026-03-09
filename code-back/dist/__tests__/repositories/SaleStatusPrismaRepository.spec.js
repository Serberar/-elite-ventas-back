"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SaleStatusPrismaRepository_1 = require("../../infrastructure/prisma/SaleStatusPrismaRepository");
const prismaClient_1 = require("../../infrastructure/prisma/prismaClient");
const SaleStatus_1 = require("../../domain/entities/SaleStatus");
jest.mock('@infrastructure/prisma/prismaClient', () => ({
    prisma: {
        saleStatus: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        $transaction: jest.fn(),
    },
}));
jest.mock('@infrastructure/resilience', () => ({
    dbCircuitBreaker: {
        execute: jest.fn((fn) => fn()),
    },
}));
describe('SaleStatusPrismaRepository', () => {
    let repository;
    const mockStatusData = {
        id: 'status-123',
        name: 'Pending',
        order: 1,
        color: '#FFFF00',
        isFinal: false,
        isCancelled: false,
    };
    beforeEach(() => {
        jest.clearAllMocks();
        repository = new SaleStatusPrismaRepository_1.SaleStatusPrismaRepository();
    });
    describe('findById', () => {
        it('should find status by id', async () => {
            prismaClient_1.prisma.saleStatus.findUnique.mockResolvedValue(mockStatusData);
            const result = await repository.findById('status-123');
            expect(result).toBeInstanceOf(SaleStatus_1.SaleStatus);
            expect(result?.id).toBe('status-123');
            expect(prismaClient_1.prisma.saleStatus.findUnique).toHaveBeenCalledWith({
                where: { id: 'status-123' },
            });
        });
        it('should return null when status not found', async () => {
            prismaClient_1.prisma.saleStatus.findUnique.mockResolvedValue(null);
            const result = await repository.findById('nonexistent');
            expect(result).toBeNull();
        });
        it('should handle find by id errors', async () => {
            prismaClient_1.prisma.saleStatus.findUnique.mockRejectedValueOnce(new Error('Database error'));
            await expect(repository.findById('status-123')).rejects.toThrow('Database error');
        });
    });
    describe('list', () => {
        it('should list all statuses ordered by order', async () => {
            const statuses = [
                mockStatusData,
                { ...mockStatusData, id: 'status-456', name: 'Completed', order: 2 },
                { ...mockStatusData, id: 'status-789', name: 'Cancelled', order: 3, isFinal: true, isCancelled: true },
            ];
            prismaClient_1.prisma.saleStatus.findMany.mockResolvedValue(statuses);
            const result = await repository.list();
            expect(result).toHaveLength(3);
            expect(result[0]).toBeInstanceOf(SaleStatus_1.SaleStatus);
            expect(prismaClient_1.prisma.saleStatus.findMany).toHaveBeenCalledWith({
                orderBy: { order: 'asc' },
            });
        });
        it('should return empty array when no statuses exist', async () => {
            prismaClient_1.prisma.saleStatus.findMany.mockResolvedValue([]);
            const result = await repository.list();
            expect(result).toEqual([]);
        });
        it('should handle list errors', async () => {
            prismaClient_1.prisma.saleStatus.findMany.mockRejectedValueOnce(new Error('Database error'));
            await expect(repository.list()).rejects.toThrow('Database error');
        });
    });
    describe('findInitialStatus', () => {
        it('should find initial non-final status', async () => {
            prismaClient_1.prisma.saleStatus.findFirst.mockResolvedValue(mockStatusData);
            const result = await repository.findInitialStatus();
            expect(result).toBeInstanceOf(SaleStatus_1.SaleStatus);
            expect(result?.isFinal).toBe(false);
            expect(prismaClient_1.prisma.saleStatus.findFirst).toHaveBeenCalledWith({
                orderBy: { order: 'asc' },
                where: { isFinal: false },
            });
        });
        it('should return null when no initial status exists', async () => {
            prismaClient_1.prisma.saleStatus.findFirst.mockResolvedValue(null);
            const result = await repository.findInitialStatus();
            expect(result).toBeNull();
        });
    });
    describe('create', () => {
        it('should create status with all fields', async () => {
            prismaClient_1.prisma.saleStatus.create.mockResolvedValue(mockStatusData);
            const result = await repository.create({
                name: 'Pending',
                order: 1,
                color: '#FFFF00',
                isFinal: false,
                isCancelled: false,
            });
            expect(result).toBeInstanceOf(SaleStatus_1.SaleStatus);
            expect(prismaClient_1.prisma.saleStatus.create).toHaveBeenCalledWith({
                data: {
                    name: 'Pending',
                    order: 1,
                    color: '#FFFF00',
                    isFinal: false,
                    isCancelled: false,
                },
            });
        });
        it('should create status with default values', async () => {
            const statusWithDefaults = { ...mockStatusData, color: null, isFinal: false, isCancelled: false };
            prismaClient_1.prisma.saleStatus.create.mockResolvedValue(statusWithDefaults);
            const result = await repository.create({
                name: 'Pending',
                order: 1,
            });
            expect(result).toBeInstanceOf(SaleStatus_1.SaleStatus);
            expect(prismaClient_1.prisma.saleStatus.create).toHaveBeenCalledWith({
                data: {
                    name: 'Pending',
                    order: 1,
                    color: null,
                    isFinal: false,
                    isCancelled: false,
                },
            });
        });
        it('should create status with null color', async () => {
            const statusWithNullColor = { ...mockStatusData, color: null };
            prismaClient_1.prisma.saleStatus.create.mockResolvedValue(statusWithNullColor);
            const result = await repository.create({
                name: 'Pending',
                order: 1,
                color: null,
            });
            expect(result).toBeInstanceOf(SaleStatus_1.SaleStatus);
        });
        it('should handle creation errors', async () => {
            prismaClient_1.prisma.saleStatus.create.mockRejectedValueOnce(new Error('Duplicate order error'));
            await expect(repository.create({ name: 'Pending', order: 1 })).rejects.toThrow('Duplicate order error');
        });
    });
    describe('update', () => {
        it('should update status', async () => {
            const updatedData = { ...mockStatusData, name: 'Updated Status' };
            prismaClient_1.prisma.saleStatus.update.mockResolvedValue(updatedData);
            const result = await repository.update('status-123', {
                name: 'Updated Status',
                color: '#FF0000',
            });
            expect(result).toBeInstanceOf(SaleStatus_1.SaleStatus);
            expect(prismaClient_1.prisma.saleStatus.update).toHaveBeenCalledWith({
                where: { id: 'status-123' },
                data: {
                    name: 'Updated Status',
                    order: undefined,
                    color: '#FF0000',
                    isFinal: undefined,
                    isCancelled: undefined,
                },
            });
        });
        it('should update only provided fields', async () => {
            prismaClient_1.prisma.saleStatus.update.mockResolvedValue(mockStatusData);
            await repository.update('status-123', { isFinal: true });
            expect(prismaClient_1.prisma.saleStatus.update).toHaveBeenCalledWith({
                where: { id: 'status-123' },
                data: {
                    name: undefined,
                    order: undefined,
                    color: undefined,
                    isFinal: true,
                    isCancelled: undefined,
                },
            });
        });
        it('should update isCancelled field', async () => {
            const updatedData = { ...mockStatusData, isCancelled: true };
            prismaClient_1.prisma.saleStatus.update.mockResolvedValue(updatedData);
            await repository.update('status-123', { isCancelled: true });
            expect(prismaClient_1.prisma.saleStatus.update).toHaveBeenCalledWith({
                where: { id: 'status-123' },
                data: {
                    name: undefined,
                    order: undefined,
                    color: undefined,
                    isFinal: undefined,
                    isCancelled: true,
                },
            });
        });
        it('should handle update errors', async () => {
            prismaClient_1.prisma.saleStatus.update.mockRejectedValueOnce(new Error('Status not found'));
            await expect(repository.update('status-123', { name: 'Test' })).rejects.toThrow('Status not found');
        });
    });
    describe('reorder', () => {
        it('should reorder multiple statuses in transaction', async () => {
            const orderList = [
                { id: 'status-1', order: 2 },
                { id: 'status-2', order: 1 },
                { id: 'status-3', order: 3 },
            ];
            prismaClient_1.prisma.$transaction.mockResolvedValue([]);
            prismaClient_1.prisma.saleStatus.findMany.mockResolvedValue([
                { ...mockStatusData, id: 'status-2', order: 1 },
                { ...mockStatusData, id: 'status-1', order: 2 },
                { ...mockStatusData, id: 'status-3', order: 3 },
            ]);
            const result = await repository.reorder(orderList);
            expect(prismaClient_1.prisma.$transaction).toHaveBeenCalled();
            expect(result).toHaveLength(3);
            expect(result[0]).toBeInstanceOf(SaleStatus_1.SaleStatus);
        });
        it('should reorder single status', async () => {
            const orderList = [{ id: 'status-1', order: 5 }];
            prismaClient_1.prisma.$transaction.mockResolvedValue([]);
            prismaClient_1.prisma.saleStatus.findMany.mockResolvedValue([
                { ...mockStatusData, id: 'status-1', order: 5 },
            ]);
            const result = await repository.reorder(orderList);
            expect(prismaClient_1.prisma.$transaction).toHaveBeenCalled();
            expect(result).toHaveLength(1);
        });
        it('should handle empty reorder list', async () => {
            prismaClient_1.prisma.$transaction.mockResolvedValue([]);
            prismaClient_1.prisma.saleStatus.findMany.mockResolvedValue([]);
            const result = await repository.reorder([]);
            expect(prismaClient_1.prisma.$transaction).toHaveBeenCalledWith([]);
            expect(result).toEqual([]);
        });
        it('should handle reorder errors', async () => {
            prismaClient_1.prisma.$transaction.mockRejectedValueOnce(new Error('Transaction failed'));
            await expect(repository.reorder([{ id: 'status-1', order: 1 }])).rejects.toThrow('Transaction failed');
        });
    });
    describe('delete', () => {
        it('should delete status by id', async () => {
            prismaClient_1.prisma.saleStatus.delete.mockResolvedValue(mockStatusData);
            await repository.delete('status-123');
            expect(prismaClient_1.prisma.saleStatus.delete).toHaveBeenCalledWith({
                where: { id: 'status-123' },
            });
        });
        it('should handle delete errors', async () => {
            prismaClient_1.prisma.saleStatus.delete.mockRejectedValueOnce(new Error('Cannot delete'));
            await expect(repository.delete('status-123')).rejects.toThrow('Cannot delete');
        });
    });
});
