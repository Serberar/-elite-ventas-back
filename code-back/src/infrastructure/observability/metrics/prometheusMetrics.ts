import { Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';
import logger from '@infrastructure/observability/logger/logger';

/* ---------------------------------------------
   REGISTRO PRINCIPAL
--------------------------------------------- */

const register = new promClient.Registry();

promClient.collectDefaultMetrics({
  register,
  prefix: 'crm_backend_',
});

/* ---------------------------------------------
   MÉTRICAS DE BASE DE DATOS (PRISMA)
--------------------------------------------- */

export const dbQueriesTotal = new promClient.Counter({
  name: 'crm_backend_db_queries_total',
  help: 'Total number of database queries executed',
  labelNames: ['operation', 'model'],
  registers: [register],
});

export const dbQueryDuration = new promClient.Histogram({
  name: 'crm_backend_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const dbConnectionsActive = new promClient.Gauge({
  name: 'crm_backend_db_connections_active',
  help: 'Active database connections',
  registers: [register],
});

export const dbErrorsTotal = new promClient.Counter({
  name: 'crm_backend_db_errors_total',
  help: 'Total number of database errors',
  labelNames: ['type'],
  registers: [register],
});

/* ---------------------------------------------
   MÉTRICAS HTTP
--------------------------------------------- */

export const httpRequestsTotal = new promClient.Counter({
  name: 'crm_backend_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestDuration = new promClient.Histogram({
  name: 'crm_backend_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
  registers: [register],
});

export const httpRequestsInProgress = new promClient.Gauge({
  name: 'crm_backend_http_requests_in_progress',
  help: 'Requests currently in progress',
  labelNames: ['method', 'route'],
  registers: [register],
});

/* ---------------------------------------------
   MÉTRICAS DE NEGOCIO — DOMINIO POR DOMINIO
--------------------------------------------- */

/* --------- CLIENT --------- */

export const businessClientsCreated = new promClient.Counter({
  name: 'crm_backend_clients_created_total',
  help: 'Total number of clients created',
  registers: [register],
});

/* --------- PRODUCT --------- */

export const businessProductsCreated = new promClient.Counter({
  name: 'crm_backend_products_created_total',
  help: 'Total number of products created',
  registers: [register],
});

export const businessProductsUpdated = new promClient.Counter({
  name: 'crm_backend_products_updated_total',
  help: 'Total number of products updated',
  registers: [register],
});

export const businessProductsToggled = new promClient.Counter({
  name: 'crm_backend_products_toggled_total',
  help: 'Total number of products activated/deactivated',
  registers: [register],
});

export const businessProductsDuplicated = new promClient.Counter({
  name: 'crm_backend_products_duplicated_total',
  help: 'Total number of products duplicated',
  registers: [register],
});

/* --------- SALE --------- */

export const businessSalesCreated = new promClient.Counter({
  name: 'crm_backend_sales_created_total',
  help: 'Total number of sales created',
  registers: [register],
});

export const businessSaleItemsAdded = new promClient.Counter({
  name: 'crm_backend_sale_items_added_total',
  help: 'Total number of sale items added',
  registers: [register],
});

export const businessSaleItemsUpdated = new promClient.Counter({
  name: 'crm_backend_sale_items_updated_total',
  help: 'Total number of sale items updated',
  registers: [register],
});

export const businessSaleItemsDeleted = new promClient.Counter({
  name: 'crm_backend_sale_items_deleted_total',
  help: 'Total number of sale items deleted',
  registers: [register],
});

export const businessSaleStatusChanged = new promClient.Counter({
  name: 'crm_backend_sale_status_changed_total',
  help: 'Total number of sale status changes',
  registers: [register],
});

/* --------- SALE STATUS --------- */

export const businessSaleStatusCreated = new promClient.Counter({
  name: 'crm_backend_sale_status_created_total',
  help: 'Total sale statuses created',
  registers: [register],
});

export const businessSaleStatusUpdated = new promClient.Counter({
  name: 'crm_backend_sale_status_updated_total',
  help: 'Total sale statuses updated',
  registers: [register],
});

export const businessSaleStatusReordered = new promClient.Counter({
  name: 'crm_backend_sale_status_reordered_total',
  help: 'Total sale statuses reordered',
  registers: [register],
});

/* ---------------------------------------------
   MÉTRICAS DE ERRORES
--------------------------------------------- */

export const errorsTotal = new promClient.Counter({
  name: 'crm_backend_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'status_code'],
  registers: [register],
});

/* ---------------------------------------------
   CIRCUIT BREAKER
--------------------------------------------- */

export const circuitBreakerCalls = new promClient.Counter({
  name: 'crm_backend_circuit_breaker_calls_total',
  help: 'Circuit breaker calls',
  labelNames: ['name', 'result'],
  registers: [register],
});

export const circuitBreakerState = new promClient.Gauge({
  name: 'crm_backend_circuit_breaker_state',
  help: 'State of circuit breaker (0=closed, 1=half-open, 2=open)',
  labelNames: ['name'],
  registers: [register],
});

/* ---------------------------------------------
   MIDDLEWARE / HELPERS
--------------------------------------------- */

export function prometheusMiddleware(req: Request, res: Response, next: NextFunction) {
  const route = normalizeRoute(req.path);
  const method = req.method;

  httpRequestsInProgress.labels(method, route).inc();
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode.toString();

    httpRequestsInProgress.labels(method, route).dec();
    httpRequestsTotal.labels(method, route, statusCode).inc();
    httpRequestDuration.labels(method, route, statusCode).observe(duration);

    if (res.statusCode >= 400) {
      const type = res.statusCode >= 500 ? 'server_error' : 'client_error';
      errorsTotal.labels(type, statusCode).inc();
    }
  });

  next();
}

