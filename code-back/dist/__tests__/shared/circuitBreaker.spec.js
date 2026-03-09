"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CircuitBreaker_1 = require("../../infrastructure/resilience/CircuitBreaker");
describe('Circuit Breaker', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('createCircuitBreaker', () => {
        it('should create a circuit breaker with custom config', () => {
            const action = jest.fn().mockResolvedValue('success');
            const breaker = (0, CircuitBreaker_1.createCircuitBreaker)(action, {
                timeout: 1000,
                errorThresholdPercentage: 50,
                resetTimeout: 5000,
                name: 'test-breaker',
            });
            expect(breaker).toBeDefined();
            expect(breaker.name).toBe('test-breaker');
        });
        it('should execute action successfully', async () => {
            const action = jest.fn().mockResolvedValue('success');
            const breaker = (0, CircuitBreaker_1.createCircuitBreaker)(action, {
                timeout: 1000,
                errorThresholdPercentage: 50,
                resetTimeout: 5000,
                name: 'test-breaker',
            });
            const result = await breaker.fire();
            expect(result).toBe('success');
            expect(action).toHaveBeenCalledTimes(1);
        });
        it('should handle failures', async () => {
            const action = jest.fn().mockRejectedValue(new Error('Service unavailable'));
            const breaker = (0, CircuitBreaker_1.createCircuitBreaker)(action, {
                timeout: 1000,
                errorThresholdPercentage: 50,
                resetTimeout: 5000,
                name: 'test-breaker',
            });
            await expect(breaker.fire()).rejects.toThrow('Service unavailable');
        });
        it('should timeout if action takes too long', async () => {
            const action = jest
                .fn()
                .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('too late'), 2000)));
            const breaker = (0, CircuitBreaker_1.createCircuitBreaker)(action, {
                timeout: 500, // 500ms timeout
                errorThresholdPercentage: 50,
                resetTimeout: 5000,
                name: 'test-breaker',
            });
            await expect(breaker.fire()).rejects.toThrow();
        }, 10000);
        it('should use fallback when provided', async () => {
            const action = jest.fn().mockRejectedValue(new Error('Service down'));
            const fallback = jest.fn().mockReturnValue('fallback response');
            const breaker = (0, CircuitBreaker_1.createCircuitBreaker)(action, {
                timeout: 1000,
                errorThresholdPercentage: 50,
                resetTimeout: 5000,
                name: 'test-breaker',
                fallback,
            });
            const result = await breaker.fire();
            expect(result).toBe('fallback response');
            expect(fallback).toHaveBeenCalled();
        });
        it('should pass arguments to action', async () => {
            const action = jest.fn().mockImplementation((a, b) => a + b);
            const breaker = (0, CircuitBreaker_1.createCircuitBreaker)(action, {
                timeout: 1000,
                errorThresholdPercentage: 50,
                resetTimeout: 5000,
                name: 'test-breaker',
            });
            const result = await breaker.fire(5, 3);
            expect(result).toBe(8);
            expect(action).toHaveBeenCalledWith(5, 3);
        });
    });
    describe('createHttpCircuitBreaker', () => {
        it('should create HTTP circuit breaker', () => {
            const httpClient = jest.fn().mockResolvedValue({ data: 'response' });
            const breaker = (0, CircuitBreaker_1.createHttpCircuitBreaker)(httpClient, 'external-api');
            expect(breaker).toBeDefined();
            expect(breaker.name).toBe('http-external-api');
        });
        it('should execute HTTP call successfully', async () => {
            const httpClient = jest.fn().mockResolvedValue({ data: 'response' });
            const breaker = (0, CircuitBreaker_1.createHttpCircuitBreaker)(httpClient, 'external-api');
            const result = await breaker.fire();
            expect(result).toEqual({ data: 'response' });
            expect(httpClient).toHaveBeenCalledTimes(1);
        });
        it('should throw error when service unavailable', async () => {
            const httpClient = jest.fn().mockRejectedValue(new Error('Network error'));
            const breaker = (0, CircuitBreaker_1.createHttpCircuitBreaker)(httpClient, 'external-api');
            await expect(breaker.fire()).rejects.toThrow('Service external-api is temporarily unavailable');
        });
    });
    describe('createDatabaseCircuitBreaker', () => {
        it('should create database circuit breaker', () => {
            const dbOperation = jest.fn().mockResolvedValue([{ id: 1 }]);
            const breaker = (0, CircuitBreaker_1.createDatabaseCircuitBreaker)(dbOperation, 'getUsers');
            expect(breaker).toBeDefined();
            expect(breaker.name).toBe('db-getUsers');
        });
        it('should execute database operation successfully', async () => {
            const dbOperation = jest.fn().mockResolvedValue([{ id: 1, name: 'John' }]);
            const breaker = (0, CircuitBreaker_1.createDatabaseCircuitBreaker)(dbOperation, 'getUsers');
            const result = await breaker.fire();
            expect(result).toEqual([{ id: 1, name: 'John' }]);
            expect(dbOperation).toHaveBeenCalledTimes(1);
        });
        it('should throw error when database unavailable', async () => {
            const dbOperation = jest.fn().mockRejectedValue(new Error('Connection refused'));
            const breaker = (0, CircuitBreaker_1.createDatabaseCircuitBreaker)(dbOperation, 'getUsers');
            await expect(breaker.fire()).rejects.toThrow('Database operation getUsers is temporarily unavailable');
        });
    });
    describe('getCircuitBreakerStats', () => {
        it('should return circuit breaker statistics', async () => {
            const action = jest.fn().mockResolvedValue('success');
            const breaker = (0, CircuitBreaker_1.createCircuitBreaker)(action, {
                timeout: 1000,
                errorThresholdPercentage: 50,
                resetTimeout: 5000,
                name: 'test-breaker',
            });
            await breaker.fire();
            const stats = (0, CircuitBreaker_1.getCircuitBreakerStats)(breaker);
            expect(stats).toHaveProperty('name', 'test-breaker');
            expect(stats).toHaveProperty('state');
            expect(stats).toHaveProperty('stats');
            expect(stats).toHaveProperty('status');
        });
        it('should show correct state for closed circuit', async () => {
            const action = jest.fn().mockResolvedValue('success');
            const breaker = (0, CircuitBreaker_1.createCircuitBreaker)(action, {
                timeout: 1000,
                errorThresholdPercentage: 50,
                resetTimeout: 5000,
                name: 'test-breaker',
            });
            await breaker.fire();
            const stats = (0, CircuitBreaker_1.getCircuitBreakerStats)(breaker);
            expect(stats.state).toBe('closed');
        });
    });
    describe('CIRCUIT_BREAKER_CONFIGS', () => {
        it('should have predefined config for external API', () => {
            expect(CircuitBreaker_1.CIRCUIT_BREAKER_CONFIGS.externalApi).toBeDefined();
            expect(CircuitBreaker_1.CIRCUIT_BREAKER_CONFIGS.externalApi.timeout).toBe(5000);
            expect(CircuitBreaker_1.CIRCUIT_BREAKER_CONFIGS.externalApi.name).toBe('external-api');
        });
        it('should have predefined config for database', () => {
            expect(CircuitBreaker_1.CIRCUIT_BREAKER_CONFIGS.database).toBeDefined();
            expect(CircuitBreaker_1.CIRCUIT_BREAKER_CONFIGS.database.timeout).toBe(3000);
            expect(CircuitBreaker_1.CIRCUIT_BREAKER_CONFIGS.database.name).toBe('database');
        });
        it('should have predefined config for cache', () => {
            expect(CircuitBreaker_1.CIRCUIT_BREAKER_CONFIGS.cache).toBeDefined();
            expect(CircuitBreaker_1.CIRCUIT_BREAKER_CONFIGS.cache.timeout).toBe(1000);
            expect(CircuitBreaker_1.CIRCUIT_BREAKER_CONFIGS.cache.name).toBe('cache');
        });
        it('should have predefined config for notification', () => {
            expect(CircuitBreaker_1.CIRCUIT_BREAKER_CONFIGS.notification).toBeDefined();
            expect(CircuitBreaker_1.CIRCUIT_BREAKER_CONFIGS.notification.timeout).toBe(10000);
            expect(CircuitBreaker_1.CIRCUIT_BREAKER_CONFIGS.notification.name).toBe('notification');
        });
    });
    describe('Circuit state transitions', () => {
        it('should open circuit after threshold errors', async () => {
            let callCount = 0;
            const action = jest.fn().mockImplementation(() => {
                callCount++;
                // Fail first 10 calls to trigger circuit opening
                if (callCount <= 10) {
                    throw new Error('Service error');
                }
                return 'success';
            });
            const breaker = (0, CircuitBreaker_1.createCircuitBreaker)(action, {
                timeout: 1000,
                errorThresholdPercentage: 50,
                resetTimeout: 30000,
                name: 'test-breaker',
                enableMetrics: false,
            });
            // Fire 10 failing requests
            for (let i = 0; i < 10; i++) {
                try {
                    await breaker.fire();
                }
                catch (_error) {
                    // Expected to fail
                    void _error; // Explicitly use the variable to prevent linting warning
                }
            }
            const stats = (0, CircuitBreaker_1.getCircuitBreakerStats)(breaker);
            // Circuit should be open after many failures
            expect(['open', 'half-open']).toContain(stats.state);
        }, 15000);
    });
});
