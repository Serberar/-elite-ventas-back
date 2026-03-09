import { Router } from 'express';
import { HealthController } from '@infrastructure/express/controllers/HealthController';

const router = Router();

/**
 * Rutas de Health Check y Monitoreo
 */

// GET /health - Health check completo
router.get('/health', HealthController.health);

// GET /ping - Health check rápido
router.get('/ping', HealthController.ping);

// GET /info - Información del sistema
router.get('/info', HealthController.info);

// GET /services - Estado de servicios individuales
router.get('/services', HealthController.services);

export default router;
