"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CreateSaleStatusUseCase_1 = require("../../../application/use-cases/saleStatus/CreateSaleStatusUseCase");
const SaleStatus_1 = require("../../../domain/entities/SaleStatus");
const AppError_1 = require("../../../application/shared/AppError");
describe('CreateSaleStatusUseCase', () => {
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
        useCase = new CreateSaleStatusUseCase_1.CreateSaleStatusUseCase(mockRepository);
    });
    describe('execute', () => {
        it('should create sale status successfully', async () => {
            const dto = { name: 'New Status', order: 4, color: '#0000FF', isFinal: false, isCancelled: false };
            const mockStatus = new SaleStatus_1.SaleStatus('status-1', 'New Status', 4, '#0000FF', false, false);
            mockRepository.create.mockResolvedValue(mockStatus);
            const result = await useCase.execute(dto, mockUser);
            expect(result).toEqual(mockStatus);
            expect(mockRepository.create).toHaveBeenCalledWith({
                name: 'New Status',
                order: 4,
                color: '#0000FF',
                isFinal: false,
                isCancelled: false,
            });
        });
        it('should create status with null color', async () => {
            const dto = { name: 'New Status', order: 4, isFinal: false, isCancelled: false };
            const mockStatus = new SaleStatus_1.SaleStatus('status-1', 'New Status', 4, null, false, false);
            mockRepository.create.mockResolvedValue(mockStatus);
            await useCase.execute(dto, mockUser);
            expect(mockRepository.create).toHaveBeenCalledWith({
                name: 'New Status',
                order: 4,
                color: null,
                isFinal: false,
                isCancelled: false,
            });
        });
        it('should throw AuthorizationError for non-admin roles', async () => {
            const comercialUser = {
                id: 'user-456',
                role: 'comercial',
                firstName: 'Comercial',
            };
            const dto = { name: 'New Status', order: 4, isFinal: false, isCancelled: false };
            await expect(useCase.execute(dto, comercialUser)).rejects.toThrow(AppError_1.AuthorizationError);
            expect(mockRepository.create).not.toHaveBeenCalled();
        });
        it('should handle repository errors', async () => {
            const dto = { name: 'New Status', order: 4, isFinal: false, isCancelled: false };
            const dbError = new Error('Database error');
            mockRepository.create.mockRejectedValue(dbError);
            await expect(useCase.execute(dto, mockUser)).rejects.toThrow(dbError);
        });
    });
});
