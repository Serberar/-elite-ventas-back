"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SaleStatusController_1 = require("../express/controllers/SaleStatusController");
const authMiddleware_1 = require("../express/middleware/authMiddleware");
const validateRequest_1 = require("../express/middleware/validateRequest");
const saleStatusSchemas_1 = require("../express/validation/saleStatusSchemas");
const router = (0, express_1.Router)();
// Listar estados de venta
router.get('/', authMiddleware_1.authMiddleware, SaleStatusController_1.SaleStatusController.listSaleStatuses.bind(SaleStatusController_1.SaleStatusController));
// Crear estado de venta
router.post('/', authMiddleware_1.authMiddleware, (0, validateRequest_1.validateRequest)(saleStatusSchemas_1.createSaleStatusSchema), SaleStatusController_1.SaleStatusController.createSaleStatus.bind(SaleStatusController_1.SaleStatusController));
// Actualizar estado de venta
router.put('/:id', authMiddleware_1.authMiddleware, (0, validateRequest_1.validateRequest)(saleStatusSchemas_1.updateSaleStatusSchema), SaleStatusController_1.SaleStatusController.updateSaleStatus.bind(SaleStatusController_1.SaleStatusController));
// Reordenar estados de venta
router.patch('/reorder', authMiddleware_1.authMiddleware, (0, validateRequest_1.validateRequest)(saleStatusSchemas_1.reorderSaleStatusesSchema), SaleStatusController_1.SaleStatusController.reorderSaleStatuses.bind(SaleStatusController_1.SaleStatusController));
// Eliminar estado de venta
router.delete('/:id', authMiddleware_1.authMiddleware, SaleStatusController_1.SaleStatusController.deleteSaleStatus.bind(SaleStatusController_1.SaleStatusController));
exports.default = router;
