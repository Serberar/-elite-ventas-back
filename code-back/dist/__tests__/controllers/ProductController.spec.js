"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ProductController_1 = require("../../infrastructure/express/controllers/ProductController");
const ServiceContainer_1 = require("../../infrastructure/container/ServiceContainer");
jest.mock('@infrastructure/container/ServiceContainer', () => ({
    serviceContainer: {
        listProductsUseCase: { execute: jest.fn() },
        getProductUseCase: { execute: jest.fn() },
        createProductUseCase: { execute: jest.fn() },
        updateProductUseCase: { execute: jest.fn() },
        toggleProductActiveUseCase: { execute: jest.fn() },
        productRepository: { findAllPaginated: jest.fn() },
    },
}));
describe('ProductController', () => {
    let req;
    let res;
    let statusMock;
    let jsonMock;
    const currentUser = { id: 'user-1', role: 'administrador', firstName: 'Admin' };
    beforeEach(() => {
        statusMock = jest.fn().mockReturnThis();
        jsonMock = jest.fn();
        res = { status: statusMock, json: jsonMock };
        req = { user: currentUser, params: {}, body: {}, query: {} };
        jest.clearAllMocks();
    });
    describe('listProducts', () => {
        it('should return 401 if user is not authenticated', async () => {
            req.user = undefined;
            await ProductController_1.ProductController.listProducts(req, res);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
        });
        it('should return 200 with products list', async () => {
            const products = [{ id: 'product-1', name: 'Product 1' }];
            ServiceContainer_1.serviceContainer.listProductsUseCase.execute.mockResolvedValue(products);
            await ProductController_1.ProductController.listProducts(req, res);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(products);
        });
        it('should return 403 for permission errors', async () => {
            ServiceContainer_1.serviceContainer.listProductsUseCase.execute.mockRejectedValue(new Error('No tiene permiso'));
            await ProductController_1.ProductController.listProducts(req, res);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
        });
        it('should return 500 for other errors', async () => {
            ServiceContainer_1.serviceContainer.listProductsUseCase.execute.mockRejectedValue(new Error('Database error'));
            await ProductController_1.ProductController.listProducts(req, res);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Database error' });
        });
    });
    describe('getProduct', () => {
        it('should return 401 if user is not authenticated', async () => {
            req.user = undefined;
            await ProductController_1.ProductController.getProduct(req, res);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
        });
        it('should return 404 if product not found', async () => {
            req.body = { id: 'product-1' };
            ServiceContainer_1.serviceContainer.getProductUseCase.execute.mockResolvedValue(null);
            await ProductController_1.ProductController.getProduct(req, res);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Producto no encontrado' });
        });
        it('should return 200 with product', async () => {
            const product = { id: 'product-1', name: 'Product 1' };
            req.body = { id: 'product-1' };
            ServiceContainer_1.serviceContainer.getProductUseCase.execute.mockResolvedValue(product);
            await ProductController_1.ProductController.getProduct(req, res);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(product);
        });
        it('should return 403 for permission errors', async () => {
            req.body = { id: 'product-1' };
            ServiceContainer_1.serviceContainer.getProductUseCase.execute.mockRejectedValue(new Error('No tiene permiso'));
            await ProductController_1.ProductController.getProduct(req, res);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
        });
    });
    describe('createProduct', () => {
        it('should return 401 if user is not authenticated', async () => {
            req.user = undefined;
            await ProductController_1.ProductController.createProduct(req, res);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
        });
        it('should return 201 with created product', async () => {
            const product = { id: 'product-1', name: 'New Product' };
            req.body = { name: 'New Product', price: 100 };
            ServiceContainer_1.serviceContainer.createProductUseCase.execute.mockResolvedValue(product);
            await ProductController_1.ProductController.createProduct(req, res);
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Producto creado correctamente',
                product,
            });
        });
        it('should return 403 for permission errors', async () => {
            req.body = { name: 'New Product' };
            ServiceContainer_1.serviceContainer.createProductUseCase.execute.mockRejectedValue(new Error('No tiene permiso'));
            await ProductController_1.ProductController.createProduct(req, res);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
        });
        it('should return 500 for other errors', async () => {
            req.body = { name: 'New Product' };
            ServiceContainer_1.serviceContainer.createProductUseCase.execute.mockRejectedValue(new Error('Database error'));
            await ProductController_1.ProductController.createProduct(req, res);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Database error' });
        });
    });
    describe('updateProduct', () => {
        it('should return 401 if user is not authenticated', async () => {
            req.user = undefined;
            await ProductController_1.ProductController.updateProduct(req, res);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
        });
        it('should return 400 if id not provided', async () => {
            req.params = {};
            req.body = { name: 'Updated Product' };
            await ProductController_1.ProductController.updateProduct(req, res);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'ID de producto no proporcionado' });
        });
        it('should return 200 with updated product', async () => {
            const product = { id: 'product-1', name: 'Updated Product' };
            req.params = { id: 'product-1' };
            req.body = { name: 'Updated Product' };
            ServiceContainer_1.serviceContainer.updateProductUseCase.execute.mockResolvedValue(product);
            await ProductController_1.ProductController.updateProduct(req, res);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Producto actualizado correctamente',
                product,
            });
        });
        it('should return 403 for permission errors', async () => {
            req.params = { id: 'product-1' };
            req.body = { name: 'Updated Product' };
            ServiceContainer_1.serviceContainer.updateProductUseCase.execute.mockRejectedValue(new Error('No tiene permiso'));
            await ProductController_1.ProductController.updateProduct(req, res);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
        });
        it('should return 404 for not found errors', async () => {
            req.params = { id: 'product-1' };
            req.body = { name: 'Updated Product' };
            ServiceContainer_1.serviceContainer.updateProductUseCase.execute.mockRejectedValue(new Error('Producto no encontrado'));
            await ProductController_1.ProductController.updateProduct(req, res);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Producto no encontrado' });
        });
        it('should return 500 for other errors', async () => {
            req.params = { id: 'product-1' };
            req.body = { name: 'Updated Product' };
            ServiceContainer_1.serviceContainer.updateProductUseCase.execute.mockRejectedValue(new Error('Database error'));
            await ProductController_1.ProductController.updateProduct(req, res);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Database error' });
        });
    });
    describe('toggleActive', () => {
        it('should return 401 if user is not authenticated', async () => {
            req.user = undefined;
            await ProductController_1.ProductController.toggleActive(req, res);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
        });
        it('should return 200 with activated product', async () => {
            const product = { id: 'product-1', name: 'Product', active: true };
            req.params = { id: 'product-1' };
            ServiceContainer_1.serviceContainer.toggleProductActiveUseCase.execute.mockResolvedValue(product);
            await ProductController_1.ProductController.toggleActive(req, res);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Producto activado correctamente',
                product,
            });
        });
        it('should return 200 with deactivated product', async () => {
            const product = { id: 'product-1', name: 'Product', active: false };
            req.params = { id: 'product-1' };
            ServiceContainer_1.serviceContainer.toggleProductActiveUseCase.execute.mockResolvedValue(product);
            await ProductController_1.ProductController.toggleActive(req, res);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Producto desactivado correctamente',
                product,
            });
        });
        it('should return 403 for permission errors', async () => {
            req.params = { id: 'product-1' };
            ServiceContainer_1.serviceContainer.toggleProductActiveUseCase.execute.mockRejectedValue(new Error('No tiene permiso'));
            await ProductController_1.ProductController.toggleActive(req, res);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
        });
        it('should return 404 for not found errors', async () => {
            req.params = { id: 'product-1' };
            ServiceContainer_1.serviceContainer.toggleProductActiveUseCase.execute.mockRejectedValue(new Error('Producto no encontrado'));
            await ProductController_1.ProductController.toggleActive(req, res);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Producto no encontrado' });
        });
    });
});
