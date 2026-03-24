import { Router } from 'express';
import { authMiddleware } from '@infrastructure/express/middleware/authMiddleware';
import { validateRequest } from '@infrastructure/express/middleware/validateRequest';
import { EmpresaController } from '@infrastructure/express/controllers/EmpresaController';
import { uploadLogo } from '@infrastructure/express/middleware/uploadMiddleware';
import {
  createEmpresaSchema,
  updateEmpresaSchema,
} from '@infrastructure/express/validation/empresaSchemas';

const router = Router();

// Listar todas las empresas (solo admin)
router.get('/', authMiddleware, EmpresaController.list.bind(EmpresaController));

// Obtener una empresa por ID (solo admin)
router.get('/:id', authMiddleware, EmpresaController.getById.bind(EmpresaController));

// Crear empresa (solo admin)
router.post(
  '/',
  authMiddleware,
  validateRequest(createEmpresaSchema),
  EmpresaController.create.bind(EmpresaController)
);

// Actualizar empresa (solo admin)
router.put(
  '/:id',
  authMiddleware,
  validateRequest(updateEmpresaSchema),
  EmpresaController.update.bind(EmpresaController)
);

// Subir logo de empresa (solo admin)
router.post(
  '/:id/logo',
  authMiddleware,
  uploadLogo.single('logo'),
  EmpresaController.uploadLogo.bind(EmpresaController)
);

export default router;
