"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const DuplicateProductUseCase_1 = require("@application/use-cases/product/DuplicateProductUseCase");
const Product_1 = require("../../../domain/entities/Product");
const AppError_1 = require("../../../application/shared/AppError");
const crypto_1 = __importDefault(require("crypto"));
jest.mock('crypto');
jest.mock('@infrastructure/observability/logger/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));
jest.mock('@infrastructure/observability/metrics/prometheusMetrics', () => ({
    businessProductsDuplicated: {
        inc: jest.fn(),
    },
}));
describe('DuplicateProductUseCase', () => {
    let useCase;
    let mockRepository;
    const mockUser = {
        id: 'user-123',
        role: 'administrador',
        firstName: 'Test',
    };
    const originalProduct = new Product_1.Product('product-123', 'Original Product', 'Original Description', 'SKU-123', 99.99, true, new Date('2024-01-01'), new Date('2024-01-01'));
    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            toggleActive: jest.fn(),
            findBySKU: jest.fn(),
        };
        useCase = new DuplicateProductUseCase_1.DuplicateProductUseCase(mockRepository);
        crypto_1.default.randomUUID.mockReturnValue('new-product-id');
    });
    describe('execute', () => {
        it('should duplicate product with modified name and sku', async () => {
            const duplicatedProduct = new Product_1.Product('new-product-id', 'Original Product (copia)', 'Original Description', 'SKU-123-copy', 99.99, true, new Date(), new Date());
            mockRepository.findById.mockResolvedValue(originalProduct);
            mockRepository.create.mockResolvedValue(duplicatedProduct);
            const result = await useCase.execute({ id: 'product-123' }, mockUser);
            expect(result).toEqual(duplicatedProduct);
            expect(result.name).toBe('Original Product (copia)');
            expect(result.sku).toBe('SKU-123-copy');
            expect(mockRepository.findById).toHaveBeenCalledWith('product-123');
            expect(mockRepository.create).toHaveBeenCalled();
        });
        it('should duplicate product without sku', async () => {
            const productWithoutSku = new Product_1.Product('product-123', 'Original Product', 'Original Description', null, 99.99, true, new Date('2024-01-01'), new Date('2024-01-01'));
            const duplicatedProduct = new Product_1.Product('new-product-id', 'Original Product (copia)', 'Original Description', null, 99.99, true, new Date(), new Date());
            mockRepository.findById.mockResolvedValue(productWithoutSku);
            mockRepository.create.mockResolvedValue(duplicatedProduct);
            const result = await useCase.execute({ id: 'product-123' }, mockUser);
            expect(result.sku).toBeNull();
        });
        it('should throw error when original product does not exist', async () => {
            mockRepository.findById.mockResolvedValue(null);
            await expect(useCase.execute({ id: 'non-existent-id' }, mockUser)).rejects.toThrow('Producto no encontrado');
            expect(mockRepository.create).not.toHaveBeenCalled();
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
        it('should generate new UUID for duplicated product', async () => {
            crypto_1.default.randomUUID.mockReturnValue('unique-new-id');
            const duplicatedProduct = new Product_1.Product('unique-new-id', 'Original Product (copia)', 'Original Description', 'SKU-123-copy', 99.99, true, new Date(), new Date());
            mockRepository.findById.mockResolvedValue(originalProduct);
            mockRepository.create.mockResolvedValue(duplicatedProduct);
            await useCase.execute({ id: 'product-123' }, mockUser);
            expect(crypto_1.default.randomUUID).toHaveBeenCalled();
            expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                id: 'unique-new-id',
            }));
        });
        it('should set duplicated product as active', async () => {
            const inactiveOriginal = new Product_1.Product('product-123', 'Original Product', 'Original Description', 'SKU-123', 99.99, false, new Date('2024-01-01'), new Date('2024-01-01'));
            const duplicatedProduct = new Product_1.Product('new-product-id', 'Original Product (copia)', 'Original Description', 'SKU-123-copy', 99.99, true, new Date(), new Date());
            mockRepository.findById.mockResolvedValue(inactiveOriginal);
            mockRepository.create.mockResolvedValue(duplicatedProduct);
            const result = await useCase.execute({ id: 'product-123' }, mockUser);
            expect(result.active).toBe(true);
        });
        it('should preserve description from original', async () => {
            const duplicatedProduct = new Product_1.Product('new-product-id', 'Original Product (copia)', 'Original Description', 'SKU-123-copy', 99.99, true, new Date(), new Date());
            mockRepository.findById.mockResolvedValue(originalProduct);
            mockRepository.create.mockResolvedValue(duplicatedProduct);
            const result = await useCase.execute({ id: 'product-123' }, mockUser);
            expect(result.description).toBe(originalProduct.description);
        });
        it('should preserve price from original', async () => {
            const duplicatedProduct = new Product_1.Product('new-product-id', 'Original Product (copia)', 'Original Description', 'SKU-123-copy', 99.99, true, new Date(), new Date());
            mockRepository.findById.mockResolvedValue(originalProduct);
            mockRepository.create.mockResolvedValue(duplicatedProduct);
            const result = await useCase.execute({ id: 'product-123' }, mockUser);
            expect(result.price).toBe(originalProduct.price);
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
        it('should handle repository errors on create', async () => {
            const dbError = new Error('Database error');
            mockRepository.findById.mockResolvedValue(originalProduct);
            mockRepository.create.mockRejectedValue(dbError);
            await expect(useCase.execute({ id: 'product-123' }, mockUser)).rejects.toThrow(dbError);
        });
        it('should duplicate product with null description', async () => {
            const productWithNullDesc = new Product_1.Product('product-123', 'Original Product', null, 'SKU-123', 99.99, true, new Date('2024-01-01'), new Date('2024-01-01'));
            const duplicatedProduct = new Product_1.Product('new-product-id', 'Original Product (copia)', null, 'SKU-123-copy', 99.99, true, new Date(), new Date());
            mockRepository.findById.mockResolvedValue(productWithNullDesc);
            mockRepository.create.mockResolvedValue(duplicatedProduct);
            const result = await useCase.execute({ id: 'product-123' }, mockUser);
            expect(result.description).toBeNull();
        });
        it('should append -copy to existing sku', async () => {
            const duplicatedProduct = new Product_1.Product('new-product-id', 'Original Product (copia)', 'Original Description', 'SKU-123-copy', 99.99, true, new Date(), new Date());
            mockRepository.findById.mockResolvedValue(originalProduct);
            mockRepository.create.mockResolvedValue(duplicatedProduct);
            await useCase.execute({ id: 'product-123' }, mockUser);
            expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                sku: 'SKU-123-copy',
            }));
        });
        it('should append (copia) to product name', async () => {
            const duplicatedProduct = new Product_1.Product('new-product-id', 'Original Product (copia)', 'Original Description', 'SKU-123-copy', 99.99, true, new Date(), new Date());
            mockRepository.findById.mockResolvedValue(originalProduct);
            mockRepository.create.mockResolvedValue(duplicatedProduct);
            await useCase.execute({ id: 'product-123' }, mockUser);
            expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Original Product (copia)',
            }));
        });
    });
});