export async function metricsHandler(req: Request, res: Response) {
  try {
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
  } catch (err) {
    logger.error('Error generating metrics:', err);
    res.status(500).send('Error generating metrics');
  }
}

function normalizeRoute(path: string): string {
  const patterns = [
    { regex: /\/api\/products\/[a-f0-9-]{36}/gi, replacement: '/api/products/:id' },
    { regex: /\/api\/sales\/[a-f0-9-]{36}/gi, replacement: '/api/sales/:id' },
    { regex: /\/api\/sale-status\/[a-f0-9-]{36}/gi, replacement: '/api/sale-status/:id' },
    { regex: /\/api\/clients\/[a-f0-9-]{36}/gi, replacement: '/api/clients/:id' },
  ];

  let normalized = path;
  for (const p of patterns) normalized = normalized.replace(p.regex, p.replacement);
  return normalized;
}

export function getRegistry() {
  return register;
}

export function clearMetrics() {
  register.clear();
}

// Auth metrics (added automatically by diagnose_and_fix.sh)
export const authLoginAttempts = new promClient.Counter({
  name: 'crm_backend_auth_login_attempts_total',
  help: 'Total login attempts',
  labelNames: ['result'],
  registers: [register],
});

export const authTokensGenerated = new promClient.Counter({
  name: 'crm_backend_auth_tokens_generated_total',
  help: 'Tokens generated',
  labelNames: ['type'],
  registers: [register],
});

/* ---------------------------------------------
   OBJETO AGRUPADO PARA IMPORTACIÓN CONVENIENTE
--------------------------------------------- */

export const prometheusMetrics = {
  // Registry
  getRegistry,
  clearMetrics,

  // Middleware
  prometheusMiddleware,
  metricsHandler,

  // Database metrics
  dbQueriesTotal,
  dbQueryDuration,
  dbConnectionsActive,
  dbErrorsTotal,

  // HTTP metrics
  httpRequestsTotal,
  httpRequestDuration,
  httpRequestsInProgress,

  // Business metrics - Client
  businessClientsCreated,

  // Business metrics - Product
  businessProductsCreated,
  businessProductsUpdated,
  businessProductsToggled,
  businessProductsDuplicated,

  // Business metrics - Sale
  businessSalesCreated,
  businessSaleItemsAdded,
  businessSaleItemsUpdated,
  businessSaleItemsDeleted,
  businessSaleStatusChanged,

  // Business metrics - Sale Status
  businessSaleStatusCreated,
  businessSaleStatusUpdated,
  businessSaleStatusReordered,

  // Error metrics
  errorsTotal,

  // Circuit Breaker metrics
  circuitBreakerCalls,
  circuitBreakerState,
  recordCircuitBreakerCall: (name: string, result: string) => {
    circuitBreakerCalls.labels(name, result).inc();
  },
  recordCircuitBreakerStateChange: (name: string, state: 'open' | 'half-open' | 'closed') => {
    const stateValue = state === 'open' ? 2 : state === 'half-open' ? 1 : 0;
    circuitBreakerState.labels(name).set(stateValue);
  },

  // Auth metrics
  authLoginAttempts,
  authTokensGenerated,
};
