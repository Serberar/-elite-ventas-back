"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ProductController_1 = require("../express/controllers/ProductController");
const authMiddleware_1 = require("../express/middleware/authMiddleware");
const validateRequest_1 = require("../express/middleware/validateRequest");
const productSchemas_1 = require("../express/validation/productSchemas");
const router = (0, express_1.Router)();
// Listar productos
router.get('/', authMiddleware_1.authMiddleware, (0, validateRequest_1.validateRequest)(productSchemas_1.listProductsSchema), ProductController_1.ProductController.listProducts.bind(ProductController_1.ProductController));
// Listar productos paginados (nuevo endpoint)
router.get('/paginated', authMiddleware_1.authMiddleware, ProductController_1.ProductController.listProductsPaginated.bind(ProductController_1.ProductController));
// Obtener producto por ID
router.get('/:id', authMiddleware_1.authMiddleware, (0, validateRequest_1.validateRequest)(productSchemas_1.getProductSchema), ProductController_1.ProductController.getProduct.bind(ProductController_1.ProductController));
// Crear producto
router.post('/', authMiddleware_1.authMiddleware, (0, validateRequest_1.validateRequest)(productSchemas_1.createProductSchema), ProductController_1.ProductController.createProduct.bind(ProductController_1.ProductController));
// Actualizar producto
router.put('/:id', authMiddleware_1.authMiddleware, (0, validateRequest_1.validateRequest)(productSchemas_1.updateProductSchema), ProductController_1.ProductController.updateProduct.bind(ProductController_1.ProductController));
// Activar/Desactivar producto
router.patch('/:id/toggle', authMiddleware_1.authMiddleware, (0, validateRequest_1.validateRequest)(productSchemas_1.toggleProductActiveSchema), ProductController_1.ProductController.toggleActive.bind(ProductController_1.ProductController));
exports.default = router;
