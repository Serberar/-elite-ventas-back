"use strict";
/**
 * Tests unitarios para Circuit Breaker
 */
Object.defineProperty(exports, "__esModule", { value: true });
const CircuitBreaker_1 = require("../../infrastructure/resilience/CircuitBreaker");
// Mock del logger para evitar output en tests
jest.mock('@infrastructure/observability/logger/logger', () => {
    return {
        __esModule: true,
        default: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
        },
    };
});
describe('CircuitBreaker', () => {
    let circuitBreaker;
    beforeEach(() => {
        circuitBreaker = new CircuitBreaker_1.CircuitBreaker({
            name: 'test-circuit',
            failureThreshold: 3,
            successThreshold: 2,
            timeout: 1000,
            operationTimeout: 500,
        });
    });
    describe('Initial State', () => {
        it('should start in CLOSED state', () => {
            expect(circuitBreaker.getState()).toBe(CircuitBreaker_1.CircuitState.CLOSED);
        });
        it('should have zero stats initially', () => {
            const stats = circuitBreaker.getStats();
            expect(stats.totalRequests).toBe(0);
            expect(stats.totalFailures).toBe(0);
            expect(stats.totalSuccesses).toBe(0);
            expect(stats.failures).toBe(0);
            expect(stats.successes).toBe(0);
        });
    });
    describe('Successful Operations', () => {
        it('should execute operation successfully when circuit is CLOSED', async () => {
            const result = await circuitBreaker.execute(() => Promise.resolve('success'));
            expect(result).toBe('success');
            expect(circuitBreaker.getState()).toBe(CircuitBreaker_1.CircuitState.CLOSED);
        });
        it('should track successful operations', async () => {
            await circuitBreaker.execute(() => Promise.resolve('success'));
            const stats = circuitBreaker.getStats();
            expect(stats.totalRequests).toBe(1);
            expect(stats.totalSuccesses).toBe(1);
            expect(stats.lastSuccessTime).not.toBeNull();
        });
    });
    describe('Failed Operations', () => {
        it('should track failed operations', async () => {
            await expect(circuitBreaker.execute(() => Promise.reject(new Error('test error')))).rejects.toThrow('test error');
            const stats = circuitBreaker.getStats();
            expect(stats.failures).toBe(1);
            expect(stats.totalFailures).toBe(1);
        });
        it('should open circuit after reaching failure threshold', async () => {
            // Generar 3 fallos (umbral)
            for (let i = 0; i < 3; i++) {
                await expect(circuitBreaker.execute(() => Promise.reject(new Error('error')))).rejects.toThrow('error');
            }
            expect(circuitBreaker.getState()).toBe(CircuitBreaker_1.CircuitState.OPEN);
        });
        it('should reject operations when circuit is OPEN', async () => {
            // Abrir el circuito
            for (let i = 0; i < 3; i++) {
                await expect(circuitBreaker.execute(() => Promise.reject(new Error('error')))).rejects.toThrow();
            }
            // Siguiente operación debe ser rechazada inmediatamente
            await expect(circuitBreaker.execute(() => Promise.resolve('should not execute'))).rejects.toThrow(CircuitBreaker_1.CircuitOpenError);
        });
    });
    describe('Circuit State Transitions', () => {
        it('should transition from OPEN to HALF_OPEN after timeout', async () => {
            // Crear circuito con timeout muy corto
            const fastCircuit = new CircuitBreaker_1.CircuitBreaker({
                name: 'fast-test',
                failureThreshold: 1,
                successThreshold: 1,
                timeout: 50, // 50ms
                operationTimeout: 500,
            });
            // Abrir circuito
            await expect(fastCircuit.execute(() => Promise.reject(new Error('error')))).rejects.toThrow();
            expect(fastCircuit.getState()).toBe(CircuitBreaker_1.CircuitState.OPEN);
            // Esperar timeout
            await new Promise((resolve) => setTimeout(resolve, 100));
            // Intentar operación (debería transicionar a HALF_OPEN)
            await fastCircuit.execute(() => Promise.resolve('success'));
            expect(fastCircuit.getState()).toBe(CircuitBreaker_1.CircuitState.CLOSED);
        });
        it('should close circuit after success threshold in HALF_OPEN', async () => {
            const fastCircuit = new CircuitBreaker_1.CircuitBreaker({
                name: 'fast-test-2',
                failureThreshold: 1,
                successThreshold: 2,
                timeout: 50,
                operationTimeout: 500,
            });
            // Abrir circuito
            await expect(fastCircuit.execute(() => Promise.reject(new Error('error')))).rejects.toThrow();
            // Esperar timeout
            await new Promise((resolve) => setTimeout(resolve, 100));
            // Dos operaciones exitosas
            await fastCircuit.execute(() => Promise.resolve('success 1'));
            await fastCircuit.execute(() => Promise.resolve('success 2'));
            expect(fastCircuit.getState()).toBe(CircuitBreaker_1.CircuitState.CLOSED);
        });
        it('should re-open circuit on failure in HALF_OPEN state', async () => {
            const fastCircuit = new CircuitBreaker_1.CircuitBreaker({
                name: 'fast-test-3',
                failureThreshold: 1,
                successThreshold: 2,
                timeout: 50,
                operationTimeout: 500,
            });
            // Abrir circuito
            await expect(fastCircuit.execute(() => Promise.reject(new Error('error 1')))).rejects.toThrow();
            // Esperar timeout
            await new Promise((resolve) => setTimeout(resolve, 100));
            // Fallo en HALF_OPEN
            await expect(fastCircuit.execute(() => Promise.reject(new Error('error 2')))).rejects.toThrow();
            expect(fastCircuit.getState()).toBe(CircuitBreaker_1.CircuitState.OPEN);
        });
    });
    describe('Manual Controls', () => {
        it('should reset circuit to CLOSED state', async () => {
            // Abrir circuito
            for (let i = 0; i < 3; i++) {
                await expect(circuitBreaker.execute(() => Promise.reject(new Error('error')))).rejects.toThrow();
            }
            expect(circuitBreaker.getState()).toBe(CircuitBreaker_1.CircuitState.OPEN);
            // Reset manual
            circuitBreaker.reset();
            expect(circuitBreaker.getState()).toBe(CircuitBreaker_1.CircuitState.CLOSED);
            // Debería poder ejecutar operaciones
            const result = await circuitBreaker.execute(() => Promise.resolve('after reset'));
            expect(result).toBe('after reset');
        });
        it('should trip circuit to OPEN state', () => {
            expect(circuitBreaker.getState()).toBe(CircuitBreaker_1.CircuitState.CLOSED);
            circuitBreaker.trip();
            expect(circuitBreaker.getState()).toBe(CircuitBreaker_1.CircuitState.OPEN);
        });
    });
    describe('Operation Timeout', () => {
        it('should timeout slow operations', async () => {
            await expect(circuitBreaker.execute(() => new Promise((resolve) => setTimeout(() => resolve('slow'), 1000)))).rejects.toThrow('excedió timeout');
        });
    });
});
describe('CircuitBreakerFactory', () => {
    it('should create database circuit breaker with correct defaults', () => {
        const cb = CircuitBreaker_1.CircuitBreakerFactory.forDatabase('test-db');
        expect(cb.getState()).toBe(CircuitBreaker_1.CircuitState.CLOSED);
    });
    it('should create external API circuit breaker', () => {
        const cb = CircuitBreaker_1.CircuitBreakerFactory.forExternalApi('test-api');
        expect(cb.getState()).toBe(CircuitBreaker_1.CircuitState.CLOSED);
    });
    it('should create custom circuit breaker', () => {
        const cb = CircuitBreaker_1.CircuitBreakerFactory.custom({
            name: 'custom',
            failureThreshold: 10,
            successThreshold: 5,
            timeout: 5000,
        });
        expect(cb.getState()).toBe(CircuitBreaker_1.CircuitState.CLOSED);
    });
});
describe('CircuitOpenError', () => {
    it('should have correct error message', () => {
        const error = new CircuitBreaker_1.CircuitOpenError('my-circuit');
        expect(error.message).toContain('my-circuit');
        expect(error.message).toContain('abierto');
        expect(error.name).toBe('CircuitOpenError');
    });
});
