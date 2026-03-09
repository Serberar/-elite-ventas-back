"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RemoveSaleItemUseCase_1 = require("../../../application/use-cases/sale/RemoveSaleItemUseCase");
const AppError_1 = require("../../../application/shared/AppError");
jest.mock('@infrastructure/observability/logger/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));
jest.mock('@infrastructure/observability/metrics/prometheusMetrics', () => ({
    businessSaleItemsDeleted: {
        inc: jest.fn(),
    },
}));
describe('RemoveSaleItemUseCase', () => {
    let useCase;
    let mockRepository;
    const mockUser = {
        id: 'user-123',
        role: 'administrador',
        firstName: 'Test',
    };
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
        useCase = new RemoveSaleItemUseCase_1.RemoveSaleItemUseCase(mockRepository);
    });
    describe('execute', () => {
        it('should remove sale item successfully', async () => {
            mockRepository.removeItem.mockResolvedValue();
            mockRepository.addHistory.mockResolvedValue({});
            await useCase.execute('item-123', mockUser);
            expect(mockRepository.removeItem).toHaveBeenCalledWith('item-123');
            expect(mockRepository.addHistory).toHaveBeenCalledWith({
                saleId: '',
                userId: 'user-123',
                action: 'delete_item',
                payload: { itemId: 'item-123' },
            });
        });
        it('should work with coordinador role', async () => {
            const coordinadorUser = {
                id: 'user-456',
                role: 'coordinador',
                firstName: 'Coordinador',
            };
            mockRepository.removeItem.mockResolvedValue();
            mockRepository.addHistory.mockResolvedValue({});
            await useCase.execute('item-123', coordinadorUser);
            expect(mockRepository.removeItem).toHaveBeenCalled();
        });
        it('should work with verificador role', async () => {
            const verificadorUser = {
                id: 'user-789',
                role: 'verificador',
                firstName: 'Verificador',
            };
            mockRepository.removeItem.mockResolvedValue();
            mockRepository.addHistory.mockResolvedValue({});
            await useCase.execute('item-123', verificadorUser);
            expect(mockRepository.removeItem).toHaveBeenCalled();
        });
        it('should throw AuthorizationError for comercial role', async () => {
            const comercialUser = {
                id: 'user-999',
                role: 'comercial',
                firstName: 'Comercial',
            };
            await expect(useCase.execute('item-123', comercialUser)).rejects.toThrow(AppError_1.AuthorizationError);
            expect(mockRepository.removeItem).not.toHaveBeenCalled();
        });
        it('should handle repository errors on removeItem', async () => {
            const dbError = new Error('Database error');
            mockRepository.removeItem.mockRejectedValue(dbError);
            await expect(useCase.execute('item-123', mockUser)).rejects.toThrow(dbError);
        });
        it('should handle repository errors on addHistory', async () => {
            const dbError = new Error('History error');
            mockRepository.removeItem.mockResolvedValue();
            mockRepository.addHistory.mockRejectedValue(dbError);
            await expect(useCase.execute('item-123', mockUser)).rejects.toThrow(dbError);
        });
        it('should call methods in correct order', async () => {
            const callOrder = [];
            mockRepository.removeItem.mockImplementation(async () => {
                callOrder.push('removeItem');
            });
            mockRepository.addHistory.mockImplementation(async () => {
                callOrder.push('addHistory');
                return {};
            });
            await useCase.execute('item-123', mockUser);
            expect(callOrder).toEqual(['removeItem', 'addHistory']);
        });
    });
});
