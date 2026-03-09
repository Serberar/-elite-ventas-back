import client from 'prom-client';

// Recolectar métricas por defecto del sistema (CPU, memoria, etc.)
client.collectDefaultMetrics();

// ==================== Métricas HTTP ====================

export const totalRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Número total de peticiones recibidas',
});

export const successfulRequests = new client.Counter({
  name: 'http_requests_successful_total',
  help: 'Peticiones que respondieron 2xx',
});

export const failedRequests = new client.Counter({
  name: 'http_requests_failed_total',
  help: 'Peticiones que respondieron 4xx o 5xx',
});

export const responseTime = new client.Histogram({
  name: 'http_response_time_seconds',
  help: 'Tiempo de respuesta del servidor',
  buckets: [0.01, 0.05, 0.1, 0.3, 1, 5],
});

// ==================== Métricas de Base de Datos ====================

export const dbQueryCount = new client.Counter({
  name: 'db_query_count_total',
  help: 'Total de queries ejecutadas en la base de datos',
});

export const dbErrors = new client.Counter({
  name: 'db_errors_total',
  help: 'Errores de base de datos',
});

export const dbSlowQueries = new client.Counter({
  name: 'db_slow_queries_total',
  help: 'Consultas lentas (>1000ms)',
});

export const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duración de las queries de base de datos',
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 5],
});

export const dbConnectionsActive = new client.Gauge({
  name: 'db_connections_active',
  help: 'Número de conexiones activas a la base de datos',
});

// ==================== Función para exponer métricas ====================

/**
 * Función para recolectar todas las métricas en formato Prometheus
 * Esta es la función que debe usarse en el endpoint /metrics
 */
export const collectMetrics = async () => {
  return await client.register.metrics();
};
