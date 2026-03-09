"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const ServiceContainer_1 = require("../../container/ServiceContainer");
const types_1 = require("../../../domain/types");
class ProductController {
    static async listProducts(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'No autorizado' });
            }
            const products = await ServiceContainer_1.serviceContainer.listProductsUseCase.execute(currentUser);
            res.status(200).json(products);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso')) {
                return res.status(403).json({ message: errorMessage });
            }
            res.status(500).json({ message: errorMessage });
        }
    }
    /**
     * Listado paginado de productos
     * Query params: page, limit
     */
    static async listProductsPaginated(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'No autorizado' });
            }
            const pagination = (0, types_1.parsePaginationOptions)(req.query.page, req.query.limit);
            const result = await ServiceContainer_1.serviceContainer.productRepository.findAllPaginated(pagination);
            res.status(200).json({
                data: result.data.map((p) => p.toPrisma()),
                meta: result.meta,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso')) {
                return res.status(403).json({ message: errorMessage });
            }
            res.status(500).json({ message: errorMessage });
        }
    }
    static async getProduct(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'No autorizado' });
            }
            const product = await ServiceContainer_1.serviceContainer.getProductUseCase.execute(req.body, currentUser);
            if (!product) {
                return res.status(404).json({ message: 'Producto no encontrado' });
            }
            res.status(200).json(product);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso')) {
                return res.status(403).json({ message: errorMessage });
            }
            res.status(500).json({ message: errorMessage });
        }
    }
    static async createProduct(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'No autorizado' });
            }
            const product = await ServiceContainer_1.serviceContainer.createProductUseCase.execute(req.body, currentUser);
            res.status(201).json({ message: 'Producto creado correctamente', product });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso')) {
                return res.status(403).json({ message: errorMessage });
            }
            res.status(500).json({ message: errorMessage });
        }
    }
    static async updateProduct(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'No autorizado' });
            }
            const id = req.params.id;
            if (!id) {
                return res.status(400).json({ message: 'ID de producto no proporcionado' });
            }
            const product = await ServiceContainer_1.serviceContainer.updateProductUseCase.execute({ id, ...req.body }, currentUser);
            return res.status(200).json({
                message: 'Producto actualizado correctamente',
                product
            });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            if (msg.includes('permiso')) {
                return res.status(403).json({ message: msg });
            }
            if (msg.includes('no encontrado')) {
                return res.status(404).json({ message: msg });
            }
            return res.status(500).json({ message: msg });
        }
    }
    static async toggleActive(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'No autorizado' });
            }
            const id = req.params.id; // usa el nombre real que espera tu use case
            const product = await ServiceContainer_1.serviceContainer.toggleProductActiveUseCase.execute({ id }, currentUser);
            return res.status(200).json({
                message: `Producto ${product.active ? 'activado' : 'desactivado'} correctamente`,
                product,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso')) {
                return res.status(403).json({ message: errorMessage });
            }
            if (errorMessage.includes('no encontrado')) {
                return res.status(404).json({ message: errorMessage });
            }
            return res.status(500).json({ message: errorMessage });
        }
    }
}
exports.ProductController = ProductController;
