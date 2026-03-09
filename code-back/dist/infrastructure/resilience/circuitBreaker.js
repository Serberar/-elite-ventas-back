"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CIRCUIT_BREAKER_CONFIGS = void 0;
exports.createCircuitBreaker = createCircuitBreaker;
exports.createHttpCircuitBreaker = createHttpCircuitBreaker;
exports.createDatabaseCircuitBreaker = createDatabaseCircuitBreaker;
exports.getCircuitBreakerStats = getCircuitBreakerStats;
const opossum_1 = __importDefault(require("opossum"));
const logger_1 = __importDefault(require("../observability/logger/logger"));
const prometheusMetrics_1 = require("../observability/metrics/prometheusMetrics");
exports.CIRCUIT_BREAKER_CONFIGS = {
    externalApi: {
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        name: 'external-api',
        enableMetrics: true,
    },
    database: {
        timeout: 3000,
        errorThresholdPercentage: 60,
        resetTimeout: 10000,
        name: 'database',
        enableMetrics: true,
    },
    cache: {
        timeout: 1000,
        errorThresholdPercentage: 70,
        resetTimeout: 5000,
        name: 'cache',
        enableMetrics: true,
    },
    notification: {
        timeout: 10000,
        errorThresholdPercentage: 40,
        resetTimeout: 60000,
        name: 'notification',
        enableMetrics: true,
    },
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createCircuitBreaker(// eslint-disable-line no-unused-vars
action, config) {
    const breaker = new opossum_1.default(action, {
        timeout: config.timeout,
        errorThresholdPercentage: config.errorThresholdPercentage,
        resetTimeout: config.resetTimeout,
        name: config.name,
    });
    breaker.on('open', () => {
        logger_1.default.warn(`Circuit Breaker OPEN: ${config.name}`);
        if (config.enableMetrics) {
            prometheusMetrics_1.prometheusMetrics.recordCircuitBreakerStateChange(config.name, 'open');
        }
    });
    breaker.on('halfOpen', () => {
        logger_1.default.info(`Circuit Breaker HALF-OPEN: ${config.name}`);
        if (config.enableMetrics) {
            prometheusMetrics_1.prometheusMetrics.recordCircuitBreakerStateChange(config.name, 'half-open');
        }
    });
    breaker.on('close', () => {
        logger_1.default.info(`Circuit Breaker CLOSED: ${config.name}`);
        if (config.enableMetrics) {
            prometheusMetrics_1.prometheusMetrics.recordCircuitBreakerStateChange(config.name, 'closed');
        }
    });
    breaker.on('success', () => {
        if (config.enableMetrics) {
            prometheusMetrics_1.prometheusMetrics.recordCircuitBreakerCall(config.name, 'success');
        }
    });
    breaker.on('failure', (err) => {
        logger_1.default.error(`Circuit Breaker failure in ${config.name}:`, err.message);
        if (config.enableMetrics) {
            prometheusMetrics_1.prometheusMetrics.recordCircuitBreakerCall(config.name, 'failure');
        }
    });
    breaker.on('timeout', () => {
        if (config.enableMetrics) {
            prometheusMetrics_1.prometheusMetrics.recordCircuitBreakerCall(config.name, 'timeout');
        }
    });
    breaker.on('reject', () => {
        if (config.enableMetrics) {
            prometheusMetrics_1.prometheusMetrics.recordCircuitBreakerCall(config.name, 'rejected');
        }
    });
    if (config.fallback)
        breaker.fallback(config.fallback);
    return breaker;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createHttpCircuitBreaker(// eslint-disable-line no-unused-vars
httpClient, serviceName) {
    return createCircuitBreaker(httpClient, {
        ...exports.CIRCUIT_BREAKER_CONFIGS.externalApi,
        name: `http-${serviceName}`,
        fallback: () => {
            throw new Error(`Service ${serviceName} is temporarily unavailable`);
        },
    });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createDatabaseCircuitBreaker(// eslint-disable-line no-unused-vars
dbOperation, operationName) {
    return createCircuitBreaker(dbOperation, {
        ...exports.CIRCUIT_BREAKER_CONFIGS.database,
        name: `db-${operationName}`,
        fallback: () => {
            throw new Error(`Database operation ${operationName} is temporarily unavailable`);
        },
    });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCircuitBreakerStats(breaker) {
    return {
        name: breaker.name,
        state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
        stats: breaker.stats,
        status: breaker.status,
    };
}
