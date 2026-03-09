"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GetProductUseCase_1 = require("../../../application/use-cases/product/GetProductUseCase");
const Product_1 = require("../../../domain/entities/Product");
const AppError_1 = require("../../../application/shared/AppError");
jest.mock('@infrastructure/observability/logger/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));
describe('GetProductUseCase', () => {
    let useCase;
    let mockRepository;
    const mockUser = {
        id: 'user-123',
        role: 'administrador',
        firstName: 'Test',
    };
    const mockProduct = new Product_1.Product('product-123', 'Test Product', 'Test Description', 'SKU-123', 99.99, true, new Date('2024-01-01'), new Date('2024-01-01'));
    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            findAllPaginated: jest.fn(),
            update: jest.fn(),
            toggleActive: jest.fn(),
            findBySKU: jest.fn(),
        };
        useCase = new GetProductUseCase_1.GetProductUseCase(mockRepository);
    });
    describe('execute', () => {
        it('should return product when found', async () => {
            mockRepository.findById.mockResolvedValue(mockProduct);
            const result = await useCase.execute('product-123', mockUser);
            expect(result).toEqual(mockProduct);
            expect(mockRepository.findById).toHaveBeenCalledWith('product-123');
        });
        it('should throw error when product does not exist', async () => {
            mockRepository.findById.mockResolvedValue(null);
            await expect(useCase.execute('non-existent-id', mockUser)).rejects.toThrow('Producto no encontrado');
            expect(mockRepository.findById).toHaveBeenCalledWith('non-existent-id');
        });
        it('should work with verificador role', async () => {
            const userWithPermission = {
                id: 'user-456',
                role: 'verificador',
                firstName: 'Viewer',
            };
            mockRepository.findById.mockResolvedValue(mockProduct);
            const result = await useCase.execute('product-123', userWithPermission);
            expect(result).toEqual(mockProduct);
            expect(mockRepository.findById).toHaveBeenCalledWith('product-123');
        });
        it('should work with MANAGER role', async () => {
            const managerUser = {
                id: 'user-789',
                role: 'coordinador',
                firstName: 'Manager',
            };
            mockRepository.findById.mockResolvedValue(mockProduct);
            const result = await useCase.execute('product-123', managerUser);
            expect(result).toEqual(mockProduct);
        });
        it('should throw AuthorizationError for comercial role', async () => {
            const regularUser = {
                id: 'user-999',
                role: 'comercial',
                firstName: 'User',
            };
            await expect(useCase.execute('product-123', regularUser)).rejects.toThrow(AppError_1.AuthorizationError);
            expect(mockRepository.findById).not.toHaveBeenCalled();
        });
        it('should handle repository errors', async () => {
            const dbError = new Error('Database error');
            mockRepository.findById.mockRejectedValue(dbError);
            await expect(useCase.execute('product-123', mockUser)).rejects.toThrow(dbError);
        });
        it('should return inactive products', async () => {
            const inactiveProduct = new Product_1.Product('product-123', 'Test Product', 'Test Description', 'SKU-123', 99.99, false, new Date('2024-01-01'), new Date('2024-01-01'));
            mockRepository.findById.mockResolvedValue(inactiveProduct);
            const result = await useCase.execute('product-123', mockUser);
            expect(result).toEqual(inactiveProduct);
            expect(result.active).toBe(false);
        });
        it('should return products with null fields', async () => {
            const productWithNulls = new Product_1.Product('product-123', 'Test Product', null, null, 99.99, true, new Date('2024-01-01'), new Date('2024-01-01'));
            mockRepository.findById.mockResolvedValue(productWithNulls);
            const result = await useCase.execute('product-123', mockUser);
            expect(result).toEqual(productWithNulls);
            expect(result.description).toBeNull();
            expect(result.sku).toBeNull();
        });
        it('should handle UUID formatted IDs', async () => {
            const uuidId = '550e8400-e29b-41d4-a716-446655440000';
            const productWithUuid = new Product_1.Product(uuidId, 'Test Product', 'Test Description', 'SKU-123', 99.99, true, new Date('2024-01-01'), new Date('2024-01-01'));
            mockRepository.findById.mockResolvedValue(productWithUuid);
            const result = await useCase.execute(uuidId, mockUser);
            expect(result.id).toBe(uuidId);
            expect(mockRepository.findById).toHaveBeenCalledWith(uuidId);
        });
    });
});
