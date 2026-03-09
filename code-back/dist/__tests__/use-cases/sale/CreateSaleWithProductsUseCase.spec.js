"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CreateSaleWithProductsUseCase_1 = require("../../../application/use-cases/sale/CreateSaleWithProductsUseCase");
const Sale_1 = require("../../../domain/entities/Sale");
jest.mock('@infrastructure/observability/logger/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));
jest.mock('@infrastructure/observability/metrics/prometheusMetrics', () => ({
    businessSalesCreated: { inc: jest.fn() },
    businessSaleItemsAdded: { inc: jest.fn() },
}));
describe('CreateSaleWithProductsUseCase', () => {
    let useCase;
    let mockRepository;
    const mockUser = {
        id: 'user-123',
        role: 'administrador',
        firstName: 'Test',
    };
    const mockSaleDTO = {
        clientId: 'client-123',
        statusId: 'status-123',
        notes: [{ note: 'Test note' }],
        metadata: { key: 'value' },
        items: [
            {
                productId: 'product-1',
                nameSnapshot: 'Product 1',
                skuSnapshot: 'SKU-1',
                unitPrice: 100,
                quantity: 2,
                finalPrice: 200,
            },
        ],
    };
    const mockSale = new Sale_1.Sale('sale-123', 'client-123', 'status-123', 0, [{ note: 'Test note' }], { key: 'value' }, new Date('2024-01-01'), new Date('2024-01-01'), null);
    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findWithRelations: jest.fn(),
            update: jest.fn(),
            addItem: jest.fn(),
            updateItem: jest.fn(),
            removeItem: jest.fn(),
            addHistory: jest.fn(),
            list: jest.fn(),
            assignUser: jest.fn(),
        };
        useCase = new CreateSaleWithProductsUseCase_1.CreateSaleWithProductsUseCase(mockRepository);
    });
    describe('execute', () => {
        it('should create sale with products successfully', async () => {
            const updatedSale = new Sale_1.Sale('sale-123', 'client-123', 'status-123', 200, [{ note: 'Test note' }], { key: 'value' }, new Date('2024-01-01'), new Date('2024-01-01'), null);
            mockRepository.create.mockResolvedValue(mockSale);
            mockRepository.addItem.mockResolvedValue({});
            mockRepository.update.mockResolvedValue(updatedSale);
            mockRepository.addHistory.mockResolvedValue({});
            const result = await useCase.execute(mockSaleDTO, mockUser);
            expect(result).toEqual(updatedSale);
            expect(mockRepository.create).toHaveBeenCalled();
            expect(mockRepository.addItem).toHaveBeenCalledWith('sale-123', mockSaleDTO.items[0]);
            expect(mockRepository.update).toHaveBeenCalledWith('sale-123', { totalAmount: 200 });
            expect(mockRepository.addHistory).toHaveBeenCalled();
        });
        it('should work with all authorized roles', async () => {
            const comercialUser = {
                id: 'user-456',
                role: 'comercial',
                firstName: 'Comercial',
            };
            const updatedSale = new Sale_1.Sale('sale-123', 'client-123', 'status-123', 200, [{ note: 'Test note' }], { key: 'value' }, new Date('2024-01-01'), new Date('2024-01-01'), null);
            mockRepository.create.mockResolvedValue(mockSale);
            mockRepository.addItem.mockResolvedValue({});
            mockRepository.update.mockResolvedValue(updatedSale);
            mockRepository.addHistory.mockResolvedValue({});
            const result = await useCase.execute(mockSaleDTO, comercialUser);
            expect(result).toEqual(updatedSale);
            expect(mockRepository.create).toHaveBeenCalled();
        });
        it('should calculate total amount from multiple items', async () => {
            const dtoWithMultipleItems = {
                ...mockSaleDTO,
                items: [
                    {
                        productId: 'product-1',
                        nameSnapshot: 'Product 1',
                        skuSnapshot: 'SKU-1',
                        unitPrice: 100,
                        quantity: 2,
                        finalPrice: 200,
                    },
                    {
                        productId: 'product-2',
                        nameSnapshot: 'Product 2',
                        skuSnapshot: 'SKU-2',
                        unitPrice: 50,
                        quantity: 3,
                        finalPrice: 150,
                    },
                ],
            };
            const updatedSale = new Sale_1.Sale('sale-123', 'client-123', 'status-123', 350, [{ note: 'Test note' }], { key: 'value' }, new Date('2024-01-01'), new Date('2024-01-01'), null);
            mockRepository.create.mockResolvedValue(mockSale);
            mockRepository.addItem.mockResolvedValue({});
            mockRepository.update.mockResolvedValue(updatedSale);
            mockRepository.addHistory.mockResolvedValue({});
            const result = await useCase.execute(dtoWithMultipleItems, mockUser);
            expect(result.totalAmount).toBe(350);
            expect(mockRepository.update).toHaveBeenCalledWith('sale-123', { totalAmount: 350 });
        });
        it('should handle empty items array', async () => {
            const dtoWithNoItems = {
                ...mockSaleDTO,
                items: [],
            };
            const updatedSale = new Sale_1.Sale('sale-123', 'client-123', 'status-123', 0, [{ note: 'Test note' }], { key: 'value' }, new Date('2024-01-01'), new Date('2024-01-01'), null);
            mockRepository.create.mockResolvedValue(mockSale);
            mockRepository.update.mockResolvedValue(updatedSale);
            mockRepository.addHistory.mockResolvedValue({});
            const result = await useCase.execute(dtoWithNoItems, mockUser);
            expect(result.totalAmount).toBe(0);
            expect(mockRepository.addItem).not.toHaveBeenCalled();
        });
        it('should handle null notes and metadata', async () => {
            const dtoWithNulls = {
                ...mockSaleDTO,
                notes: null,
                metadata: null,
            };
            mockRepository.create.mockResolvedValue(mockSale);
            mockRepository.addItem.mockResolvedValue({});
            mockRepository.update.mockResolvedValue(mockSale);
            mockRepository.addHistory.mockResolvedValue({});
            await useCase.execute(dtoWithNulls, mockUser);
            expect(mockRepository.create).toHaveBeenCalled();
        });
        it('should handle repository errors', async () => {
            const dbError = new Error('Database error');
            mockRepository.create.mockRejectedValue(dbError);
            await expect(useCase.execute(mockSaleDTO, mockUser)).rejects.toThrow(dbError);
        });
    });
});
