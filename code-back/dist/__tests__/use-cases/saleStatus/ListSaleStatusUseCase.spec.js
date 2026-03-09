"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ListSaleStatusUseCase_1 = require("../../../application/use-cases/saleStatus/ListSaleStatusUseCase");
const SaleStatus_1 = require("../../../domain/entities/SaleStatus");
const AppError_1 = require("../../../application/shared/AppError");
describe('ListSaleStatusUseCase', () => {
    let useCase;
    let mockRepository;
    const mockUser = {
        id: 'user-123',
        role: 'administrador',
        firstName: 'Test',
    };
    const mockStatuses = [
        new SaleStatus_1.SaleStatus('status-1', 'Pending', 1, '#FFFF00', false, false),
        new SaleStatus_1.SaleStatus('status-2', 'Completed', 2, '#00FF00', false, false),
        new SaleStatus_1.SaleStatus('status-3', 'Cancelled', 3, '#FF0000', true, true),
    ];
    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = {
            findById: jest.fn(),
            findInitialStatus: jest.fn(),
            list: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            reorder: jest.fn(),
            delete: jest.fn(),
        };
        useCase = new ListSaleStatusUseCase_1.ListSaleStatusUseCase(mockRepository);
    });
    describe('execute', () => {
        it('should list all sale statuses', async () => {
            mockRepository.list.mockResolvedValue(mockStatuses);
            const result = await useCase.execute(mockUser);
            expect(result).toEqual(mockStatuses);
            expect(result.length).toBe(3);
            expect(mockRepository.list).toHaveBeenCalled();
        });
        it('should return empty array when no statuses exist', async () => {
            mockRepository.list.mockResolvedValue([]);
            const result = await useCase.execute(mockUser);
            expect(result).toEqual([]);
            expect(result.length).toBe(0);
        });
        it('should work with coordinador role', async () => {
            const coordinadorUser = {
                id: 'user-456',
                role: 'coordinador',
                firstName: 'Coordinador',
            };
            mockRepository.list.mockResolvedValue(mockStatuses);
            const result = await useCase.execute(coordinadorUser);
            expect(result).toEqual(mockStatuses);
        });
        it('should work with verificador role', async () => {
            const verificadorUser = {
                id: 'user-789',
                role: 'verificador',
                firstName: 'Verificador',
            };
            mockRepository.list.mockResolvedValue(mockStatuses);
            const result = await useCase.execute(verificadorUser);
            expect(result).toEqual(mockStatuses);
        });
        it('should throw AuthorizationError for comercial role', async () => {
            const comercialUser = {
                id: 'user-999',
                role: 'comercial',
                firstName: 'Comercial',
            };
            await expect(useCase.execute(comercialUser)).rejects.toThrow(AppError_1.AuthorizationError);
            expect(mockRepository.list).not.toHaveBeenCalled();
        });
        it('should handle repository errors', async () => {
            const dbError = new Error('Database error');
            mockRepository.list.mockRejectedValue(dbError);
            await expect(useCase.execute(mockUser)).rejects.toThrow(dbError);
        });
    });
});
