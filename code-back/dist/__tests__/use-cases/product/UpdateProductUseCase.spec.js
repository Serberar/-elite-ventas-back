"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UpdateProductUseCase_1 = require("../../../application/use-cases/product/UpdateProductUseCase");
const Product_1 = require("../../../domain/entities/Product");
const AppError_1 = require("../../../application/shared/AppError");
jest.mock('@infrastructure/observability/logger/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));
jest.mock('@infrastructure/observability/metrics/prometheusMetrics', () => ({
    businessProductsUpdated: {
        inc: jest.fn(),
    },
}));
describe('UpdateProductUseCase', () => {
    let useCase;
    let mockRepository;
    const mockUser = {
        id: 'user-123',
        role: 'administrador',
        firstName: 'Admin',
    };
    const existingProduct = new Product_1.Product('product-123', 'Original Product', 'Original Description', 'SKU-123', 99.99, true, new Date('2024-01-01'), new Date('2024-01-01'));
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
        useCase = new UpdateProductUseCase_1.UpdateProductUseCase(mockRepository);
    });
    describe('execute', () => {
        it('should update all product fields successfully', async () => {
            const updateData = {
                id: 'product-123',
                name: 'Updated Product',
                description: 'Updated Description',
                sku: 'SKU-456',
                price: 149.99,
            };
            const updatedProduct = new Product_1.Product('product-123', 'Updated Product', 'Updated Description', 'SKU-456', 149.99, true, new Date('2024-01-01'), new Date());
            mockRepository.findById.mockResolvedValue(existingProduct);
            mockRepository.update.mockResolvedValue(updatedProduct);
            const result = await useCase.execute(updateData, mockUser);
            expect(result).toEqual(updatedProduct);
            expect(mockRepository.findById).toHaveBeenCalledWith('product-123');
            expect(mockRepository.update).toHaveBeenCalledWith('product-123', expect.objectContaining({
                name: 'Updated Product',
                description: 'Updated Description',
                sku: 'SKU-456',
                price: 149.99,
            }));
        });
        it('should update only name field', async () => {
            const updateData = {
                id: 'product-123',
                name: 'New Name Only',
            };
            const updatedProduct = new Product_1.Product('product-123', 'New Name Only', 'Original Description', 'SKU-123', 99.99, true, new Date('2024-01-01'), new Date());
            mockRepository.findById.mockResolvedValue(existingProduct);
            mockRepository.update.mockResolvedValue(updatedProduct);
            const result = await useCase.execute(updateData, mockUser);
            expect(result.name).toBe('New Name Only');
            expect(result.description).toBe(existingProduct.description);
            expect(result.sku).toBe(existingProduct.sku);
            expect(result.price).toBe(existingProduct.price);
        });
        it('should update only price field', async () => {
            const updateData = {
                id: 'product-123',
                price: 199.99,
            };
            const updatedProduct = new Product_1.Product('product-123', 'Original Product', 'Original Description', 'SKU-123', 199.99, true, new Date('2024-01-01'), new Date());
            mockRepository.findById.mockResolvedValue(existingProduct);
            mockRepository.update.mockResolvedValue(updatedProduct);
            const result = await useCase.execute(updateData, mockUser);
            expect(result.price).toBe(199.99);
            expect(result.name).toBe(existingProduct.name);
        });
        it('should throw error when product does not exist', async () => {
            const updateData = {
                id: 'non-existent-id',
                name: 'Updated Name',
            };
            mockRepository.findById.mockResolvedValue(null);
            await expect(useCase.execute(updateData, mockUser)).rejects.toThrow('Producto no encontrado');
            expect(mockRepository.update).not.toHaveBeenCalled();
        });
        it('should throw AuthorizationError when user lacks permission', async () => {
            const userWithoutPermission = {
                id: 'user-456',
                role: 'verificador',
                firstName: 'Verificador',
            };
            const updateData = {
                id: 'product-123',
                name: 'Updated Name',
            };
            await expect(useCase.execute(updateData, userWithoutPermission)).rejects.toThrow(AppError_1.AuthorizationError);
            expect(mockRepository.findById).not.toHaveBeenCalled();
        });
        it('should preserve active status', async () => {
            const updateData = {
                id: 'product-123',
                name: 'Updated Name',
            };
            const updatedProduct = new Product_1.Product('product-123', 'Updated Name', 'Original Description', 'SKU-123', 99.99, true, new Date('2024-01-01'), new Date());
            mockRepository.findById.mockResolvedValue(existingProduct);
            mockRepository.update.mockResolvedValue(updatedProduct);
            await useCase.execute(updateData, mockUser);
            expect(mockRepository.update).toHaveBeenCalledWith('product-123', expect.objectContaining({
                active: existingProduct.active,
            }));
        });
        it('should preserve createdAt timestamp', async () => {
            const updateData = {
                id: 'product-123',
                name: 'Updated Name',
            };
            const updatedProduct = new Product_1.Product('product-123', 'Updated Name', 'Original Description', 'SKU-123', 99.99, true, new Date('2024-01-01'), new Date());
            mockRepository.findById.mockResolvedValue(existingProduct);
            mockRepository.update.mockResolvedValue(updatedProduct);
            await useCase.execute(updateData, mockUser);
            expect(mockRepository.update).toHaveBeenCalledWith('product-123', expect.objectContaining({
                createdAt: existingProduct.createdAt,
            }));
        });
        it('should handle repository errors', async () => {
            const updateData = {
                id: 'product-123',
                name: 'Updated Name',
            };
            const dbError = new Error('Database error');
            mockRepository.findById.mockResolvedValue(existingProduct);
            mockRepository.update.mockRejectedValue(dbError);
            await expect(useCase.execute(updateData, mockUser)).rejects.toThrow(dbError);
        });
        it('should only work with administrador role', async () => {
            const updateData = {
                id: 'product-123',
                name: 'Updated Name',
            };
            const updatedProduct = new Product_1.Product('product-123', 'Updated Name', 'Original Description', 'SKU-123', 99.99, true, new Date('2024-01-01'), new Date());
            mockRepository.findById.mockResolvedValue(existingProduct);
            mockRepository.update.mockResolvedValue(updatedProduct);
            const result = await useCase.execute(updateData, mockUser);
            expect(result.name).toBe('Updated Name');
            // Verify coordinador cannot update
            const coordinadorUser = {
                id: 'user-789',
                role: 'coordinador',
                firstName: 'Coordinador',
            };
            await expect(useCase.execute(updateData, coordinadorUser)).rejects.toThrow(AppError_1.AuthorizationError);
        });
        it('should handle partial updates with null values', async () => {
            const updateData = {
                id: 'product-123',
                description: 'New Description',
            };
            const updatedProduct = new Product_1.Product('product-123', 'Original Product', 'New Description', 'SKU-123', 99.99, true, new Date('2024-01-01'), new Date());
            mockRepository.findById.mockResolvedValue(existingProduct);
            mockRepository.update.mockResolvedValue(updatedProduct);
            await useCase.execute(updateData, mockUser);
            expect(mockRepository.update).toHaveBeenCalledWith('product-123', expect.objectContaining({
                description: 'New Description',
            }));
        });
        it('should update with zero price', async () => {
            const updateData = {
                id: 'product-123',
                price: 0,
            };
            const updatedProduct = new Product_1.Product('product-123', 'Original Product', 'Original Description', 'SKU-123', 0, true, new Date('2024-01-01'), new Date());
            mockRepository.findById.mockResolvedValue(existingProduct);
            mockRepository.update.mockResolvedValue(updatedProduct);
            const result = await useCase.execute(updateData, mockUser);
            expect(result.price).toBe(0);
        });
    });
});
