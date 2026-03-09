"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheckHandler = healthCheckHandler;
exports.readinessHandler = readinessHandler;
exports.livenessHandler = livenessHandler;
const prismaClient_1 = require("../../prisma/prismaClient");
const logger_1 = __importDefault(require("../../observability/logger/logger"));
// Timestamp de inicio del servidor
const startTime = Date.now();
/**
 * Verifica la conexión a la base de datos
 */
async function checkDatabase() {
    const start = Date.now();
    try {
        // Query simple para verificar conexión
        await prismaClient_1.prisma.$queryRaw `SELECT 1`;
        const responseTime = Date.now() - start;
        return {
            status: responseTime < 100 ? 'pass' : 'warn',
            message: responseTime < 100 ? 'Database is healthy' : 'Database is slow',
            responseTime,
        };
    }
    catch (error) {
        logger_1.default.error('Database health check failed:', error);
        return {
            status: 'fail',
            message: 'Database connection failed',
            responseTime: Date.now() - start,
            details: {
                error: error instanceof Error ? error.message : 'Unknown error',
            },
        };
    }
}
/**
 * Verifica el uso de memoria
 */
function checkMemory() {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const usagePercent = (usage.heapUsed / usage.heapTotal) * 100;
    return {
        status: usagePercent < 80 ? 'pass' : usagePercent < 90 ? 'warn' : 'fail',
        message: `Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`,
        details: {
            heapUsed: heapUsedMB,
            heapTotal: heapTotalMB,
            external: Math.round(usage.external / 1024 / 1024),
            rss: Math.round(usage.rss / 1024 / 1024),
            usagePercent: parseFloat(usagePercent.toFixed(1)),
        },
    };
}
/**
 * Determina el estado general del sistema
 */
function determineOverallStatus(checks) {
    const statuses = Object.values(checks).map((check) => check.status);
    if (statuses.includes('fail'))
        return 'unhealthy';
    if (statuses.includes('warn'))
        return 'degraded';
    return 'healthy';
}
/**
 * Handler del endpoint de healthcheck
 */
async function healthCheckHandler(req, res) {
    try {
        const [database, memory] = await Promise.all([checkDatabase(), Promise.resolve(checkMemory())]);
        const checks = {
            database,
            memory,
        };
        const status = determineOverallStatus(checks);
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        const healthStatus = {
            status,
            timestamp: new Date().toISOString(),
            uptime,
            version: process.env.npm_package_version || '1.0.0',
            checks,
        };
        // Código HTTP según el estado
        const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
        // Log de healthcheck
        if (status !== 'healthy') {
            logger_1.default.warn(`Health check status: ${status}`, healthStatus);
        }
        res.status(httpStatus).json(healthStatus);
    }
    catch (error) {
        logger_1.default.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            message: 'Health check failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
/**
 * Handler simple para readiness probe (solo verifica que el servidor responda)
 */
function readinessHandler(req, res) {
    res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
    });
}
/**
 * Handler simple para liveness probe (verifica que el proceso está vivo)
 */
function livenessHandler(req, res) {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
    });
}
