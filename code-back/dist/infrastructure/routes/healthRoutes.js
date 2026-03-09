"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const HealthController_1 = require("../express/controllers/HealthController");
const router = (0, express_1.Router)();
/**
 * Rutas de Health Check y Monitoreo
 */
// GET /health - Health check completo
router.get('/health', HealthController_1.HealthController.health);
// GET /ping - Health check rápido
router.get('/ping', HealthController_1.HealthController.ping);
// GET /info - Información del sistema
router.get('/info', HealthController_1.HealthController.info);
// GET /services - Estado de servicios individuales
router.get('/services', HealthController_1.HealthController.services);
exports.default = router;
