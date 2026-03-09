import { Router } from 'express';
import { SaleStatusController } from '@infrastructure/express/controllers/SaleStatusController';
import { authMiddleware } from '@infrastructure/express/middleware/authMiddleware';
import { validateRequest } from '@infrastructure/express/middleware/validateRequest';
import {
  createSaleStatusSchema,
  updateSaleStatusSchema,
  reorderSaleStatusesSchema,
} from '@infrastructure/express/validation/saleStatusSchemas';

const router = Router();

// Listar estados de venta
router.get('/', authMiddleware, SaleStatusController.listSaleStatuses.bind(SaleStatusController));

// Crear estado de venta
router.post(
  '/',
  authMiddleware,
  validateRequest(createSaleStatusSchema),
  SaleStatusController.createSaleStatus.bind(SaleStatusController)
);

// Actualizar estado de venta
router.put(
  '/:id',
  authMiddleware,
  validateRequest(updateSaleStatusSchema),
  SaleStatusController.updateSaleStatus.bind(SaleStatusController)
);

// Reordenar estados de venta
router.patch(
  '/reorder',
  authMiddleware,
  validateRequest(reorderSaleStatusesSchema),
  SaleStatusController.reorderSaleStatuses.bind(SaleStatusController)
);

// Eliminar estado de venta
router.delete(
  '/:id',
  authMiddleware,
  SaleStatusController.deleteSaleStatus.bind(SaleStatusController)
);

export default router;
