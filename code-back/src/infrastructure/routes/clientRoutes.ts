import { Router } from 'express';
import { ClientController } from '@infrastructure/express/controllers/ClientController';
import { authMiddleware } from '@infrastructure/express/middleware/authMiddleware';
import { validateRequest } from '@infrastructure/express/middleware/validateRequest';
import {
  createClientSchema,
  updateClientSchema,
  getClientByIdSchema,
  pushDataClientSchema,
  deleteClientSchema,
} from '@infrastructure/express/validation/clientSchemas';

const router = Router();

router.get(
  '/:value',
  authMiddleware,
  validateRequest(getClientByIdSchema),
  ClientController.getClient.bind(ClientController)
);
router.post(
  '/',
  authMiddleware,
  validateRequest(createClientSchema),
  ClientController.createClient.bind(ClientController)
);
router.put(
  '/:id',
  authMiddleware,
  validateRequest(updateClientSchema),
  ClientController.updateClient.bind(ClientController)
);
router.post(
  '/:id/push',
  authMiddleware,
  validateRequest(pushDataClientSchema),
  ClientController.pushClientData.bind(ClientController)
);
router.post(
  '/:id/verify-delete',
  authMiddleware,
  validateRequest(deleteClientSchema),
  ClientController.verifyDeletePassword.bind(ClientController)
);
router.delete(
  '/:id',
  authMiddleware,
  validateRequest(deleteClientSchema),
  ClientController.deleteClient.bind(ClientController)
);

export default router;
