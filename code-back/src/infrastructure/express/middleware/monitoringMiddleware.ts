import { Request, Response, NextFunction } from 'express';
import logger from '@infrastructure/observability/logger/logger';

// Métricas en memoria (en producción usar Redis o Prometheus)
interface Metrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  endpoints: Map<
    string,
    {
      count: number;
      totalTime: number;
      errors: number;
    }
  >;
  statusCodes: Map<number, number>;
}

const metrics: Metrics = {
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
export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Obtener la ruta de forma segura
  let routePath = req.path;
  if (req.route) {
    const route = req.route as unknown;
    if (typeof route === 'object' && route !== null && 'path' in route) {
      const pathValue = (route as { path: unknown }).path;
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
    } else {
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
      logger.error(`${endpoint} - ${statusCode} - ${duration}ms - Error del servidor`);
    } else if (statusCode >= 400) {
      logger.warn(`${endpoint} - ${statusCode} - ${duration}ms - Error del cliente`);
    } else if (duration > 1000) {
      logger.warn(`${endpoint} - ${statusCode} - ${duration}ms - Respuesta lenta`);
    } else {
      logger.http(`${endpoint} - ${statusCode} - ${duration}ms`);
    }
  });

  next();
};

/**
 * Obtener métricas actuales
 */
export const getMetrics = () => {
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

/**
 * Resetear métricas (útil para testing o rotación)
 */
export const resetMetrics = () => {
  metrics.totalRequests = 0;
  metrics.successfulRequests = 0;
  metrics.failedRequests = 0;
  metrics.averageResponseTime = 0;
  metrics.endpoints.clear();
  metrics.statusCodes.clear();

  logger.info('Métricas reseteadas');
};
