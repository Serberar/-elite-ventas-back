"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const productRoutes_1 = __importDefault(require("../../infrastructure/routes/productRoutes"));
const ServiceContainer_1 = require("../../infrastructure/container/ServiceContainer");
// Mock del serviceContainer
jest.mock('@infrastructure/container/ServiceContainer', () => ({
    serviceContainer: {
        listProductsUseCase: { execute: jest.fn() },
        getProductUseCase: { execute: jest.fn() },
        createProductUseCase: { execute: jest.fn() },
        updateProductUseCase: { execute: jest.fn() },
        toggleProductActiveUseCase: { execute: jest.fn() },
        productRepository: {
            findAllPaginated: jest.fn(),
        },
    },
}));
// Mock del logger
jest.mock('@infrastructure/observability/logger/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));
// Mock del authMiddleware
jest.mock('@infrastructure/express/middleware/authMiddleware', () => ({
    authMiddleware: (req, res, next) => {
        if (req.headers.authorization === 'Bearer valid-token') {
            req.user = { id: 'user-123', role: 'administrador', firstName: 'Admin' };
            next();
        }
        else {
            res.status(401).json({ message: 'No autorizado' });
        }
    },
}));
// Mock del validateRequest middleware
jest.mock('@infrastructure/express/middleware/validateRequest', () => ({
    validateRequest: () => (req, res, next) => next(),
}));
describe('Integration: Product Routes', () => {
    let app;
    beforeAll(() => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/products', productRoutes_1.default);
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('GET /api/products', () => {
        it('should return 401 without authentication', async () => {
            await (0, supertest_1.default)(app)
                .get('/api/products')
                .expect(401);
        });
        it('should list products with authentication', async () => {
            const mockProducts = [
                { id: 'prod-1', name: 'Product 1', price: 100, active: true },
                { id: 'prod-2', name: 'Product 2', price: 200, active: true },
            ];
            ServiceContainer_1.serviceContainer.listProductsUseCase.execute.mockResolvedValue(mockProducts);
            const response = await (0, supertest_1.default)(app)
                .get('/api/products')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body).toHaveLength(2);
        });
        it('should return 403 for permission errors', async () => {
            ServiceContainer_1.serviceContainer.listProductsUseCase.execute.mockRejectedValue(new Error('No tiene permiso'));
            const response = await (0, supertest_1.default)(app)
                .get('/api/products')
                .set('Authorization', 'Bearer valid-token')
                .expect(403);
            expect(response.body).toHaveProperty('message', 'No tiene permiso');
        });
    });
    describe('GET /api/products/paginated', () => {
        it('should return 401 without authentication', async () => {
            await (0, supertest_1.default)(app)
                .get('/api/products/paginated')
                .expect(401);
        });
        it('should list products paginated', async () => {
            const mockResult = {
                data: [
                    { toPrisma: () => ({ id: 'prod-1', name: 'Product 1', price: 100 }) },
                    { toPrisma: () => ({ id: 'prod-2', name: 'Product 2', price: 200 }) },
                ],
                meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
            };
            ServiceContainer_1.serviceContainer.productRepository.findAllPaginated.mockResolvedValue(mockResult);
            const response = await (0, supertest_1.default)(app)
                .get('/api/products/paginated?page=1&limit=10')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('meta');
            expect(response.body.meta.page).toBe(1);
        });
    });
    describe('GET /api/products/:id', () => {
        it('should return 401 without authentication', async () => {
            await (0, supertest_1.default)(app)
                .get('/api/products/prod-123')
                .expect(401);
        });
        it('should get product by id', async () => {
            const mockProduct = {
                id: 'prod-123',
                name: 'Test Product',
                description: 'Description',
                price: 99.99,
                active: true,
            };
            ServiceContainer_1.serviceContainer.getProductUseCase.execute.mockResolvedValue(mockProduct);
            const response = await (0, supertest_1.default)(app)
                .get('/api/products/prod-123')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);
            expect(response.body.id).toBe('prod-123');
            expect(response.body.name).toBe('Test Product');
        });
        it('should return 404 for non-existent product', async () => {
            ServiceContainer_1.serviceContainer.getProductUseCase.execute.mockResolvedValue(null);
            const response = await (0, supertest_1.default)(app)
                .get('/api/products/nonexistent')
                .set('Authorization', 'Bearer valid-token')
                .expect(404);
            expect(response.body).toHaveProperty('message', 'Producto no encontrado');
        });
    });
    describe('POST /api/products', () => {
        it('should return 401 without authentication', async () => {
            await (0, supertest_1.default)(app)
                .post('/api/products')
                .send({ name: 'Test', price: 100 })
                .expect(401);
        });
        it('should create a product with valid data', async () => {
            const mockProduct = {
                id: 'prod-new',
                name: 'New Product',
                description: 'New description',
                sku: 'SKU-123',
                price: 149.99,
                active: true,
            };
            ServiceContainer_1.serviceContainer.createProductUseCase.execute.mockResolvedValue(mockProduct);
            const response = await (0, supertest_1.default)(app)
                .post('/api/products')
                .set('Authorization', 'Bearer valid-token')
                .send({
                name: 'New Product',
                description: 'New description',
                sku: 'SKU-123',
                price: 149.99,
            })
                .expect(201);
            expect(response.body).toHaveProperty('message', 'Producto creado correctamente');
            expect(response.body.product.name).toBe('New Product');
        });
        it('should return 403 for permission errors', async () => {
            ServiceContainer_1.serviceContainer.createProductUseCase.execute.mockRejectedValue(new Error('No tiene permiso'));
            const response = await (0, supertest_1.default)(app)
                .post('/api/products')
                .set('Authorization', 'Bearer valid-token')
                .send({ name: 'Test', price: 100 })
                .expect(403);
            expect(response.body).toHaveProperty('message', 'No tiene permiso');
        });
    });
    describe('PUT /api/products/:id', () => {
        it('should return 401 without authentication', async () => {
            await (0, supertest_1.default)(app)
                .put('/api/products/prod-123')
                .send({ name: 'Updated' })
                .expect(401);
        });
        it('should update product with valid data', async () => {
            const mockUpdatedProduct = {
                id: 'prod-123',
                name: 'Updated Product',
                price: 199.99,
                active: true,
            };
            ServiceContainer_1.serviceContainer.updateProductUseCase.execute.mockResolvedValue(mockUpdatedProduct);
            const response = await (0, supertest_1.default)(app)
                .put('/api/products/prod-123')
                .set('Authorization', 'Bearer valid-token')
                .send({
                name: 'Updated Product',
                price: 199.99,
            })
                .expect(200);
            expect(response.body).toHaveProperty('message', 'Producto actualizado correctamente');
            expect(response.body.product.name).toBe('Updated Product');
        });
        it('should return 404 for non-existent product', async () => {
            ServiceContainer_1.serviceContainer.updateProductUseCase.execute.mockRejectedValue(new Error('Producto no encontrado'));
            const response = await (0, supertest_1.default)(app)
                .put('/api/products/nonexistent')
                .set('Authorization', 'Bearer valid-token')
                .send({ name: 'Test' })
                .expect(404);
            expect(response.body).toHaveProperty('message');
        });
        it('should return 403 for permission errors', async () => {
            ServiceContainer_1.serviceContainer.updateProductUseCase.execute.mockRejectedValue(new Error('No tiene permiso'));
            const response = await (0, supertest_1.default)(app)
                .put('/api/products/prod-123')
                .set('Authorization', 'Bearer valid-token')
                .send({ name: 'Test' })
                .expect(403);
            expect(response.body).toHaveProperty('message', 'No tiene permiso');
        });
    });
    describe('PATCH /api/products/:id/toggle', () => {
        it('should return 401 without authentication', async () => {
            await (0, supertest_1.default)(app)
                .patch('/api/products/prod-123/toggle')
                .expect(401);
        });
        it('should toggle product active status to inactive', async () => {
            const mockProduct = {
                id: 'prod-123',
                name: 'Test Product',
                active: false,
            };
            ServiceContainer_1.serviceContainer.toggleProductActiveUseCase.execute.mockResolvedValue(mockProduct);
            const response = await (0, supertest_1.default)(app)
                .patch('/api/products/prod-123/toggle')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);
            expect(response.body).toHaveProperty('message', 'Producto desactivado correctamente');
            expect(response.body.product.active).toBe(false);
        });
        it('should toggle product active status to active', async () => {
            const mockProduct = {
                id: 'prod-123',
                name: 'Test Product',
                active: true,
            };
            ServiceContainer_1.serviceContainer.toggleProductActiveUseCase.execute.mockResolvedValue(mockProduct);
            const response = await (0, supertest_1.default)(app)
                .patch('/api/products/prod-123/toggle')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);
            expect(response.body).toHaveProperty('message', 'Producto activado correctamente');
            expect(response.body.product.active).toBe(true);
        });
        it('should return 404 for non-existent product', async () => {
            ServiceContainer_1.serviceContainer.toggleProductActiveUseCase.execute.mockRejectedValue(new Error('Producto no encontrado'));
            const response = await (0, supertest_1.default)(app)
                .patch('/api/products/nonexistent/toggle')
                .set('Authorization', 'Bearer valid-token')
                .expect(404);
            expect(response.body).toHaveProperty('message');
        });
        it('should return 403 for permission errors', async () => {
            ServiceContainer_1.serviceContainer.toggleProductActiveUseCase.execute.mockRejectedValue(new Error('No tiene permiso'));
            const response = await (0, supertest_1.default)(app)
                .patch('/api/products/prod-123/toggle')
                .set('Authorization', 'Bearer valid-token')
                .expect(403);
            expect(response.body).toHaveProperty('message', 'No tiene permiso');
        });
    });
});
