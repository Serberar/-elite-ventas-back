"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTracing = initializeTracing;
exports.shutdownTracing = shutdownTracing;
exports.getTracingConfig = getTracingConfig;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const logger_1 = __importDefault(require("../../observability/logger/logger"));
/**
 * Configuración de OpenTelemetry para Tracing Distribuido
 * Compatible con Jaeger, Zipkin, y otros backends OTLP
 */
// Estado de inicialización
let sdkInitialized = false;
let sdk = null;
/**
 * Inicializa OpenTelemetry
 * @returns true si se inicializó correctamente, false en caso contrario
 */
function initializeTracing() {
    const tracingEnabled = process.env.ENABLE_TRACING === 'true';
    if (!tracingEnabled) {
        logger_1.default.info('OpenTelemetry tracing está deshabilitado');
        return false;
    }
    if (sdkInitialized) {
        logger_1.default.warn('OpenTelemetry ya está inicializado');
        return false;
    }
    try {
        // Configuración del servicio (leer en tiempo de inicialización)
        const serviceName = process.env.OTEL_SERVICE_NAME || 'crm-backend';
        const serviceVersion = process.env.npm_package_version || '1.0.0';
        const environment = process.env.NODE_ENV || 'development';
        const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';
        /**
         * Configuración del exporter OTLP
         */
        const traceExporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
            url: otlpEndpoint,
            headers: {
            // Headers personalizados si es necesario (autenticación, etc.)
            },
        });
        /**
         * Configuración del SDK de OpenTelemetry
         */
        sdk = new sdk_node_1.NodeSDK({
            serviceName,
            traceExporter,
            instrumentations: [
                (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
                    // Configuración de auto-instrumentación
                    '@opentelemetry/instrumentation-http': {
                        enabled: true,
                        // Ignorar health checks para reducir ruido
                        ignoreIncomingRequestHook: (request) => {
                            const url = request.url || '';
                            return url.includes('/health') || url.includes('/metrics');
                        },
                        // Headers personalizados en spans
                        requestHook: (span, request) => {
                            if ('headers' in request && request.headers) {
                                const headers = request.headers;
                                span.setAttribute('http.user_agent', headers['user-agent'] || 'unknown');
                            }
                        },
                    },
                    '@opentelemetry/instrumentation-express': {
                        enabled: true,
                    },
                    '@opentelemetry/instrumentation-pg': {
                        enabled: true,
                        // Capturar queries SQL (cuidado en producción con datos sensibles)
                        enhancedDatabaseReporting: environment !== 'production',
                    },
                    '@opentelemetry/instrumentation-fs': {
                        enabled: false, // Desactivado para reducir overhead
                    },
                    '@opentelemetry/instrumentation-dns': {
                        enabled: false,
                    },
                }),
            ],
        });
        sdk.start();
        sdkInitialized = true;
        logger_1.default.info(`OpenTelemetry tracing inicializado`);
        logger_1.default.info(`   ├─ Service: ${serviceName} v${serviceVersion}`);
        logger_1.default.info(`   ├─ Environment: ${environment}`);
        logger_1.default.info(`   └─ Exporter: ${otlpEndpoint}`);
        // Manejo de shutdown limpio
        process.on('SIGTERM', () => {
            void (async () => {
                try {
                    if (sdk) {
                        await sdk.shutdown();
                        logger_1.default.info('OpenTelemetry tracing finalizado');
                    }
                }
                catch (error) {
                    logger_1.default.error('Error al finalizar OpenTelemetry:', error);
                }
            })();
        });
        return true;
    }
    catch (error) {
        logger_1.default.error('Error inicializando OpenTelemetry:', error);
        // No lanzar error para no bloquear el arranque del servidor
        return false;
    }
}
/**
 * Shutdown manual de tracing
 */
async function shutdownTracing() {
    if (!sdk)
        return;
    try {
        await sdk.shutdown();
        sdkInitialized = false;
        sdk = null;
        logger_1.default.info('OpenTelemetry tracing finalizado');
    }
    catch (error) {
        logger_1.default.error('Error al finalizar OpenTelemetry:', error);
    }
}
/**
 * Obtener configuración actual
 * @returns Configuración de tracing o null si no está inicializado
 */
function getTracingConfig() {
    const tracingEnabled = process.env.ENABLE_TRACING === 'true';
    const serviceName = process.env.OTEL_SERVICE_NAME || 'crm-backend';
    const serviceVersion = process.env.npm_package_version || '1.0.0';
    const environment = process.env.NODE_ENV || 'development';
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';
    if (!sdkInitialized) {
        return null;
    }
    return {
        enabled: tracingEnabled,
        serviceName,
        serviceVersion,
        environment,
        endpoint: otlpEndpoint,
    };
}
exports.default = {
    initialize: initializeTracing,
    shutdown: shutdownTracing,
    getConfig: getTracingConfig,
};
