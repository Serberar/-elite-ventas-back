"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SalePrismaRepository_1 = require("../../infrastructure/prisma/SalePrismaRepository");
const prismaClient_1 = require("../../infrastructure/prisma/prismaClient");
const client_1 = require("@prisma/client");
const Sale_1 = require("../../domain/entities/Sale");
const SaleItem_1 = require("../../domain/entities/SaleItem");
const SaleHistory_1 = require("../../domain/entities/SaleHistory");
const SaleAssignment_1 = require("../../domain/entities/SaleAssignment");
jest.mock('@infrastructure/prisma/prismaClient', () => ({
    prisma: {
        sale: {
            create: jest.fn(),
            update: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
        saleItem: {
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        saleHistory: {
            create: jest.fn(),
        },
        saleAssignment: {
            create: jest.fn(),
        },
    },
}));
describe('SalePrismaRepository', () => {
    let repository;
    const mockClientSnapshot = {
        firstName: 'John',
        lastName: 'Doe',
        dni: '12345678A',
        email: 'john@example.com',
    };
    const mockAddressSnapshot = {
        address: 'Calle Test 123',
        cupsLuz: 'ES001',
        cupsGas: 'ES002',
    };
    const mockSaleData = {
        id: 'sale-123',
        clientId: 'client-123',
        statusId: 'status-123',
        totalAmount: 100,
        notes: null,
        metadata: null,
        clientSnapshot: mockClientSnapshot,
        addressSnapshot: mockAddressSnapshot,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        closedAt: null,
    };
    const mockItemData = {
        id: 'item-123',
        saleId: 'sale-123',
        productId: 'product-123',
        nameSnapshot: 'Product Name',
        skuSnapshot: 'SKU-123',
        unitPrice: 50,
        quantity: 2,
        finalPrice: 100,
        createdAt: new Date('2024-01-01'),
        updatedAt: null,
    };
    beforeEach(() => {
        jest.clearAllMocks();
        repository = new SalePrismaRepository_1.SalePrismaRepository();
    });
    describe('create', () => {
        it('should create sale with all fields', async () => {
            const notes = [{ note: 'Test note' }];
            const metadata = { key: 'value' };
            prismaClient_1.prisma.sale.create.mockResolvedValue({
                ...mockSaleData,
                notes,
                metadata,
            });
            const result = await repository.create({
                clientId: 'client-123',
                statusId: 'status-123',
                totalAmount: 100,
                notes,
                metadata,
                clientSnapshot: mockClientSnapshot,
                addressSnapshot: mockAddressSnapshot,
            });
            expect(result).toBeInstanceOf(Sale_1.Sale);
            expect(prismaClient_1.prisma.sale.create).toHaveBeenCalledWith({
                data: {
                    clientId: 'client-123',
                    statusId: 'status-123',
                    totalAmount: 100,
                    notes,
                    metadata,
                    clientSnapshot: mockClientSnapshot,
                    addressSnapshot: mockAddressSnapshot,
                },
            });
        });
        it('should create sale with default values', async () => {
            prismaClient_1.prisma.sale.create.mockResolvedValue(mockSaleData);
            const result = await repository.create({
                clientId: 'client-123',
                statusId: 'status-123',
                clientSnapshot: mockClientSnapshot,
                addressSnapshot: mockAddressSnapshot,
            });
            expect(result).toBeInstanceOf(Sale_1.Sale);
            expect(prismaClient_1.prisma.sale.create).toHaveBeenCalledWith({
                data: {
                    clientId: 'client-123',
                    statusId: 'status-123',
                    totalAmount: 0,
                    notes: client_1.Prisma.JsonNull,
                    metadata: client_1.Prisma.JsonNull,
                    clientSnapshot: mockClientSnapshot,
                    addressSnapshot: mockAddressSnapshot,
                },
            });
        });
        it('should handle creation errors', async () => {
            const error = new Error('Foreign key constraint failed');
            prismaClient_1.prisma.sale.create.mockRejectedValue(error);
            await expect(repository.create({
                clientId: 'client-123',
                statusId: 'status-123',
                clientSnapshot: mockClientSnapshot,
                addressSnapshot: mockAddressSnapshot,
            })).rejects.toThrow(error);
        });
    });
    describe('update', () => {
        it('should update sale with all fields', async () => {
            const updatedData = {
                ...mockSaleData,
                totalAmount: 200,
                closedAt: new Date('2024-01-03'),
            };
            prismaClient_1.prisma.sale.update.mockResolvedValue(updatedData);
            const result = await repository.update('sale-123', {
                statusId: 'status-456',
                totalAmount: 200,
                closedAt: new Date('2024-01-03'),
            });
            expect(result).toBeInstanceOf(Sale_1.Sale);
            expect(prismaClient_1.prisma.sale.update).toHaveBeenCalledWith({
                where: { id: 'sale-123' },
                data: {
                    statusId: 'status-456',
                    totalAmount: 200,
                    notes: client_1.Prisma.JsonNull,
                    metadata: client_1.Prisma.JsonNull,
                    closedAt: new Date('2024-01-03'),
                },
            });
        });
        it('should update only provided fields', async () => {
            prismaClient_1.prisma.sale.update.mockResolvedValue(mockSaleData);
            await repository.update('sale-123', { totalAmount: 150 });
            expect(prismaClient_1.prisma.sale.update).toHaveBeenCalledWith({
                where: { id: 'sale-123' },
                data: {
                    statusId: undefined,
                    totalAmount: 150,
                    notes: client_1.Prisma.JsonNull,
                    metadata: client_1.Prisma.JsonNull,
                    closedAt: undefined,
                },
            });
        });
        it('should handle update errors', async () => {
            const error = new Error('Sale not found');
            prismaClient_1.prisma.sale.update.mockRejectedValue(error);
            await expect(repository.update('sale-123', { totalAmount: 100 })).rejects.toThrow(error);
        });
    });
    describe('findById', () => {
        it('should find sale by id', async () => {
            prismaClient_1.prisma.sale.findUnique.mockResolvedValue(mockSaleData);
            const result = await repository.findById('sale-123');
            expect(result).toBeInstanceOf(Sale_1.Sale);
            expect(result?.id).toBe('sale-123');
            expect(prismaClient_1.prisma.sale.findUnique).toHaveBeenCalledWith({
                where: { id: 'sale-123' },
            });
        });
        it('should return null when sale not found', async () => {
            prismaClient_1.prisma.sale.findUnique.mockResolvedValue(null);
            const result = await repository.findById('nonexistent');
            expect(result).toBeNull();
        });
        it('should handle find by id errors', async () => {
            const error = new Error('Database error');
            prismaClient_1.prisma.sale.findUnique.mockRejectedValue(error);
            await expect(repository.findById('sale-123')).rejects.toThrow(error);
        });
    });
    describe('findWithRelations', () => {
        it('should find sale with all relations', async () => {
            const mockSaleWithRelations = {
                ...mockSaleData,
                items: [mockItemData],
                assignments: [
                    {
                        id: 'assignment-123',
                        saleId: 'sale-123',
                        userId: 'user-123',
                        role: 'comercial',
                        createdAt: new Date('2024-01-01'),
                    },
                ],
                histories: [
                    {
                        id: 'history-123',
                        saleId: 'sale-123',
                        userId: 'user-123',
                        action: 'create',
                        payload: null,
                        createdAt: new Date('2024-01-01'),
                    },
                ],
            };
            prismaClient_1.prisma.sale.findUnique.mockResolvedValue(mockSaleWithRelations);
            const result = await repository.findWithRelations('sale-123');
            expect(result).not.toBeNull();
            expect(result?.sale).toBeInstanceOf(Sale_1.Sale);
            expect(result?.items).toHaveLength(1);
            expect(result?.items[0]).toBeInstanceOf(SaleItem_1.SaleItem);
            expect(result?.assignments).toHaveLength(1);
            expect(result?.assignments[0]).toBeInstanceOf(SaleAssignment_1.SaleAssignment);
            expect(result?.histories).toHaveLength(1);
            expect(result?.histories[0]).toBeInstanceOf(SaleHistory_1.SaleHistory);
            expect(prismaClient_1.prisma.sale.findUnique).toHaveBeenCalledWith({
                where: { id: 'sale-123' },
                include: {
                    items: true,
                    assignments: true,
                    histories: true,
                    client: true,
                    status: true,
                },
            });
        });
        it('should return null when sale not found', async () => {
            prismaClient_1.prisma.sale.findUnique.mockResolvedValue(null);
            const result = await repository.findWithRelations('nonexistent');
            expect(result).toBeNull();
        });
        it('should handle empty relations', async () => {
            const saleWithEmptyRelations = {
                ...mockSaleData,
                items: [],
                assignments: [],
                histories: [],
            };
            prismaClient_1.prisma.sale.findUnique.mockResolvedValue(saleWithEmptyRelations);
            const result = await repository.findWithRelations('sale-123');
            expect(result).not.toBeNull();
            expect(result?.items).toEqual([]);
            expect(result?.assignments).toEqual([]);
            expect(result?.histories).toEqual([]);
        });
        it('should handle find with relations errors', async () => {
            const error = new Error('Database error');
            prismaClient_1.prisma.sale.findUnique.mockRejectedValue(error);
            await expect(repository.findWithRelations('sale-123')).rejects.toThrow(error);
        });
    });
    describe('list', () => {
        it('should list all sales without filters', async () => {
            prismaClient_1.prisma.sale.findMany.mockResolvedValue([mockSaleData]);
            const result = await repository.list({});
            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(Sale_1.Sale);
            expect(prismaClient_1.prisma.sale.findMany).toHaveBeenCalledWith({
                where: {
                    clientId: undefined,
                    statusId: undefined,
                    createdAt: undefined,
                },
                orderBy: { createdAt: 'desc' },
            });
        });
        it('should list sales filtered by clientId', async () => {
            prismaClient_1.prisma.sale.findMany.mockResolvedValue([mockSaleData]);
            const result = await repository.list({ clientId: 'client-123' });
            expect(result).toHaveLength(1);
            expect(prismaClient_1.prisma.sale.findMany).toHaveBeenCalledWith({
                where: {
                    clientId: 'client-123',
                    statusId: undefined,
                    createdAt: undefined,
                },
                orderBy: { createdAt: 'desc' },
            });
        });
        it('should list sales filtered by statusId', async () => {
            prismaClient_1.prisma.sale.findMany.mockResolvedValue([mockSaleData]);
            await repository.list({ statusId: 'status-123' });
            expect(prismaClient_1.prisma.sale.findMany).toHaveBeenCalledWith({
                where: {
                    clientId: undefined,
                    statusId: 'status-123',
                    createdAt: undefined,
                },
                orderBy: { createdAt: 'desc' },
            });
        });
        it('should list sales filtered by date range', async () => {
            const from = new Date('2024-01-01');
            const to = new Date('2024-12-31');
            prismaClient_1.prisma.sale.findMany.mockResolvedValue([mockSaleData]);
            await repository.list({ from, to });
            expect(prismaClient_1.prisma.sale.findMany).toHaveBeenCalledWith({
                where: {
                    clientId: undefined,
                    statusId: undefined,
                    createdAt: {
                        gte: from,
                        lte: to,
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
        });
        it('should list sales filtered by from date only', async () => {
            const from = new Date('2024-01-01');
            prismaClient_1.prisma.sale.findMany.mockResolvedValue([mockSaleData]);
            await repository.list({ from });
            expect(prismaClient_1.prisma.sale.findMany).toHaveBeenCalledWith({
                where: {
                    clientId: undefined,
                    statusId: undefined,
                    createdAt: {
                        gte: from,
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
        });
        it('should list sales with all filters', async () => {
            const filters = {
                clientId: 'client-123',
                statusId: 'status-123',
                from: new Date('2024-01-01'),
                to: new Date('2024-12-31'),
            };
            prismaClient_1.prisma.sale.findMany.mockResolvedValue([mockSaleData]);
            await repository.list(filters);
            expect(prismaClient_1.prisma.sale.findMany).toHaveBeenCalledWith({
                where: {
                    clientId: 'client-123',
                    statusId: 'status-123',
                    createdAt: {
                        gte: filters.from,
                        lte: filters.to,
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
        });
        it('should return empty array when no sales found', async () => {
            prismaClient_1.prisma.sale.findMany.mockResolvedValue([]);
            const result = await repository.list({});
            expect(result).toEqual([]);
        });
        it('should handle list errors', async () => {
            const error = new Error('Database error');
            prismaClient_1.prisma.sale.findMany.mockRejectedValue(error);
            await expect(repository.list({})).rejects.toThrow(error);
        });
    });
    describe('addItem', () => {
        it('should add item to sale', async () => {
            prismaClient_1.prisma.saleItem.create.mockResolvedValue(mockItemData);
            const result = await repository.addItem('sale-123', {
                productId: 'product-123',
                nameSnapshot: 'Product Name',
                skuSnapshot: 'SKU-123',
                unitPrice: 50,
                quantity: 2,
                finalPrice: 100,
            });
            expect(result).toBeInstanceOf(SaleItem_1.SaleItem);
            expect(prismaClient_1.prisma.saleItem.create).toHaveBeenCalledWith({
                data: {
                    saleId: 'sale-123',
                    productId: 'product-123',
                    nameSnapshot: 'Product Name',
                    skuSnapshot: 'SKU-123',
                    unitPrice: 50,
                    quantity: 2,
                    finalPrice: 100,
                },
            });
        });
        it('should add item with null productId and skuSnapshot', async () => {
            const itemWithNulls = { ...mockItemData, productId: null, skuSnapshot: null };
            prismaClient_1.prisma.saleItem.create.mockResolvedValue(itemWithNulls);
            const result = await repository.addItem('sale-123', {
                nameSnapshot: 'Product Name',
                unitPrice: 50,
                quantity: 2,
                finalPrice: 100,
            });
            expect(result).toBeInstanceOf(SaleItem_1.SaleItem);
            expect(prismaClient_1.prisma.saleItem.create).toHaveBeenCalledWith({
                data: {
                    saleId: 'sale-123',
                    productId: null,
                    nameSnapshot: 'Product Name',
                    skuSnapshot: null,
                    unitPrice: 50,
                    quantity: 2,
                    finalPrice: 100,
                },
            });
        });
        it('should handle add item errors', async () => {
            const error = new Error('Foreign key constraint failed');
            prismaClient_1.prisma.saleItem.create.mockRejectedValue(error);
            await expect(repository.addItem('sale-123', {
                nameSnapshot: 'Test',
                unitPrice: 50,
                quantity: 1,
                finalPrice: 50,
            })).rejects.toThrow(error);
        });
    });
    describe('updateItem', () => {
        it('should update item', async () => {
            const updatedItem = { ...mockItemData, unitPrice: 75, finalPrice: 150 };
            prismaClient_1.prisma.saleItem.update.mockResolvedValue(updatedItem);
            const result = await repository.updateItem('item-123', {
                unitPrice: 75,
                quantity: 2,
                finalPrice: 150,
            });
            expect(result).toBeInstanceOf(SaleItem_1.SaleItem);
            expect(prismaClient_1.prisma.saleItem.update).toHaveBeenCalledWith({
                where: { id: 'item-123' },
                data: {
                    unitPrice: 75,
                    quantity: 2,
                    finalPrice: 150,
                },
            });
        });
        it('should update only provided fields', async () => {
            prismaClient_1.prisma.saleItem.update.mockResolvedValue(mockItemData);
            await repository.updateItem('item-123', { quantity: 3 });
            expect(prismaClient_1.prisma.saleItem.update).toHaveBeenCalledWith({
                where: { id: 'item-123' },
                data: {
                    unitPrice: undefined,
                    quantity: 3,
                    finalPrice: undefined,
                },
            });
        });
        it('should handle update item errors', async () => {
            const error = new Error('Item not found');
            prismaClient_1.prisma.saleItem.update.mockRejectedValue(error);
            await expect(repository.updateItem('item-123', { quantity: 5 })).rejects.toThrow(error);
        });
    });
    describe('removeItem', () => {
        it('should remove item from sale', async () => {
            prismaClient_1.prisma.saleItem.delete.mockResolvedValue(mockItemData);
            await repository.removeItem('item-123');
            expect(prismaClient_1.prisma.saleItem.delete).toHaveBeenCalledWith({
                where: { id: 'item-123' },
            });
        });
        it('should handle remove item errors', async () => {
            const error = new Error('Item not found');
            prismaClient_1.prisma.saleItem.delete.mockRejectedValue(error);
            await expect(repository.removeItem('item-123')).rejects.toThrow(error);
        });
    });
    describe('addHistory', () => {
        it('should add history entry with all fields', async () => {
            const mockHistoryData = {
                id: 'history-123',
                saleId: 'sale-123',
                userId: 'user-123',
                action: 'create',
                payload: { note: 'Created sale' },
                createdAt: new Date('2024-01-01'),
            };
            prismaClient_1.prisma.saleHistory.create.mockResolvedValue(mockHistoryData);
            const result = await repository.addHistory({
                saleId: 'sale-123',
                userId: 'user-123',
                action: 'create',
                payload: { note: 'Created sale' },
            });
            expect(result).toBeInstanceOf(SaleHistory_1.SaleHistory);
            expect(prismaClient_1.prisma.saleHistory.create).toHaveBeenCalledWith({
                data: {
                    saleId: 'sale-123',
                    userId: 'user-123',
                    action: 'create',
                    payload: { note: 'Created sale' },
                },
            });
        });
        it('should add history with null userId and payload', async () => {
            const mockHistoryData = {
                id: 'history-123',
                saleId: 'sale-123',
                userId: null,
                action: 'create',
                payload: null,
                createdAt: new Date('2024-01-01'),
            };
            prismaClient_1.prisma.saleHistory.create.mockResolvedValue(mockHistoryData);
            const result = await repository.addHistory({
                saleId: 'sale-123',
                action: 'create',
            });
            expect(result).toBeInstanceOf(SaleHistory_1.SaleHistory);
            expect(prismaClient_1.prisma.saleHistory.create).toHaveBeenCalledWith({
                data: {
                    saleId: 'sale-123',
                    userId: null,
                    action: 'create',
                    payload: client_1.Prisma.JsonNull,
                },
            });
        });
        it('should handle add history errors', async () => {
            const error = new Error('Foreign key constraint failed');
            prismaClient_1.prisma.saleHistory.create.mockRejectedValue(error);
            await expect(repository.addHistory({ saleId: 'sale-123', action: 'create' })).rejects.toThrow(error);
        });
    });
    describe('assignUser', () => {
        it('should assign user to sale', async () => {
            const mockAssignmentData = {
                id: 'assignment-123',
                saleId: 'sale-123',
                userId: 'user-123',
                role: 'comercial',
                createdAt: new Date('2024-01-01'),
            };
            prismaClient_1.prisma.saleAssignment.create.mockResolvedValue(mockAssignmentData);
            const result = await repository.assignUser({
                saleId: 'sale-123',
                userId: 'user-123',
                role: 'comercial',
            });
            expect(result).toBeInstanceOf(SaleAssignment_1.SaleAssignment);
            expect(prismaClient_1.prisma.saleAssignment.create).toHaveBeenCalledWith({
                data: {
                    saleId: 'sale-123',
                    userId: 'user-123',
                    role: 'comercial',
                },
            });
        });
        it('should handle assign user errors', async () => {
            const error = new Error('Duplicate assignment');
            prismaClient_1.prisma.saleAssignment.create.mockRejectedValue(error);
            await expect(repository.assignUser({
                saleId: 'sale-123',
                userId: 'user-123',
                role: 'comercial',
            })).rejects.toThrow(error);
        });
    });
});
