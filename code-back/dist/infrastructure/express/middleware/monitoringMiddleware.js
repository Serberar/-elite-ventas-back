"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetMetrics = exports.getMetrics = exports.monitoringMiddleware = void 0;
const logger_1 = __importDefault(require("../../observability/logger/logger"));
const metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    endpoints: new Map(),
    statusCodes: new Map(),
};
/**
 * Middleware para monitorización de requests
 * Captura tiempo de respuesta, status codes, y métricas por endpoint
 */
const monitoringMiddleware = (req, res, next) => {
    const startTime = Date.now();
    // Obtener la ruta de forma segura
    let routePath = req.path;
    if (req.route) {
        const route = req.route;
        if (typeof route === 'object' && route !== null && 'path' in route) {
            const pathValue = route.path;
            if (typeof pathValue === 'string') {
                routePath = pathValue;
            }
        }
    }
    const endpoint = `${req.method} ${routePath}`;
    // Capturar cuando la respuesta termine
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        // Actualizar métricas globales
        metrics.totalRequests++;
        if (statusCode >= 200 && statusCode < 400) {
            metrics.successfulRequests++;
        }
        else {
            metrics.failedRequests++;
        }
        // Actualizar promedio de tiempo de respuesta
        metrics.averageResponseTime =
            (metrics.averageResponseTime * (metrics.totalRequests - 1) + duration) /
                metrics.totalRequests;
        // Actualizar métricas por endpoint
        const endpointMetrics = metrics.endpoints.get(endpoint) || {
            count: 0,
            totalTime: 0,
            errors: 0,
        };
        endpointMetrics.count++;
        endpointMetrics.totalTime += duration;
        if (statusCode >= 400) {
            endpointMetrics.errors++;
        }
        metrics.endpoints.set(endpoint, endpointMetrics);
        // Actualizar conteo de status codes
        metrics.statusCodes.set(statusCode, (metrics.statusCodes.get(statusCode) || 0) + 1);
        // Log según nivel
        if (statusCode >= 500) {
            logger_1.default.error(`${endpoint} - ${statusCode} - ${duration}ms - Error del servidor`);
        }
        else if (statusCode >= 400) {
            logger_1.default.warn(`${endpoint} - ${statusCode} - ${duration}ms - Error del cliente`);
        }
        else if (duration > 1000) {
            logger_1.default.warn(`${endpoint} - ${statusCode} - ${duration}ms - Respuesta lenta`);
        }
        else {
            logger_1.default.http(`${endpoint} - ${statusCode} - ${duration}ms`);
        }
    });
    next();
};
exports.monitoringMiddleware = monitoringMiddleware;
/**
 * Obtener métricas actuales
 */
const getMetrics = () => {
    const endpointArray = Array.from(metrics.endpoints.entries()).map(([endpoint, data]) => ({
        endpoint,
        count: data.count,
        avgTime: Math.round(data.totalTime / data.count),
        errors: data.errors,
        errorRate: `${((data.errors / data.count) * 100).toFixed(2)}%`,
    }));
    const statusCodesArray = Array.from(metrics.statusCodes.entries())
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count);
    return {
        totalRequests: metrics.totalRequests,
        successfulRequests: metrics.successfulRequests,
        failedRequests: metrics.failedRequests,
        averageResponseTime: Math.round(metrics.averageResponseTime),
        endpoints: endpointArray.sort((a, b) => b.count - a.count),
        statusCodes: statusCodesArray,
    };
};
exports.getMetrics = getMetrics;
/**
 * Resetear métricas (útil para testing o rotación)
 */
const resetMetrics = () => {
    metrics.totalRequests = 0;
    metrics.successfulRequests = 0;
    metrics.failedRequests = 0;
    metrics.averageResponseTime = 0;
    metrics.endpoints.clear();
    metrics.statusCodes.clear();
    logger_1.default.info('Métricas reseteadas');
};
exports.resetMetrics = resetMetrics;
