"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UpdateSaleStatusUseCase_1 = require("../../../application/use-cases/saleStatus/UpdateSaleStatusUseCase");
const SaleStatus_1 = require("../../../domain/entities/SaleStatus");
const AppError_1 = require("../../../application/shared/AppError");
describe('UpdateSaleStatusUseCase', () => {
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
            findById: jest.fn(),
            findInitialStatus: jest.fn(),
            list: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            reorder: jest.fn(),
            delete: jest.fn(),
        };
        useCase = new UpdateSaleStatusUseCase_1.UpdateSaleStatusUseCase(mockRepository);
    });
    describe('execute', () => {
        it('should update sale status successfully', async () => {
            const dto = { id: 'status-1', name: 'Updated Status', color: '#FF0000', isFinal: true };
            const mockStatus = new SaleStatus_1.SaleStatus('status-1', 'Updated Status', 1, '#FF0000', true, false);
            mockRepository.update.mockResolvedValue(mockStatus);
            const result = await useCase.execute(dto, mockUser);
            expect(result).toEqual(mockStatus);
            expect(mockRepository.update).toHaveBeenCalledWith('status-1', {
                name: 'Updated Status',
                color: '#FF0000',
                isFinal: true,
            });
        });
        it('should update status with null color', async () => {
            const dto = { id: 'status-1', name: 'Updated Status', isFinal: false };
            const mockStatus = new SaleStatus_1.SaleStatus('status-1', 'Updated Status', 1, null, false, false);
            mockRepository.update.mockResolvedValue(mockStatus);
            await useCase.execute(dto, mockUser);
            expect(mockRepository.update).toHaveBeenCalledWith('status-1', {
                name: 'Updated Status',
                color: null,
                isFinal: false,
            });
        });
        it('should update only name and keep other fields', async () => {
            const dto = { id: 'status-1', name: 'New Name', color: '#0000FF', isFinal: false };
            const mockStatus = new SaleStatus_1.SaleStatus('status-1', 'New Name', 1, '#0000FF', false, false);
            mockRepository.update.mockResolvedValue(mockStatus);
            await useCase.execute(dto, mockUser);
            expect(mockRepository.update).toHaveBeenCalledWith('status-1', {
                name: 'New Name',
                color: '#0000FF',
                isFinal: false,
            });
        });
        it('should throw AuthorizationError for non-admin roles', async () => {
            const coordinadorUser = {
                id: 'user-456',
                role: 'coordinador',
                firstName: 'Coordinador',
            };
            const dto = { id: 'status-1', name: 'Updated Status', isFinal: false };
            await expect(useCase.execute(dto, coordinadorUser)).rejects.toThrow(AppError_1.AuthorizationError);
            expect(mockRepository.update).not.toHaveBeenCalled();
        });
        it('should throw AuthorizationError for verificador role', async () => {
            const verificadorUser = {
                id: 'user-789',
                role: 'verificador',
                firstName: 'Verificador',
            };
            const dto = { id: 'status-1', name: 'Updated Status', isFinal: false };
            await expect(useCase.execute(dto, verificadorUser)).rejects.toThrow(AppError_1.AuthorizationError);
            expect(mockRepository.update).not.toHaveBeenCalled();
        });
        it('should throw AuthorizationError for comercial role', async () => {
            const comercialUser = {
                id: 'user-999',
                role: 'comercial',
                firstName: 'Comercial',
            };
            const dto = { id: 'status-1', name: 'Updated Status', isFinal: false };
            await expect(useCase.execute(dto, comercialUser)).rejects.toThrow(AppError_1.AuthorizationError);
            expect(mockRepository.update).not.toHaveBeenCalled();
        });
        it('should handle repository errors', async () => {
            const dto = { id: 'status-1', name: 'Updated Status', isFinal: false };
            const dbError = new Error('Database error');
            mockRepository.update.mockRejectedValue(dbError);
            await expect(useCase.execute(dto, mockUser)).rejects.toThrow(dbError);
        });
        it('should handle updating to final status', async () => {
            const dto = { id: 'status-1', name: 'Final Status', color: '#FF0000', isFinal: true };
            const mockStatus = new SaleStatus_1.SaleStatus('status-1', 'Final Status', 1, '#FF0000', true, false);
            mockRepository.update.mockResolvedValue(mockStatus);
            const result = await useCase.execute(dto, mockUser);
            expect(result.isFinal).toBe(true);
            expect(mockRepository.update).toHaveBeenCalledWith('status-1', {
                name: 'Final Status',
                color: '#FF0000',
                isFinal: true,
            });
        });
        it('should handle updating from final to non-final status', async () => {
            const dto = { id: 'status-1', name: 'Active Status', color: '#00FF00', isFinal: false };
            const mockStatus = new SaleStatus_1.SaleStatus('status-1', 'Active Status', 1, '#00FF00', false, false);
            mockRepository.update.mockResolvedValue(mockStatus);
            const result = await useCase.execute(dto, mockUser);
            expect(result.isFinal).toBe(false);
        });
    });
});
