"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ToggleProductActiveUseCase_1 = require("../../../application/use-cases/product/ToggleProductActiveUseCase");
const Product_1 = require("../../../domain/entities/Product");
const AppError_1 = require("../../../application/shared/AppError");
jest.mock('@infrastructure/observability/logger/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));
jest.mock('@infrastructure/observability/metrics/prometheusMetrics', () => ({
    businessProductsToggled: {
        inc: jest.fn(),
    },
}));
describe('ToggleProductActiveUseCase', () => {
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
        useCase = new ToggleProductActiveUseCase_1.ToggleProductActiveUseCase(mockRepository);
    });
    describe('execute', () => {
        it('should toggle product from active to inactive', async () => {
            const toggledProduct = new Product_1.Product('product-123', 'Test Product', 'Test Description', 'SKU-123', 99.99, false, new Date('2024-01-01'), new Date());
            mockRepository.findById.mockResolvedValue(mockProduct);
            mockRepository.toggleActive.mockResolvedValue(toggledProduct);
            const result = await useCase.execute({ id: 'product-123' }, mockUser);
            expect(result).toEqual(toggledProduct);
            expect(result.active).toBe(false);
            expect(mockRepository.findById).toHaveBeenCalledWith('product-123');
            expect(mockRepository.toggleActive).toHaveBeenCalledWith('product-123');
        });
        it('should toggle product from inactive to active', async () => {
            const inactiveProduct = new Product_1.Product('product-123', 'Test Product', 'Test Description', 'SKU-123', 99.99, false, new Date('2024-01-01'), new Date('2024-01-01'));
            const toggledProduct = new Product_1.Product('product-123', 'Test Product', 'Test Description', 'SKU-123', 99.99, true, new Date('2024-01-01'), new Date());
            mockRepository.findById.mockResolvedValue(inactiveProduct);
            mockRepository.toggleActive.mockResolvedValue(toggledProduct);
            const result = await useCase.execute({ id: 'product-123' }, mockUser);
            expect(result.active).toBe(true);
        });
        it('should throw error when product does not exist', async () => {
            mockRepository.findById.mockResolvedValue(null);
            await expect(useCase.execute({ id: 'non-existent-id' }, mockUser)).rejects.toThrow('Producto no encontrado');
            expect(mockRepository.toggleActive).not.toHaveBeenCalled();
        });
        it('should throw AuthorizationError when user lacks permission', async () => {
            const userWithoutPermission = {
                id: 'user-456',
                role: 'comercial',
                firstName: 'User',
            };
            await expect(useCase.execute({ id: 'product-123' }, userWithoutPermission)).rejects.toThrow(AppError_1.AuthorizationError);
            expect(mockRepository.findById).not.toHaveBeenCalled();
        });
        it('should throw AuthorizationError for coordinador role', async () => {
            const managerUser = {
                id: 'user-789',
                role: 'coordinador',
                firstName: 'Manager',
            };
            await expect(useCase.execute({ id: 'product-123' }, managerUser)).rejects.toThrow(AppError_1.AuthorizationError);
            expect(mockRepository.findById).not.toHaveBeenCalled();
        });
        it('should handle repository errors on findById', async () => {
            const dbError = new Error('Database error');
            mockRepository.findById.mockRejectedValue(dbError);
            await expect(useCase.execute({ id: 'product-123' }, mockUser)).rejects.toThrow(dbError);
        });
        it('should handle repository errors on toggleActive', async () => {
            const dbError = new Error('Database error');
            mockRepository.findById.mockResolvedValue(mockProduct);
            mockRepository.toggleActive.mockRejectedValue(dbError);
            await expect(useCase.execute({ id: 'product-123' }, mockUser)).rejects.toThrow(dbError);
        });
        it('should preserve all other product properties', async () => {
            const toggledProduct = new Product_1.Product('product-123', 'Test Product', 'Test Description', 'SKU-123', 99.99, false, new Date('2024-01-01'), new Date());
            mockRepository.findById.mockResolvedValue(mockProduct);
            mockRepository.toggleActive.mockResolvedValue(toggledProduct);
            const result = await useCase.execute({ id: 'product-123' }, mockUser);
            expect(result.id).toBe(mockProduct.id);
            expect(result.name).toBe(mockProduct.name);
            expect(result.description).toBe(mockProduct.description);
            expect(result.sku).toBe(mockProduct.sku);
            expect(result.price).toBe(mockProduct.price);
            expect(result.createdAt).toEqual(mockProduct.createdAt);
        });
        it('should handle UUID formatted IDs', async () => {
            const uuidId = '550e8400-e29b-41d4-a716-446655440000';
            const productWithUuid = new Product_1.Product(uuidId, 'Test Product', 'Test Description', 'SKU-123', 99.99, true, new Date('2024-01-01'), new Date('2024-01-01'));
            const toggledProduct = new Product_1.Product(uuidId, 'Test Product', 'Test Description', 'SKU-123', 99.99, false, new Date('2024-01-01'), new Date('2024-01-01'));
            mockRepository.findById.mockResolvedValue(productWithUuid);
            mockRepository.toggleActive.mockResolvedValue(toggledProduct);
            const result = await useCase.execute({ id: uuidId }, mockUser);
            expect(result.id).toBe(uuidId);
            expect(mockRepository.findById).toHaveBeenCalledWith(uuidId);
            expect(mockRepository.toggleActive).toHaveBeenCalledWith(uuidId);
        });
        it('should call repository methods in correct order', async () => {
            const callOrder = [];
            mockRepository.findById.mockImplementation(async () => {
                callOrder.push('findById');
                return mockProduct;
            });
            mockRepository.toggleActive.mockImplementation(async () => {
                callOrder.push('toggleActive');
                return new Product_1.Product('product-123', 'Test Product', 'Test Description', 'SKU-123', 99.99, false, new Date('2024-01-01'), new Date('2024-01-01'));
            });
            await useCase.execute({ id: 'product-123' }, mockUser);
            expect(callOrder).toEqual(['findById', 'toggleActive']);
        });
    });
});
