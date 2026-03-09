import { Router } from 'express';
import { SaleController } from '@infrastructure/express/controllers/SaleController';
import { authMiddleware } from '@infrastructure/express/middleware/authMiddleware';
import { validateRequest } from '@infrastructure/express/middleware/validateRequest';
import {
  createSaleWithProductsSchema,
  changeSaleStatusSchema,
  saleFiltersSchema,
  saleItemInputSchema,
  updateSaleItemsSchema,
} from '@infrastructure/express/validation/saleSchemas';
const router = Router();

// Estadísticas de ventas (debe ir antes de /:saleId)
router.get(
  '/stats',
  authMiddleware,
  SaleController.getSalesStats.bind(SaleController)
);

// Lista de comerciales únicos para filtros
router.get(
  '/comerciales',
  authMiddleware,
  SaleController.getComerciales.bind(SaleController)
);

// Listar ventas con filtros
router.get(
  '/',
  authMiddleware,
  validateRequest(saleFiltersSchema),
  SaleController.listSalesWithFilters.bind(SaleController)
);

// Listar ventas paginadas (nuevo endpoint)
router.get(
  '/paginated',
  authMiddleware,
  SaleController.listSalesPaginated.bind(SaleController)
);

// Obtener una venta por ID
router.get(
  '/:saleId',
  authMiddleware,
  SaleController.getSaleById.bind(SaleController)
);

// Crear venta con productos
router.post(
  '/',
  authMiddleware,
  validateRequest(createSaleWithProductsSchema),
  SaleController.createSaleWithProducts.bind(SaleController)
);

// Añadir item a una venta
router.post(
  '/:saleId/items',
  authMiddleware,
  validateRequest(saleItemInputSchema),
  SaleController.addSaleItem.bind(SaleController)
);

// Actualizar item de una venta
router.put(
  '/:saleId/items/:itemId',
  authMiddleware,
  validateRequest(updateSaleItemsSchema),
  SaleController.updateSaleItem.bind(SaleController)
);

// Eliminar item de una venta
router.delete(
  '/:saleId/items/:itemId',
  authMiddleware,
  SaleController.removeSaleItem.bind(SaleController)
);

// Cambiar estado de venta
router.patch(
  '/:saleId/status',
  authMiddleware,
  validateRequest(changeSaleStatusSchema),
  SaleController.changeSaleStatus.bind(SaleController)
);

// Actualizar datos del cliente en la venta
router.patch(
  '/:saleId/client',
  authMiddleware,
  SaleController.updateClientSnapshot.bind(SaleController)
);

export default router;
