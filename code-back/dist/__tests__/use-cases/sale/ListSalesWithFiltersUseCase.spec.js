"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ListSalesWithFiltersUseCase_1 = require("../../../application/use-cases/sale/ListSalesWithFiltersUseCase");
const Sale_1 = require("../../../domain/entities/Sale");
const AppError_1 = require("../../../application/shared/AppError");
jest.mock('@infrastructure/observability/logger/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));
describe('ListSalesWithFiltersUseCase', () => {
    let useCase;
    let mockRepository;
    const mockUser = {
        id: 'user-123',
        role: 'administrador',
        firstName: 'Test',
    };
    const mockSales = [
        new Sale_1.Sale('sale-1', 'client-1', 'status-1', 100, null, null, new Date('2024-01-01'), new Date('2024-01-01'), null),
        new Sale_1.Sale('sale-2', 'client-2', 'status-1', 200, null, null, new Date('2024-01-02'), new Date('2024-01-02'), null),
    ];
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
        useCase = new ListSalesWithFiltersUseCase_1.ListSalesWithFiltersUseCase(mockRepository);
    });
    describe('execute', () => {
        it('should list sales without filters', async () => {
            mockRepository.list.mockResolvedValue(mockSales);
            const result = await useCase.execute({}, mockUser);
            expect(result).toEqual(mockSales);
            expect(result.length).toBe(2);
            expect(mockRepository.list).toHaveBeenCalledWith({});
        });
        it('should list sales filtered by clientId', async () => {
            const filteredSales = [mockSales[0]];
            mockRepository.list.mockResolvedValue(filteredSales);
            const result = await useCase.execute({ clientId: 'client-1' }, mockUser);
            expect(result).toEqual(filteredSales);
            expect(mockRepository.list).toHaveBeenCalledWith({ clientId: 'client-1' });
        });
        it('should list sales filtered by statusId', async () => {
            mockRepository.list.mockResolvedValue(mockSales);
            const result = await useCase.execute({ statusId: 'status-1' }, mockUser);
            expect(result).toEqual(mockSales);
            expect(mockRepository.list).toHaveBeenCalledWith({ statusId: 'status-1' });
        });
        it('should list sales filtered by date range', async () => {
            const from = new Date('2024-01-01');
            const to = new Date('2024-01-31');
            mockRepository.list.mockResolvedValue(mockSales);
            const result = await useCase.execute({ from, to }, mockUser);
            expect(result).toEqual(mockSales);
            expect(mockRepository.list).toHaveBeenCalledWith({ from, to });
        });
        it('should list sales with multiple filters', async () => {
            const filters = {
                clientId: 'client-1',
                statusId: 'status-1',
                from: new Date('2024-01-01'),
                to: new Date('2024-01-31'),
            };
            mockRepository.list.mockResolvedValue([mockSales[0]]);
            const result = await useCase.execute(filters, mockUser);
            expect(result.length).toBe(1);
            expect(mockRepository.list).toHaveBeenCalledWith(filters);
        });
        it('should return empty array when no sales match filters', async () => {
            mockRepository.list.mockResolvedValue([]);
            const result = await useCase.execute({ clientId: 'non-existent' }, mockUser);
            expect(result).toEqual([]);
            expect(result.length).toBe(0);
        });
        it('should work with coordinador role', async () => {
            const coordinadorUser = {
                id: 'user-456',
                role: 'coordinador',
                firstName: 'Coordinador',
            };
            mockRepository.list.mockResolvedValue(mockSales);
            const result = await useCase.execute({}, coordinadorUser);
            expect(result).toEqual(mockSales);
        });
        it('should work with verificador role', async () => {
            const verificadorUser = {
                id: 'user-789',
                role: 'verificador',
                firstName: 'Verificador',
            };
            mockRepository.list.mockResolvedValue(mockSales);
            const result = await useCase.execute({}, verificadorUser);
            expect(result).toEqual(mockSales);
        });
        it('should throw AuthorizationError for comercial role', async () => {
            const comercialUser = {
                id: 'user-999',
                role: 'comercial',
                firstName: 'Comercial',
            };
            await expect(useCase.execute({}, comercialUser)).rejects.toThrow(AppError_1.AuthorizationError);
            expect(mockRepository.list).not.toHaveBeenCalled();
        });
        it('should handle repository errors', async () => {
            const dbError = new Error('Database error');
            mockRepository.list.mockRejectedValue(dbError);
            await expect(useCase.execute({}, mockUser)).rejects.toThrow(dbError);
        });
    });
});
