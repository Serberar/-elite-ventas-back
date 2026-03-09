"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prometheusMetrics = exports.authTokensGenerated = exports.authLoginAttempts = exports.circuitBreakerState = exports.circuitBreakerCalls = exports.errorsTotal = exports.businessSaleStatusReordered = exports.businessSaleStatusUpdated = exports.businessSaleStatusCreated = exports.businessSaleStatusChanged = exports.businessSaleItemsDeleted = exports.businessSaleItemsUpdated = exports.businessSaleItemsAdded = exports.businessSalesCreated = exports.businessProductsDuplicated = exports.businessProductsToggled = exports.businessProductsUpdated = exports.businessProductsCreated = exports.businessClientsCreated = exports.httpRequestsInProgress = exports.httpRequestDuration = exports.httpRequestsTotal = exports.dbErrorsTotal = exports.dbConnectionsActive = exports.dbQueryDuration = exports.dbQueriesTotal = void 0;
exports.prometheusMiddleware = prometheusMiddleware;
exports.metricsHandler = metricsHandler;
exports.getRegistry = getRegistry;
exports.clearMetrics = clearMetrics;
const prom_client_1 = __importDefault(require("prom-client"));
const logger_1 = __importDefault(require("../../observability/logger/logger"));
/* ---------------------------------------------
   REGISTRO PRINCIPAL
--------------------------------------------- */
const register = new prom_client_1.default.Registry();
prom_client_1.default.collectDefaultMetrics({
    register,
    prefix: 'crm_backend_',
});
/* ---------------------------------------------
   MÉTRICAS DE BASE DE DATOS (PRISMA)
--------------------------------------------- */
exports.dbQueriesTotal = new prom_client_1.default.Counter({
    name: 'crm_backend_db_queries_total',
    help: 'Total number of database queries executed',
    labelNames: ['operation', 'model'],
    registers: [register],
});
exports.dbQueryDuration = new prom_client_1.default.Histogram({
    name: 'crm_backend_db_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'model'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [register],
});
exports.dbConnectionsActive = new prom_client_1.default.Gauge({
    name: 'crm_backend_db_connections_active',
    help: 'Active database connections',
    registers: [register],
});
exports.dbErrorsTotal = new prom_client_1.default.Counter({
    name: 'crm_backend_db_errors_total',
    help: 'Total number of database errors',
    labelNames: ['type'],
    registers: [register],
});
/* ---------------------------------------------
   MÉTRICAS HTTP
--------------------------------------------- */
exports.httpRequestsTotal = new prom_client_1.default.Counter({
    name: 'crm_backend_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});
exports.httpRequestDuration = new prom_client_1.default.Histogram({
    name: 'crm_backend_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
    registers: [register],
});
exports.httpRequestsInProgress = new prom_client_1.default.Gauge({
    name: 'crm_backend_http_requests_in_progress',
    help: 'Requests currently in progress',
    labelNames: ['method', 'route'],
    registers: [register],
});
/* ---------------------------------------------
   MÉTRICAS DE NEGOCIO — DOMINIO POR DOMINIO
--------------------------------------------- */
/* --------- CLIENT --------- */
exports.businessClientsCreated = new prom_client_1.default.Counter({
    name: 'crm_backend_clients_created_total',
    help: 'Total number of clients created',
    registers: [register],
});
/* --------- PRODUCT --------- */
exports.businessProductsCreated = new prom_client_1.default.Counter({
    name: 'crm_backend_products_created_total',
    help: 'Total number of products created',
    registers: [register],
});
exports.businessProductsUpdated = new prom_client_1.default.Counter({
    name: 'crm_backend_products_updated_total',
    help: 'Total number of products updated',
    registers: [register],
});
exports.businessProductsToggled = new prom_client_1.default.Counter({
    name: 'crm_backend_products_toggled_total',
    help: 'Total number of products activated/deactivated',
    registers: [register],
});
exports.businessProductsDuplicated = new prom_client_1.default.Counter({
    name: 'crm_backend_products_duplicated_total',
    help: 'Total number of products duplicated',
    registers: [register],
});
/* --------- SALE --------- */
exports.businessSalesCreated = new prom_client_1.default.Counter({
    name: 'crm_backend_sales_created_total',
    help: 'Total number of sales created',
    registers: [register],
});
exports.businessSaleItemsAdded = new prom_client_1.default.Counter({
    name: 'crm_backend_sale_items_added_total',
    help: 'Total number of sale items added',
    registers: [register],
});
exports.businessSaleItemsUpdated = new prom_client_1.default.Counter({
    name: 'crm_backend_sale_items_updated_total',
    help: 'Total number of sale items updated',
    registers: [register],
});
exports.businessSaleItemsDeleted = new prom_client_1.default.Counter({
    name: 'crm_backend_sale_items_deleted_total',
    help: 'Total number of sale items deleted',
    registers: [register],
});
exports.businessSaleStatusChanged = new prom_client_1.default.Counter({
    name: 'crm_backend_sale_status_changed_total',
    help: 'Total number of sale status changes',
    registers: [register],
});
/* --------- SALE STATUS --------- */
exports.businessSaleStatusCreated = new prom_client_1.default.Counter({
    name: 'crm_backend_sale_status_created_total',
    help: 'Total sale statuses created',
    registers: [register],
});
exports.businessSaleStatusUpdated = new prom_client_1.default.Counter({
    name: 'crm_backend_sale_status_updated_total',
    help: 'Total sale statuses updated',
    registers: [register],
});
exports.businessSaleStatusReordered = new prom_client_1.default.Counter({
    name: 'crm_backend_sale_status_reordered_total',
    help: 'Total sale statuses reordered',
    registers: [register],
});
/* ---------------------------------------------
   MÉTRICAS DE ERRORES
--------------------------------------------- */
exports.errorsTotal = new prom_client_1.default.Counter({
    name: 'crm_backend_errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'status_code'],
    registers: [register],
});
/* ---------------------------------------------
   CIRCUIT BREAKER
--------------------------------------------- */
exports.circuitBreakerCalls = new prom_client_1.default.Counter({
    name: 'crm_backend_circuit_breaker_calls_total',
    help: 'Circuit breaker calls',
    labelNames: ['name', 'result'],
    registers: [register],
});
exports.circuitBreakerState = new prom_client_1.default.Gauge({
    name: 'crm_backend_circuit_breaker_state',
    help: 'State of circuit breaker (0=closed, 1=half-open, 2=open)',
    labelNames: ['name'],
    registers: [register],
});
/* ---------------------------------------------
   MIDDLEWARE / HELPERS
--------------------------------------------- */
function prometheusMiddleware(req, res, next) {
    const route = normalizeRoute(req.path);
    const method = req.method;
    exports.httpRequestsInProgress.labels(method, route).inc();
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const statusCode = res.statusCode.toString();
        exports.httpRequestsInProgress.labels(method, route).dec();
        exports.httpRequestsTotal.labels(method, route, statusCode).inc();
        exports.httpRequestDuration.labels(method, route, statusCode).observe(duration);
        if (res.statusCode >= 400) {
            const type = res.statusCode >= 500 ? 'server_error' : 'client_error';
            exports.errorsTotal.labels(type, statusCode).inc();
        }
    });
    next();
}
async function metricsHandler(req, res) {
    try {
        res.set('Content-Type', register.contentType);
        res.send(await register.metrics());
    }
    catch (err) {
        logger_1.default.error('Error generating metrics:', err);
        res.status(500).send('Error generating metrics');
    }
}
function normalizeRoute(path) {
    const patterns = [
        { regex: /\/api\/products\/[a-f0-9-]{36}/gi, replacement: '/api/products/:id' },
        { regex: /\/api\/sales\/[a-f0-9-]{36}/gi, replacement: '/api/sales/:id' },
        { regex: /\/api\/sale-status\/[a-f0-9-]{36}/gi, replacement: '/api/sale-status/:id' },
        { regex: /\/api\/clients\/[a-f0-9-]{36}/gi, replacement: '/api/clients/:id' },
    ];
    let normalized = path;
    for (const p of patterns)
        normalized = normalized.replace(p.regex, p.replacement);
    return normalized;
}
function getRegistry() {
    return register;
}
function clearMetrics() {
    register.clear();
}
// Auth metrics (added automatically by diagnose_and_fix.sh)
exports.authLoginAttempts = new prom_client_1.default.Counter({
    name: 'crm_backend_auth_login_attempts_total',
    help: 'Total login attempts',
    labelNames: ['result'],
    registers: [register],
});
exports.authTokensGenerated = new prom_client_1.default.Counter({
    name: 'crm_backend_auth_tokens_generated_total',
    help: 'Tokens generated',
    labelNames: ['type'],
    registers: [register],
});
/* ---------------------------------------------
   OBJETO AGRUPADO PARA IMPORTACIÓN CONVENIENTE
--------------------------------------------- */
exports.prometheusMetrics = {
    // Registry
    getRegistry,
    clearMetrics,
    // Middleware
    prometheusMiddleware,
    metricsHandler,
    // Database metrics
    dbQueriesTotal: exports.dbQueriesTotal,
    dbQueryDuration: exports.dbQueryDuration,
    dbConnectionsActive: exports.dbConnectionsActive,
    dbErrorsTotal: exports.dbErrorsTotal,
    // HTTP metrics
    httpRequestsTotal: exports.httpRequestsTotal,
    httpRequestDuration: exports.httpRequestDuration,
    httpRequestsInProgress: exports.httpRequestsInProgress,
    // Business metrics - Client
    businessClientsCreated: exports.businessClientsCreated,
    // Business metrics - Product
    businessProductsCreated: exports.businessProductsCreated,
    businessProductsUpdated: exports.businessProductsUpdated,
    businessProductsToggled: exports.businessProductsToggled,
    businessProductsDuplicated: exports.businessProductsDuplicated,
    // Business metrics - Sale
    businessSalesCreated: exports.businessSalesCreated,
    businessSaleItemsAdded: exports.businessSaleItemsAdded,
    businessSaleItemsUpdated: exports.businessSaleItemsUpdated,
    businessSaleItemsDeleted: exports.businessSaleItemsDeleted,
    businessSaleStatusChanged: exports.businessSaleStatusChanged,
    // Business metrics - Sale Status
    businessSaleStatusCreated: exports.businessSaleStatusCreated,
    businessSaleStatusUpdated: exports.businessSaleStatusUpdated,
    businessSaleStatusReordered: exports.businessSaleStatusReordered,
    // Error metrics
    errorsTotal: exports.errorsTotal,
    // Circuit Breaker metrics
    circuitBreakerCalls: exports.circuitBreakerCalls,
    circuitBreakerState: exports.circuitBreakerState,
    recordCircuitBreakerCall: (name, result) => {
        exports.circuitBreakerCalls.labels(name, result).inc();
    },
    recordCircuitBreakerStateChange: (name, state) => {
        const stateValue = state === 'open' ? 2 : state === 'half-open' ? 1 : 0;
        exports.circuitBreakerState.labels(name).set(stateValue);
    },
    // Auth metrics
    authLoginAttempts: exports.authLoginAttempts,
    authTokensGenerated: exports.authTokensGenerated,
};
