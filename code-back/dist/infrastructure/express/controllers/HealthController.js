"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const ServiceContainer_1 = require("../../container/ServiceContainer");
class HealthController {
    /**
     * Health check completo con todos los servicios
     */
    static async health(req, res) {
        try {
            const healthStatus = await ServiceContainer_1.serviceContainer.healthChecker.getHealthStatus();
            const statusCode = healthStatus.status === 'healthy' ? 200 : healthStatus.status === 'degraded' ? 200 : 503;
            res.status(statusCode).json(healthStatus);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Health check failed';
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                message: errorMessage,
                error: 'Health check execution failed',
            });
        }
    }
    /**
     * Health check rápido solo para servicios críticos
     */
    static async ping(req, res) {
        try {
            const result = await ServiceContainer_1.serviceContainer.healthChecker.quickHealthCheck();
            const statusCode = result.status === 'healthy' ? 200 : 503;
            res.status(statusCode).json({
                status: result.status,
                timestamp: new Date().toISOString(),
                responseTime: result.responseTime,
                message: result.status === 'healthy' ? 'Service is operational' : 'Service is unavailable',
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ping failed';
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                message: errorMessage,
            });
        }
    }
    /**
     * Información del sistema y configuración
     */
    static info(req, res) {
        try {
            const systemInfo = ServiceContainer_1.serviceContainer.getSystemInfo();
            res.status(200).json({
                status: 'success',
                timestamp: new Date().toISOString(),
                data: systemInfo,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'System info failed';
            res.status(500).json({
                status: 'error',
                timestamp: new Date().toISOString(),
                message: errorMessage,
            });
        }
    }
    /**
     * Estadísticas de servicios individuales
     */
    static services(req, res) {
        try {
            const services = {
                database: {
                    status: 'operational',
                    pools: {
                        user: ServiceContainer_1.serviceContainer.config.database.poolSize,
                        client: ServiceContainer_1.serviceContainer.config.database.poolSize,
                        sale: ServiceContainer_1.serviceContainer.config.database.poolSize,
                    },
                },
                system: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    platform: process.platform,
                    version: process.version,
                },
            };
            res.status(200).json({
                status: 'success',
                timestamp: new Date().toISOString(),
                services,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Services info failed';
            res.status(500).json({
                status: 'error',
                timestamp: new Date().toISOString(),
                message: errorMessage,
            });
        }
    }
}
exports.HealthController = HealthController;
