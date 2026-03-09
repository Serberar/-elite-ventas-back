"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SaleController_1 = require("../express/controllers/SaleController");
const authMiddleware_1 = require("../express/middleware/authMiddleware");
const validateRequest_1 = require("../express/middleware/validateRequest");
const saleSchemas_1 = require("../express/validation/saleSchemas");
const router = (0, express_1.Router)();
// Estadísticas de ventas (debe ir antes de /:saleId)
router.get('/stats', authMiddleware_1.authMiddleware, SaleController_1.SaleController.getSalesStats.bind(SaleController_1.SaleController));
// Listar ventas con filtros
router.get('/', authMiddleware_1.authMiddleware, (0, validateRequest_1.validateRequest)(saleSchemas_1.saleFiltersSchema), SaleController_1.SaleController.listSalesWithFilters.bind(SaleController_1.SaleController));
// Listar ventas paginadas (nuevo endpoint)
router.get('/paginated', authMiddleware_1.authMiddleware, SaleController_1.SaleController.listSalesPaginated.bind(SaleController_1.SaleController));
// Obtener una venta por ID
router.get('/:saleId', authMiddleware_1.authMiddleware, SaleController_1.SaleController.getSaleById.bind(SaleController_1.SaleController));
// Crear venta con productos
router.post('/', authMiddleware_1.authMiddleware, (0, validateRequest_1.validateRequest)(saleSchemas_1.createSaleWithProductsSchema), SaleController_1.SaleController.createSaleWithProducts.bind(SaleController_1.SaleController));
// Añadir item a una venta
router.post('/:saleId/items', authMiddleware_1.authMiddleware, (0, validateRequest_1.validateRequest)(saleSchemas_1.saleItemInputSchema), SaleController_1.SaleController.addSaleItem.bind(SaleController_1.SaleController));
// Actualizar item de una venta
router.put('/:saleId/items/:itemId', authMiddleware_1.authMiddleware, (0, validateRequest_1.validateRequest)(saleSchemas_1.updateSaleItemsSchema), SaleController_1.SaleController.updateSaleItem.bind(SaleController_1.SaleController));
// Eliminar item de una venta
router.delete('/:saleId/items/:itemId', authMiddleware_1.authMiddleware, SaleController_1.SaleController.removeSaleItem.bind(SaleController_1.SaleController));
// Cambiar estado de venta
router.patch('/:saleId/status', authMiddleware_1.authMiddleware, (0, validateRequest_1.validateRequest)(saleSchemas_1.changeSaleStatusSchema), SaleController_1.SaleController.changeSaleStatus.bind(SaleController_1.SaleController));
// Actualizar datos del cliente en la venta
router.patch('/:saleId/client', authMiddleware_1.authMiddleware, SaleController_1.SaleController.updateClientSnapshot.bind(SaleController_1.SaleController));
exports.default = router;
