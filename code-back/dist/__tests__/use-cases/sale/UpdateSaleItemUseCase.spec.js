"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UpdateSaleItemUseCase_1 = require("../../../application/use-cases/sale/UpdateSaleItemUseCase");
const SaleItem_1 = require("../../../domain/entities/SaleItem");
const AppError_1 = require("../../../application/shared/AppError");
jest.mock('@infrastructure/observability/logger/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));
jest.mock('@infrastructure/observability/metrics/prometheusMetrics', () => ({
    businessSaleItemsUpdated: {
        inc: jest.fn(),
    },
}));
describe('UpdateSaleItemUseCase', () => {
    let useCase;
    let mockRepository;
    const mockUser = {
        id: 'user-123',
        role: 'administrador',
        firstName: 'Test',
    };
    const mockSaleItem = new SaleItem_1.SaleItem({
        id: 'item-123',
        saleId: 'sale-123',
        productId: 'product-1',
        quantity: 3,
        unitPrice: 150,
        finalPrice: 450,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
    });
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
        useCase = new UpdateSaleItemUseCase_1.UpdateSaleItemUseCase(mockRepository);
    });
    describe('execute', () => {
        it('should update single sale item successfully', async () => {
            const dto = {
                saleId: 'sale-123',
                items: [
                    {
                        id: 'item-123',
                        unitPrice: 150,
                        quantity: 3,
                        finalPrice: 450,
                    },
                ],
            };
            mockRepository.updateItem.mockResolvedValue(mockSaleItem);
            mockRepository.addHistory.mockResolvedValue({});
            await useCase.execute(dto, mockUser);
            expect(mockRepository.updateItem).toHaveBeenCalledWith('item-123', {
                unitPrice: 150,
                quantity: 3,
                finalPrice: 450,
            });
            expect(mockRepository.addHistory).toHaveBeenCalledWith({
                saleId: 'sale-123',
                userId: 'user-123',
                action: 'update_item',
                payload: dto.items[0],
            });
        });
        it('should update multiple sale items', async () => {
            const dto = {
                saleId: 'sale-123',
                items: [
                    {
                        id: 'item-1',
                        unitPrice: 100,
                        quantity: 2,
                        finalPrice: 200,
                    },
                    {
                        id: 'item-2',
                        unitPrice: 150,
                        quantity: 3,
                        finalPrice: 450,
                    },
                ],
            };
            mockRepository.updateItem.mockResolvedValue(mockSaleItem);
            mockRepository.addHistory.mockResolvedValue({});
            await useCase.execute(dto, mockUser);
            expect(mockRepository.updateItem).toHaveBeenCalledTimes(2);
            expect(mockRepository.addHistory).toHaveBeenCalledTimes(2);
            expect(mockRepository.updateItem).toHaveBeenNthCalledWith(1, 'item-1', {
                unitPrice: 100,
                quantity: 2,
                finalPrice: 200,
            });
            expect(mockRepository.updateItem).toHaveBeenNthCalledWith(2, 'item-2', {
                unitPrice: 150,
                quantity: 3,
                finalPrice: 450,
            });
        });
        it('should work with coordinador role', async () => {
            const coordinadorUser = {
                id: 'user-456',
                role: 'coordinador',
                firstName: 'Coordinador',
            };
            const dto = {
                saleId: 'sale-123',
                items: [
                    {
                        id: 'item-123',
                        unitPrice: 150,
                        quantity: 3,
                        finalPrice: 450,
                    },
                ],
            };
            mockRepository.updateItem.mockResolvedValue(mockSaleItem);
            mockRepository.addHistory.mockResolvedValue({});
            await useCase.execute(dto, coordinadorUser);
            expect(mockRepository.updateItem).toHaveBeenCalled();
        });
        it('should work with verificador role', async () => {
            const verificadorUser = {
                id: 'user-789',
                role: 'verificador',
                firstName: 'Verificador',
            };
            const dto = {
                saleId: 'sale-123',
                items: [
                    {
                        id: 'item-123',
                        unitPrice: 150,
                        quantity: 3,
                        finalPrice: 450,
                    },
                ],
            };
            mockRepository.updateItem.mockResolvedValue(mockSaleItem);
            mockRepository.addHistory.mockResolvedValue({});
            await useCase.execute(dto, verificadorUser);
            expect(mockRepository.updateItem).toHaveBeenCalled();
        });
        it('should throw AuthorizationError for comercial role', async () => {
            const comercialUser = {
                id: 'user-999',
                role: 'comercial',
                firstName: 'Comercial',
            };
            const dto = {
                saleId: 'sale-123',
                items: [
                    {
                        id: 'item-123',
                        unitPrice: 150,
                        quantity: 3,
                        finalPrice: 450,
                    },
                ],
            };
            await expect(useCase.execute(dto, comercialUser)).rejects.toThrow(AppError_1.AuthorizationError);
            expect(mockRepository.updateItem).not.toHaveBeenCalled();
        });
        it('should handle repository errors on updateItem', async () => {
            const dto = {
                saleId: 'sale-123',
                items: [
                    {
                        id: 'item-123',
                        unitPrice: 150,
                        quantity: 3,
                        finalPrice: 450,
                    },
                ],
            };
            const dbError = new Error('Database error');
            mockRepository.updateItem.mockRejectedValue(dbError);
            await expect(useCase.execute(dto, mockUser)).rejects.toThrow(dbError);
        });
        it('should handle repository errors on addHistory', async () => {
            const dto = {
                saleId: 'sale-123',
                items: [
                    {
                        id: 'item-123',
                        unitPrice: 150,
                        quantity: 3,
                        finalPrice: 450,
                    },
                ],
            };
            const dbError = new Error('History error');
            mockRepository.updateItem.mockResolvedValue(mockSaleItem);
            mockRepository.addHistory.mockRejectedValue(dbError);
            await expect(useCase.execute(dto, mockUser)).rejects.toThrow(dbError);
        });
        it('should process items in order', async () => {
            const dto = {
                saleId: 'sale-123',
                items: [
                    {
                        id: 'item-1',
                        unitPrice: 100,
                        quantity: 2,
                        finalPrice: 200,
                    },
                    {
                        id: 'item-2',
                        unitPrice: 150,
                        quantity: 3,
                        finalPrice: 450,
                    },
                ],
            };
            const callOrder = [];
            mockRepository.updateItem.mockImplementation(async (id) => {
                callOrder.push(`updateItem-${id}`);
                return mockSaleItem;
            });
            mockRepository.addHistory.mockImplementation(async () => {
                callOrder.push('addHistory');
                return {};
            });
            await useCase.execute(dto, mockUser);
            expect(callOrder).toEqual([
                'updateItem-item-1',
                'addHistory',
                'updateItem-item-2',
                'addHistory',
            ]);
        });
        it('should handle empty items array', async () => {
            const dto = {
                saleId: 'sale-123',
                items: [],
            };
            await useCase.execute(dto, mockUser);
            expect(mockRepository.updateItem).not.toHaveBeenCalled();
            expect(mockRepository.addHistory).not.toHaveBeenCalled();
        });
        it('should handle decimal prices and quantities', async () => {
            const dto = {
                saleId: 'sale-123',
                items: [
                    {
                        id: 'item-123',
                        unitPrice: 99.99,
                        quantity: 1,
                        finalPrice: 99.99,
                    },
                ],
            };
            mockRepository.updateItem.mockResolvedValue(mockSaleItem);
            mockRepository.addHistory.mockResolvedValue({});
            await useCase.execute(dto, mockUser);
            expect(mockRepository.updateItem).toHaveBeenCalledWith('item-123', {
                unitPrice: 99.99,
                quantity: 1,
                finalPrice: 99.99,
            });
        });
    });
});
