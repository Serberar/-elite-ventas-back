import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import logger from '@infrastructure/observability/logger/logger';

/**
 * Configuración de OpenTelemetry para Tracing Distribuido
 * Compatible con Jaeger, Zipkin, y otros backends OTLP
 */

// Estado de inicialización
let sdkInitialized = false;
let sdk: NodeSDK | null = null;

/**
 * Inicializa OpenTelemetry
 * @returns true si se inicializó correctamente, false en caso contrario
 */
export function initializeTracing(): boolean {
  const tracingEnabled = process.env.ENABLE_TRACING === 'true';

  if (!tracingEnabled) {
    logger.info('OpenTelemetry tracing está deshabilitado');
    return false;
  }

  if (sdkInitialized) {
    logger.warn('OpenTelemetry ya está inicializado');
    return false;
  }

  try {
    // Configuración del servicio (leer en tiempo de inicialización)
    const serviceName = process.env.OTEL_SERVICE_NAME || 'crm-backend';
    const serviceVersion = process.env.npm_package_version || '1.0.0';
    const environment = process.env.NODE_ENV || 'development';
    const otlpEndpoint =
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';

    /**
     * Configuración del exporter OTLP
     */
    const traceExporter = new OTLPTraceExporter({
      url: otlpEndpoint,
      headers: {
        // Headers personalizados si es necesario (autenticación, etc.)
      },
    });

    /**
     * Configuración del SDK de OpenTelemetry
     */
    sdk = new NodeSDK({
      serviceName,
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
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
                const headers = request.headers as Record<string, string | string[] | undefined>;
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

    logger.info(`OpenTelemetry tracing inicializado`);
    logger.info(`   ├─ Service: ${serviceName} v${serviceVersion}`);
    logger.info(`   ├─ Environment: ${environment}`);
    logger.info(`   └─ Exporter: ${otlpEndpoint}`);

    // Manejo de shutdown limpio
    process.on('SIGTERM', () => {
      void (async () => {
        try {
          if (sdk) {
            await sdk.shutdown();
            logger.info('OpenTelemetry tracing finalizado');
          }
        } catch (error) {
          logger.error('Error al finalizar OpenTelemetry:', error);
        }
      })();
    });

    return true;
  } catch (error) {
    logger.error('Error inicializando OpenTelemetry:', error);
    // No lanzar error para no bloquear el arranque del servidor
    return false;
  }
}

/**
 * Shutdown manual de tracing
 */
export async function shutdownTracing(): Promise<void> {
  if (!sdk) return;

  try {
    await sdk.shutdown();
    sdkInitialized = false;
    sdk = null;
    logger.info('OpenTelemetry tracing finalizado');
  } catch (error) {
    logger.error('Error al finalizar OpenTelemetry:', error);
  }
}

/**
 * Obtener configuración actual
 * @returns Configuración de tracing o null si no está inicializado
 */
export function getTracingConfig() {
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

export default {
  initialize: initializeTracing,
  shutdown: shutdownTracing,
  getConfig: getTracingConfig,
};
