"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ListProductsUseCase_1 = require("../../../application/use-cases/product/ListProductsUseCase");
const Product_1 = require("../../../domain/entities/Product");
const AppError_1 = require("../../../application/shared/AppError");
jest.mock('@infrastructure/observability/logger/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));
describe('ListProductsUseCase', () => {
    let useCase;
    let mockRepository;
    const mockUser = {
        id: 'user-123',
        role: 'administrador',
        firstName: 'Admin',
    };
    const mockProducts = [
        new Product_1.Product('product-1', 'Product 1', 'Description 1', 'SKU-1', 99.99, true, new Date('2024-01-01'), new Date('2024-01-01')),
        new Product_1.Product('product-2', 'Product 2', null, null, 49.99, false, new Date('2024-01-02'), new Date('2024-01-02')),
    ];
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
        useCase = new ListProductsUseCase_1.ListProductsUseCase(mockRepository);
    });
    describe('execute', () => {
        it('should return all products', async () => {
            mockRepository.findAll.mockResolvedValue(mockProducts);
            const result = await useCase.execute(mockUser);
            expect(result).toEqual(mockProducts);
            expect(result.length).toBe(2);
            expect(mockRepository.findAll).toHaveBeenCalled();
        });
        it('should return empty array when no products exist', async () => {
            mockRepository.findAll.mockResolvedValue([]);
            const result = await useCase.execute(mockUser);
            expect(result).toEqual([]);
            expect(result.length).toBe(0);
            expect(mockRepository.findAll).toHaveBeenCalled();
        });
        it('should throw AuthorizationError when user lacks permission', async () => {
            const userWithoutPermission = {
                id: 'user-456',
                role: 'comercial',
                firstName: 'Comercial',
            };
            await expect(useCase.execute(userWithoutPermission)).rejects.toThrow(AppError_1.AuthorizationError);
            expect(mockRepository.findAll).not.toHaveBeenCalled();
        });
        it('should work with coordinador role', async () => {
            const coordinadorUser = {
                id: 'user-789',
                role: 'coordinador',
                firstName: 'Coordinador',
            };
            mockRepository.findAll.mockResolvedValue(mockProducts);
            const result = await useCase.execute(coordinadorUser);
            expect(result).toEqual(mockProducts);
        });
        it('should work with verificador role', async () => {
            const verificadorUser = {
                id: 'user-999',
                role: 'verificador',
                firstName: 'Verificador',
            };
            mockRepository.findAll.mockResolvedValue(mockProducts);
            const result = await useCase.execute(verificadorUser);
            expect(result).toEqual(mockProducts);
        });
        it('should handle repository errors', async () => {
            const dbError = new Error('Database error');
            mockRepository.findAll.mockRejectedValue(dbError);
            await expect(useCase.execute(mockUser)).rejects.toThrow(dbError);
        });
        it('should return products with mixed active status', async () => {
            mockRepository.findAll.mockResolvedValue(mockProducts);
            const result = await useCase.execute(mockUser);
            expect(result.some((p) => p.active)).toBe(true);
            expect(result.some((p) => !p.active)).toBe(true);
        });
        it('should return products with all fields intact', async () => {
            mockRepository.findAll.mockResolvedValue(mockProducts);
            const result = await useCase.execute(mockUser);
            result.forEach((product) => {
                expect(product).toHaveProperty('id');
                expect(product).toHaveProperty('name');
                expect(product).toHaveProperty('price');
                expect(product).toHaveProperty('active');
                expect(product).toHaveProperty('createdAt');
                expect(product).toHaveProperty('updatedAt');
            });
        });
        it('should handle large product lists', async () => {
            const largeList = Array.from({ length: 100 }, (_, i) => new Product_1.Product(`product-${i}`, `Product ${i}`, `Description ${i}`, `SKU-${i}`, Math.random() * 1000, i % 2 === 0, new Date(), new Date()));
            mockRepository.findAll.mockResolvedValue(largeList);
            const result = await useCase.execute(mockUser);
            expect(result.length).toBe(100);
        });
    });
});
