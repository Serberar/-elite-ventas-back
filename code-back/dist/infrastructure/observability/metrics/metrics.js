"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectMetrics = exports.dbConnectionsActive = exports.dbQueryDuration = exports.dbSlowQueries = exports.dbErrors = exports.dbQueryCount = exports.responseTime = exports.failedRequests = exports.successfulRequests = exports.totalRequests = void 0;
const prom_client_1 = __importDefault(require("prom-client"));
// Recolectar métricas por defecto del sistema (CPU, memoria, etc.)
prom_client_1.default.collectDefaultMetrics();
// ==================== Métricas HTTP ====================
exports.totalRequests = new prom_client_1.default.Counter({
    name: 'http_requests_total',
    help: 'Número total de peticiones recibidas',
});
exports.successfulRequests = new prom_client_1.default.Counter({
    name: 'http_requests_successful_total',
    help: 'Peticiones que respondieron 2xx',
});
exports.failedRequests = new prom_client_1.default.Counter({
    name: 'http_requests_failed_total',
    help: 'Peticiones que respondieron 4xx o 5xx',
});
exports.responseTime = new prom_client_1.default.Histogram({
    name: 'http_response_time_seconds',
    help: 'Tiempo de respuesta del servidor',
    buckets: [0.01, 0.05, 0.1, 0.3, 1, 5],
});
// ==================== Métricas de Base de Datos ====================
exports.dbQueryCount = new prom_client_1.default.Counter({
    name: 'db_query_count_total',
    help: 'Total de queries ejecutadas en la base de datos',
});
exports.dbErrors = new prom_client_1.default.Counter({
    name: 'db_errors_total',
    help: 'Errores de base de datos',
});
exports.dbSlowQueries = new prom_client_1.default.Counter({
    name: 'db_slow_queries_total',
    help: 'Consultas lentas (>1000ms)',
});
exports.dbQueryDuration = new prom_client_1.default.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duración de las queries de base de datos',
    buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 5],
});
exports.dbConnectionsActive = new prom_client_1.default.Gauge({
    name: 'db_connections_active',
    help: 'Número de conexiones activas a la base de datos',
});
// ==================== Función para exponer métricas ====================
/**
 * Función para recolectar todas las métricas en formato Prometheus
 * Esta es la función que debe usarse en el endpoint /metrics
 */
const collectMetrics = async () => {
    return await prom_client_1.default.register.metrics();
};
exports.collectMetrics = collectMetrics;
