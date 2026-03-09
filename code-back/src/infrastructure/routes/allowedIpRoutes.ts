import { Router } from 'express';
import { AllowedIpController } from '@infrastructure/express/controllers/AllowedIpController';
import { authMiddleware } from '@infrastructure/express/middleware/authMiddleware';
import { validateRequest } from '@infrastructure/express/middleware/validateRequest';
import {
  createAllowedIpSchema,
  deleteAllowedIpSchema,
} from '@infrastructure/express/validation/allowedIpSchemas';

const router = Router();

// Listar IPs permitidas
router.get('/', authMiddleware, AllowedIpController.listAllowedIps.bind(AllowedIpController));

// Crear IP permitida
router.post(
  '/',
  authMiddleware,
  validateRequest(createAllowedIpSchema),
  AllowedIpController.createAllowedIp.bind(AllowedIpController)
);

// Eliminar IP permitida
router.delete(
  '/:id',
  authMiddleware,
  validateRequest(deleteAllowedIpSchema),
  AllowedIpController.deleteAllowedIp.bind(AllowedIpController)
);

// Obtener la IP actual del cliente y si está en la lista blanca
router.get('/my-ip', authMiddleware, AllowedIpController.getMyIp.bind(AllowedIpController));

// Obtener modo de filtrado (allowAll / whitelist)
router.get('/filter-mode', authMiddleware, AllowedIpController.getFilterMode.bind(AllowedIpController));

// Cambiar modo de filtrado
router.put('/filter-mode', authMiddleware, AllowedIpController.setFilterMode.bind(AllowedIpController));

export default router;
