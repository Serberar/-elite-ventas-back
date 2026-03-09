"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const opentelemetry_1 = __importDefault(require("../../infrastructure/observability/tracing/opentelemetry"));
describe('OpenTelemetry Tracing', () => {
    beforeEach(async () => {
        // Shutdown anterior si existe
        await opentelemetry_1.default.shutdown();
        // Resetear variables de entorno antes de cada test
        delete process.env.ENABLE_TRACING;
        delete process.env.OTEL_SERVICE_NAME;
        delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    });
    afterEach(async () => {
        // Limpiar después de cada test
        await opentelemetry_1.default.shutdown();
        jest.clearAllMocks();
    });
    describe('initialize', () => {
        it('should not initialize SDK when ENABLE_TRACING is false', () => {
            process.env.ENABLE_TRACING = 'false';
            const result = opentelemetry_1.default.initialize();
            expect(result).toBe(false);
        });
        it('should not initialize SDK when ENABLE_TRACING is not set', () => {
            const result = opentelemetry_1.default.initialize();
            expect(result).toBe(false);
        });
        it('should initialize SDK when ENABLE_TRACING is true', () => {
            process.env.ENABLE_TRACING = 'true';
            process.env.OTEL_SERVICE_NAME = 'crm-backend-test';
            process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
            const result = opentelemetry_1.default.initialize();
            expect(result).toBe(true);
        });
        it('should use default service name when not provided', () => {
            process.env.ENABLE_TRACING = 'true';
            process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
            const result = opentelemetry_1.default.initialize();
            expect(result).toBe(true);
        });
        it('should use default OTLP endpoint when not provided', () => {
            process.env.ENABLE_TRACING = 'true';
            process.env.OTEL_SERVICE_NAME = 'crm-backend-test';
            const result = opentelemetry_1.default.initialize();
            expect(result).toBe(true);
        });
        it('should not initialize SDK multiple times', () => {
            process.env.ENABLE_TRACING = 'true';
            process.env.OTEL_SERVICE_NAME = 'crm-backend-test';
            const result1 = opentelemetry_1.default.initialize();
            const result2 = opentelemetry_1.default.initialize();
            expect(result1).toBe(true);
            expect(result2).toBe(false); // Second call should return false
        });
    });
    describe('shutdown', () => {
        it('should shutdown gracefully when SDK is not initialized', async () => {
            await expect(opentelemetry_1.default.shutdown()).resolves.not.toThrow();
        });
        it('should shutdown SDK when initialized', async () => {
            process.env.ENABLE_TRACING = 'true';
            process.env.OTEL_SERVICE_NAME = 'crm-backend-test';
            opentelemetry_1.default.initialize();
            await expect(opentelemetry_1.default.shutdown()).resolves.not.toThrow();
        });
        it('should handle multiple shutdown calls gracefully', async () => {
            process.env.ENABLE_TRACING = 'true';
            process.env.OTEL_SERVICE_NAME = 'crm-backend-test';
            opentelemetry_1.default.initialize();
            await opentelemetry_1.default.shutdown();
            await expect(opentelemetry_1.default.shutdown()).resolves.not.toThrow();
        });
    });
    describe('getConfig', () => {
        it('should return null when SDK is not initialized', () => {
            const config = opentelemetry_1.default.getConfig();
            expect(config).toBeNull();
        });
        it('should return configuration when SDK is initialized', () => {
            process.env.ENABLE_TRACING = 'true';
            process.env.OTEL_SERVICE_NAME = 'crm-backend-test';
            process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318/v1/traces';
            opentelemetry_1.default.initialize();
            const config = opentelemetry_1.default.getConfig();
            expect(config).not.toBeNull();
            expect(config).toHaveProperty('serviceName', 'crm-backend-test');
            expect(config).toHaveProperty('endpoint', 'http://localhost:4318/v1/traces');
            expect(config).toHaveProperty('enabled', true);
        });
        it('should return correct default values in configuration', () => {
            process.env.ENABLE_TRACING = 'true';
            opentelemetry_1.default.initialize();
            const config = opentelemetry_1.default.getConfig();
            expect(config).not.toBeNull();
            expect(config).toHaveProperty('serviceName', 'crm-backend');
            expect(config).toHaveProperty('endpoint', 'http://localhost:4318/v1/traces');
            expect(config).toHaveProperty('enabled', true);
        });
    });
    describe('Integration', () => {
        it('should handle full lifecycle: initialize -> get config -> shutdown', async () => {
            process.env.ENABLE_TRACING = 'true';
            process.env.OTEL_SERVICE_NAME = 'crm-backend-integration';
            process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318/v1/traces';
            // Initialize
            const initialized = opentelemetry_1.default.initialize();
            expect(initialized).toBe(true);
            // Get config
            const config = opentelemetry_1.default.getConfig();
            expect(config).not.toBeNull();
            expect(config?.serviceName).toBe('crm-backend-integration');
            // Shutdown
            await expect(opentelemetry_1.default.shutdown()).resolves.not.toThrow();
            // Config should be null after shutdown
            const configAfterShutdown = opentelemetry_1.default.getConfig();
            expect(configAfterShutdown).toBeNull();
        });
    });
});
