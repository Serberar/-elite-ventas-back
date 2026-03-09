"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ReorderSaleStatusesUseCase_1 = require("../../../application/use-cases/saleStatus/ReorderSaleStatusesUseCase");
const SaleStatus_1 = require("../../../domain/entities/SaleStatus");
const AppError_1 = require("../../../application/shared/AppError");
describe('ReorderSaleStatusesUseCase', () => {
    let useCase;
    let mockRepository;
    const mockUser = {
        id: 'user-123',
        role: 'administrador',
        firstName: 'Test',
    };
    const mockStatuses = [
        new SaleStatus_1.SaleStatus('status-1', 'Pending', 1, '#FFFF00', false, false),
        new SaleStatus_1.SaleStatus('status-2', 'In Progress', 2, '#0000FF', false, false),
        new SaleStatus_1.SaleStatus('status-3', 'Completed', 3, '#00FF00', true, false),
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
        useCase = new ReorderSaleStatusesUseCase_1.ReorderSaleStatusesUseCase(mockRepository);
    });
    describe('execute', () => {
        it('should reorder sale statuses successfully', async () => {
            const dto = {
                statuses: [
                    { id: 'status-1', order: 1 },
                    { id: 'status-2', order: 2 },
                    { id: 'status-3', order: 3 },
                ],
            };
            mockRepository.reorder.mockResolvedValue();
            await useCase.execute(dto, mockUser);
            expect(mockRepository.reorder).toHaveBeenCalledWith(dto.statuses);
        });
        it('should handle reordering with changed positions', async () => {
            const dto = {
                statuses: [
                    { id: 'status-3', order: 1 },
                    { id: 'status-1', order: 2 },
                    { id: 'status-2', order: 3 },
                ],
            };
            mockRepository.reorder.mockResolvedValue();
            await useCase.execute(dto, mockUser);
            expect(mockRepository.reorder).toHaveBeenCalledWith(dto.statuses);
        });
        it('should handle reordering single status', async () => {
            const dto = {
                statuses: [{ id: 'status-1', order: 1 }],
            };
            mockRepository.reorder.mockResolvedValue();
            await useCase.execute(dto, mockUser);
            expect(mockRepository.reorder).toHaveBeenCalledWith(dto.statuses);
        });
        it('should handle reordering many statuses', async () => {
            const dto = {
                statuses: [
                    { id: 'status-1', order: 1 },
                    { id: 'status-2', order: 2 },
                    { id: 'status-3', order: 3 },
                    { id: 'status-4', order: 4 },
                    { id: 'status-5', order: 5 },
                ],
            };
            mockRepository.reorder.mockResolvedValue();
            await useCase.execute(dto, mockUser);
            expect(mockRepository.reorder).toHaveBeenCalledWith(dto.statuses);
        });
        it('should throw AuthorizationError for coordinador role', async () => {
            const coordinadorUser = {
                id: 'user-456',
                role: 'coordinador',
                firstName: 'Coordinador',
            };
            const dto = {
                statuses: [
                    { id: 'status-1', order: 1 },
                    { id: 'status-2', order: 2 },
                ],
            };
            await expect(useCase.execute(dto, coordinadorUser)).rejects.toThrow(AppError_1.AuthorizationError);
            expect(mockRepository.reorder).not.toHaveBeenCalled();
        });
        it('should throw AuthorizationError for verificador role', async () => {
            const verificadorUser = {
                id: 'user-789',
                role: 'verificador',
                firstName: 'Verificador',
            };
            const dto = {
                statuses: [
                    { id: 'status-1', order: 1 },
                    { id: 'status-2', order: 2 },
                ],
            };
            await expect(useCase.execute(dto, verificadorUser)).rejects.toThrow(AppError_1.AuthorizationError);
            expect(mockRepository.reorder).not.toHaveBeenCalled();
        });
        it('should throw AuthorizationError for comercial role', async () => {
            const comercialUser = {
                id: 'user-999',
                role: 'comercial',
                firstName: 'Comercial',
            };
            const dto = {
                statuses: [
                    { id: 'status-1', order: 1 },
                    { id: 'status-2', order: 2 },
                ],
            };
            await expect(useCase.execute(dto, comercialUser)).rejects.toThrow(AppError_1.AuthorizationError);
            expect(mockRepository.reorder).not.toHaveBeenCalled();
        });
        it('should handle repository errors', async () => {
            const dto = {
                statuses: [
                    { id: 'status-1', order: 1 },
                    { id: 'status-2', order: 2 },
                ],
            };
            const dbError = new Error('Database error');
            mockRepository.reorder.mockRejectedValue(dbError);
            await expect(useCase.execute(dto, mockUser)).rejects.toThrow(dbError);
        });
        it('should handle empty statuses array', async () => {
            const dto = {
                statuses: [],
            };
            mockRepository.reorder.mockResolvedValue();
            await useCase.execute(dto, mockUser);
            expect(mockRepository.reorder).toHaveBeenCalledWith([]);
        });
        it('should preserve status order values', async () => {
            const dto = {
                statuses: [
                    { id: 'status-1', order: 5 },
                    { id: 'status-2', order: 10 },
                    { id: 'status-3', order: 15 },
                ],
            };
            mockRepository.reorder.mockResolvedValue();
            await useCase.execute(dto, mockUser);
            expect(mockRepository.reorder).toHaveBeenCalledWith(dto.statuses);
            expect(dto.statuses[0].order).toBe(5);
            expect(dto.statuses[1].order).toBe(10);
            expect(dto.statuses[2].order).toBe(15);
        });
    });
});
