"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ChangeSaleStatusUseCase_1 = require("../../../application/use-cases/sale/ChangeSaleStatusUseCase");
const Sale_1 = require("../../../domain/entities/Sale");
const SaleStatus_1 = require("../../../domain/entities/SaleStatus");
const AppError_1 = require("../../../application/shared/AppError");
jest.mock('@infrastructure/observability/logger/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));
jest.mock('@infrastructure/observability/metrics/prometheusMetrics', () => ({
    businessSaleStatusChanged: {
        inc: jest.fn(),
    },
}));
describe('ChangeSaleStatusUseCase', () => {
    let useCase;
    let mockSaleRepository;
    let mockStatusRepository;
    const mockUser = {
        id: 'user-123',
        role: 'administrador',
        firstName: 'Test',
    };
    const mockSale = new Sale_1.Sale('sale-123', 'client-123', 'status-pending', 100, null, null, { firstName: 'John', lastName: 'Doe', dni: '12345678A', phones: ['123456789'], bankAccounts: [] }, { address: 'Test Address' }, new Date('2024-01-01'), new Date('2024-01-01'), null);
    const mockStatus = new SaleStatus_1.SaleStatus('status-completed', 'Completado', 3, '#00FF00', false, false);
    const mockFinalStatus = new SaleStatus_1.SaleStatus('status-final', 'Finalizado', 4, '#FF0000', true, false);
    beforeEach(() => {
        jest.clearAllMocks();
        mockSaleRepository = {
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
        mockStatusRepository = {
            findById: jest.fn(),
            findInitialStatus: jest.fn(),
            list: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            reorder: jest.fn(),
            delete: jest.fn(),
        };
        useCase = new ChangeSaleStatusUseCase_1.ChangeSaleStatusUseCase(mockSaleRepository, mockStatusRepository);
    });
    describe('execute', () => {
        it('should change sale status successfully', async () => {
            const dto = {
                saleId: 'sale-123',
                statusId: 'status-completed',
                comment: 'Changed to completed',
            };
            const updatedSale = new Sale_1.Sale('sale-123', 'client-123', 'status-completed', 100, null, null, { firstName: 'John', lastName: 'Doe', dni: '12345678A', phones: ['123456789'], bankAccounts: [] }, { address: 'Test Address' }, new Date('2024-01-01'), new Date('2024-01-02'), null);
            mockSaleRepository.findById.mockResolvedValue(mockSale);
            mockStatusRepository.findById.mockResolvedValue(mockStatus);
            mockSaleRepository.update.mockResolvedValue(updatedSale);
            mockSaleRepository.addHistory.mockResolvedValue({});
            const result = await useCase.execute(dto, mockUser);
            expect(result).toEqual(updatedSale);
            expect(mockSaleRepository.findById).toHaveBeenCalledWith('sale-123');
            expect(mockStatusRepository.findById).toHaveBeenCalledWith('status-completed');
            expect(mockSaleRepository.update).toHaveBeenCalledWith('sale-123', {
                statusId: 'status-completed',
                closedAt: null,
            });
            expect(mockSaleRepository.addHistory).toHaveBeenCalledWith({
                saleId: 'sale-123',
                userId: 'user-123',
                action: 'change_status',
                payload: {
                    from: 'status-pending',
                    to: 'status-completed',
                    comment: 'Changed to completed',
                },
            });
        });
        it('should set closedAt when changing to final status', async () => {
            const dto = {
                saleId: 'sale-123',
                statusId: 'status-final',
            };
            const updatedSale = new Sale_1.Sale('sale-123', 'client-123', 'status-final', 100, null, null, { firstName: 'John', lastName: 'Doe', dni: '12345678A', phones: ['123456789'], bankAccounts: [] }, { address: 'Test Address' }, new Date('2024-01-01'), new Date('2024-01-02'), new Date('2024-01-02'));
            mockSaleRepository.findById.mockResolvedValue(mockSale);
            mockStatusRepository.findById.mockResolvedValue(mockFinalStatus);
            mockSaleRepository.update.mockResolvedValue(updatedSale);
            mockSaleRepository.addHistory.mockResolvedValue({});
            const result = await useCase.execute(dto, mockUser);
            expect(result.closedAt).not.toBeNull();
            expect(mockSaleRepository.update).toHaveBeenCalledWith('sale-123', {
                statusId: 'status-final',
                closedAt: expect.any(Date),
            });
        });
        it('should handle status change without comment', async () => {
            const dto = {
                saleId: 'sale-123',
                statusId: 'status-completed',
            };
            const updatedSale = new Sale_1.Sale('sale-123', 'client-123', 'status-completed', 100, null, null, { firstName: 'John', lastName: 'Doe', dni: '12345678A', phones: ['123456789'], bankAccounts: [] }, { address: 'Test Address' }, new Date('2024-01-01'), new Date('2024-01-02'), null);
            mockSaleRepository.findById.mockResolvedValue(mockSale);
            mockStatusRepository.findById.mockResolvedValue(mockStatus);
            mockSaleRepository.update.mockResolvedValue(updatedSale);
            mockSaleRepository.addHistory.mockResolvedValue({});
            await useCase.execute(dto, mockUser);
            expect(mockSaleRepository.addHistory).toHaveBeenCalledWith({
                saleId: 'sale-123',
                userId: 'user-123',
                action: 'change_status',
                payload: {
                    from: 'status-pending',
                    to: 'status-completed',
                    comment: null,
                },
            });
        });
        it('should throw error when sale does not exist', async () => {
            const dto = {
                saleId: 'non-existent-sale',
                statusId: 'status-completed',
            };
            mockSaleRepository.findById.mockResolvedValue(null);
            await expect(useCase.execute(dto, mockUser)).rejects.toThrow('Venta no encontrada');
            expect(mockStatusRepository.findById).not.toHaveBeenCalled();
            expect(mockSaleRepository.update).not.toHaveBeenCalled();
        });
        it('should throw error when status does not exist', async () => {
            const dto = {
                saleId: 'sale-123',
                statusId: 'non-existent-status',
            };
            mockSaleRepository.findById.mockResolvedValue(mockSale);
            mockStatusRepository.findById.mockResolvedValue(null);
            await expect(useCase.execute(dto, mockUser)).rejects.toThrow('Estado no encontrado');
            expect(mockSaleRepository.update).not.toHaveBeenCalled();
        });
        it('should work with coordinador role', async () => {
            const coordinadorUser = {
                id: 'user-456',
                role: 'coordinador',
                firstName: 'Coordinador',
            };
            const dto = {
                saleId: 'sale-123',
                statusId: 'status-completed',
            };
            const updatedSale = new Sale_1.Sale('sale-123', 'client-123', 'status-completed', 100, null, null, { firstName: 'John', lastName: 'Doe', dni: '12345678A', phones: ['123456789'], bankAccounts: [] }, { address: 'Test Address' }, new Date('2024-01-01'), new Date('2024-01-02'), null);
            mockSaleRepository.findById.mockResolvedValue(mockSale);
            mockStatusRepository.findById.mockResolvedValue(mockStatus);
            mockSaleRepository.update.mockResolvedValue(updatedSale);
            mockSaleRepository.addHistory.mockResolvedValue({});
            const result = await useCase.execute(dto, coordinadorUser);
            expect(result).toEqual(updatedSale);
        });
        it('should work with verificador role', async () => {
            const verificadorUser = {
                id: 'user-789',
                role: 'verificador',
                firstName: 'Verificador',
            };
            const dto = {
                saleId: 'sale-123',
                statusId: 'status-completed',
            };
            const updatedSale = new Sale_1.Sale('sale-123', 'client-123', 'status-completed', 100, null, null, { firstName: 'John', lastName: 'Doe', dni: '12345678A', phones: ['123456789'], bankAccounts: [] }, { address: 'Test Address' }, new Date('2024-01-01'), new Date('2024-01-02'), null);
            mockSaleRepository.findById.mockResolvedValue(mockSale);
            mockStatusRepository.findById.mockResolvedValue(mockStatus);
            mockSaleRepository.update.mockResolvedValue(updatedSale);
            mockSaleRepository.addHistory.mockResolvedValue({});
            const result = await useCase.execute(dto, verificadorUser);
            expect(result).toEqual(updatedSale);
        });
        it('should throw AuthorizationError for comercial role', async () => {
            const comercialUser = {
                id: 'user-999',
                role: 'comercial',
                firstName: 'Comercial',
            };
            const dto = {
                saleId: 'sale-123',
                statusId: 'status-completed',
            };
            await expect(useCase.execute(dto, comercialUser)).rejects.toThrow(AppError_1.AuthorizationError);
            expect(mockSaleRepository.findById).not.toHaveBeenCalled();
        });
        it('should handle repository errors on findById sale', async () => {
            const dto = {
                saleId: 'sale-123',
                statusId: 'status-completed',
            };
            const dbError = new Error('Database error');
            mockSaleRepository.findById.mockRejectedValue(dbError);
            await expect(useCase.execute(dto, mockUser)).rejects.toThrow(dbError);
        });
        it('should handle repository errors on findById status', async () => {
            const dto = {
                saleId: 'sale-123',
                statusId: 'status-completed',
            };
            const dbError = new Error('Database error');
            mockSaleRepository.findById.mockResolvedValue(mockSale);
            mockStatusRepository.findById.mockRejectedValue(dbError);
            await expect(useCase.execute(dto, mockUser)).rejects.toThrow(dbError);
        });
        it('should handle repository errors on update', async () => {
            const dto = {
                saleId: 'sale-123',
                statusId: 'status-completed',
            };
            const dbError = new Error('Database error');
            mockSaleRepository.findById.mockResolvedValue(mockSale);
            mockStatusRepository.findById.mockResolvedValue(mockStatus);
            mockSaleRepository.update.mockRejectedValue(dbError);
            await expect(useCase.execute(dto, mockUser)).rejects.toThrow(dbError);
        });
        it('should call methods in correct order', async () => {
            const dto = {
                saleId: 'sale-123',
                statusId: 'status-completed',
            };
            const callOrder = [];
            mockSaleRepository.findById.mockImplementation(async () => {
                callOrder.push('findById-sale');
                return mockSale;
            });
            mockStatusRepository.findById.mockImplementation(async () => {
                callOrder.push('findById-status');
                return mockStatus;
            });
            mockSaleRepository.update.mockImplementation(async () => {
                callOrder.push('update');
                return mockSale;
            });
            mockSaleRepository.addHistory.mockImplementation(async () => {
                callOrder.push('addHistory');
                return {};
            });
            await useCase.execute(dto, mockUser);
            expect(callOrder).toEqual(['findById-sale', 'findById-status', 'update', 'addHistory']);
        });
    });
});
