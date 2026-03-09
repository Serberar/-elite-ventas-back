import { Router } from 'express';
import { SettingsController } from '@infrastructure/express/controllers/SettingsController';
import { authMiddleware } from '@infrastructure/express/middleware/authMiddleware';

const router = Router();

// GET /api/settings/:key — obtener valor de configuración
router.get('/:key', authMiddleware, SettingsController.getSetting.bind(SettingsController));

// PATCH /api/settings/:key — actualizar valor (solo administrador)
router.patch('/:key', authMiddleware, SettingsController.setSetting.bind(SettingsController));

export default router;
