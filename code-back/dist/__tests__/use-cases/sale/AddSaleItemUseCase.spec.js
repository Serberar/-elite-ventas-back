"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AddSaleItemUseCase_1 = require("../../../application/use-cases/sale/AddSaleItemUseCase");
const SaleItem_1 = require("../../../domain/entities/SaleItem");
const AppError_1 = require("../../../application/shared/AppError");
jest.mock('@infrastructure/observability/logger/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));
jest.mock('@infrastructure/observability/metrics/prometheusMetrics', () => ({
    businessSaleItemsAdded: {
        inc: jest.fn(),
    },
}));
describe('AddSaleItemUseCase', () => {
    let useCase;
    let mockRepository;
    const mockUser = {
        id: 'user-123',
        role: 'administrador',
        firstName: 'Test',
    };
    const mockItem = {
        productId: 'product-1',
        nameSnapshot: 'Product 1',
        skuSnapshot: 'SKU-1',
        unitPrice: 100,
        quantity: 2,
        finalPrice: 200,
    };
    const mockSaleItem = new SaleItem_1.SaleItem('item-123', 'sale-123', 'product-1', 'Product 1', 'SKU-1', 100, 2, 200, new Date('2024-01-01'), new Date('2024-01-01'));
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
            listPaginated: jest.fn(),
            assignUser: jest.fn(),
            updateClientSnapshot: jest.fn(),
        };
        useCase = new AddSaleItemUseCase_1.AddSaleItemUseCase(mockRepository);
    });
    describe('execute', () => {
        it('should add sale item successfully', async () => {
            mockRepository.addItem.mockResolvedValue(mockSaleItem);
            mockRepository.addHistory.mockResolvedValue({});
            const result = await useCase.execute('sale-123', mockItem, mockUser);
            expect(result).toEqual(mockSaleItem);
            expect(mockRepository.addItem).toHaveBeenCalledWith('sale-123', mockItem);
            expect(mockRepository.addHistory).toHaveBeenCalledWith({
                saleId: 'sale-123',
                userId: 'user-123',
                action: 'add_item',
                payload: mockItem,
            });
        });
        it('should add item with optional productId', async () => {
            const itemWithoutProduct = {
                ...mockItem,
                productId: null,
            };
            mockRepository.addItem.mockResolvedValue(mockSaleItem);
            mockRepository.addHistory.mockResolvedValue({});
            await useCase.execute('sale-123', itemWithoutProduct, mockUser);
            expect(mockRepository.addItem).toHaveBeenCalledWith('sale-123', itemWithoutProduct);
        });
        it('should add item with null skuSnapshot', async () => {
            const itemWithoutSku = {
                ...mockItem,
                skuSnapshot: null,
            };
            mockRepository.addItem.mockResolvedValue(mockSaleItem);
            mockRepository.addHistory.mockResolvedValue({});
            await useCase.execute('sale-123', itemWithoutSku, mockUser);
            expect(mockRepository.addItem).toHaveBeenCalledWith('sale-123', itemWithoutSku);
        });
        it('should work with coordinador role', async () => {
            const coordinadorUser = {
                id: 'user-456',
                role: 'coordinador',
                firstName: 'Coordinador',
            };
            mockRepository.addItem.mockResolvedValue(mockSaleItem);
            mockRepository.addHistory.mockResolvedValue({});
            const result = await useCase.execute('sale-123', mockItem, coordinadorUser);
            expect(result).toEqual(mockSaleItem);
        });
        it('should work with verificador role', async () => {
            const verificadorUser = {
                id: 'user-789',
                role: 'verificador',
                firstName: 'Verificador',
            };
            mockRepository.addItem.mockResolvedValue(mockSaleItem);
            mockRepository.addHistory.mockResolvedValue({});
            const result = await useCase.execute('sale-123', mockItem, verificadorUser);
            expect(result).toEqual(mockSaleItem);
        });
        it('should throw AuthorizationError for comercial role', async () => {
            const comercialUser = {
                id: 'user-999',
                role: 'comercial',
                firstName: 'Comercial',
            };
            await expect(useCase.execute('sale-123', mockItem, comercialUser)).rejects.toThrow(AppError_1.AuthorizationError);
            expect(mockRepository.addItem).not.toHaveBeenCalled();
        });
        it('should handle repository errors on addItem', async () => {
            const dbError = new Error('Database error');
            mockRepository.addItem.mockRejectedValue(dbError);
            await expect(useCase.execute('sale-123', mockItem, mockUser)).rejects.toThrow(dbError);
        });
        it('should handle repository errors on addHistory', async () => {
            const dbError = new Error('History error');
            mockRepository.addItem.mockResolvedValue(mockSaleItem);
            mockRepository.addHistory.mockRejectedValue(dbError);
            await expect(useCase.execute('sale-123', mockItem, mockUser)).rejects.toThrow(dbError);
        });
        it('should call methods in correct order', async () => {
            const callOrder = [];
            mockRepository.addItem.mockImplementation(async () => {
                callOrder.push('addItem');
                return mockSaleItem;
            });
            mockRepository.addHistory.mockImplementation(async () => {
                callOrder.push('addHistory');
                return {};
            });
            await useCase.execute('sale-123', mockItem, mockUser);
            expect(callOrder).toEqual(['addItem', 'addHistory']);
        });
        it('should handle large quantities', async () => {
            const largeItem = {
                ...mockItem,
                quantity: 1000,
                finalPrice: 100000,
            };
            mockRepository.addItem.mockResolvedValue(mockSaleItem);
            mockRepository.addHistory.mockResolvedValue({});
            await useCase.execute('sale-123', largeItem, mockUser);
            expect(mockRepository.addItem).toHaveBeenCalledWith('sale-123', largeItem);
        });
        it('should handle decimal prices', async () => {
            const decimalItem = {
                ...mockItem,
                unitPrice: 99.99,
                finalPrice: 199.98,
            };
            mockRepository.addItem.mockResolvedValue(mockSaleItem);
            mockRepository.addHistory.mockResolvedValue({});
            await useCase.execute('sale-123', decimalItem, mockUser);
            expect(mockRepository.addItem).toHaveBeenCalledWith('sale-123', decimalItem);
        });
    });
});
