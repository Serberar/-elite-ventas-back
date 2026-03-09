"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const monitoringMiddleware_1 = require("../../infrastructure/express/middleware/monitoringMiddleware");
describe('monitoringMiddleware', () => {
    let mockRequest;
    let mockResponse;
    let mockNext;
    beforeEach(() => {
        // Reset metrics before each test
        (0, monitoringMiddleware_1.resetMetrics)();
        mockRequest = {
            method: 'GET',
            path: '/test',
            route: {
                path: '/test',
            },
        };
        const eventHandlers = {};
        mockResponse = {
            statusCode: 200,
            on: jest.fn((event, handler) => {
                eventHandlers[event] = handler;
            }),
            // Simular el evento 'finish'
            _triggerFinish: () => {
                if (eventHandlers['finish']) {
                    eventHandlers['finish']();
                }
            },
        };
        mockNext = jest.fn();
    });
    it('should call next() when middleware is executed', () => {
        (0, monitoringMiddleware_1.monitoringMiddleware)(mockRequest, mockResponse, mockNext);
        expect(mockNext).toHaveBeenCalled();
    });
    it('should track successful requests', () => {
        mockResponse.statusCode = 200;
        (0, monitoringMiddleware_1.monitoringMiddleware)(mockRequest, mockResponse, mockNext);
        mockResponse._triggerFinish();
        const metrics = (0, monitoringMiddleware_1.getMetrics)();
        expect(metrics.totalRequests).toBe(1);
        expect(metrics.successfulRequests).toBe(1);
        expect(metrics.failedRequests).toBe(0);
    });
    it('should track failed requests (4xx)', () => {
        mockResponse.statusCode = 404;
        (0, monitoringMiddleware_1.monitoringMiddleware)(mockRequest, mockResponse, mockNext);
        mockResponse._triggerFinish();
        const metrics = (0, monitoringMiddleware_1.getMetrics)();
        expect(metrics.totalRequests).toBe(1);
        expect(metrics.successfulRequests).toBe(0);
        expect(metrics.failedRequests).toBe(1);
    });
    it('should track failed requests (5xx)', () => {
        mockResponse.statusCode = 500;
        (0, monitoringMiddleware_1.monitoringMiddleware)(mockRequest, mockResponse, mockNext);
        mockResponse._triggerFinish();
        const metrics = (0, monitoringMiddleware_1.getMetrics)();
        expect(metrics.totalRequests).toBe(1);
        expect(metrics.successfulRequests).toBe(0);
        expect(metrics.failedRequests).toBe(1);
    });
    it('should track multiple requests correctly', () => {
        // Request 1: Success
        mockResponse.statusCode = 200;
        (0, monitoringMiddleware_1.monitoringMiddleware)(mockRequest, mockResponse, mockNext);
        mockResponse._triggerFinish();
        // Request 2: Client error
        mockResponse.statusCode = 400;
        (0, monitoringMiddleware_1.monitoringMiddleware)(mockRequest, mockResponse, mockNext);
        mockResponse._triggerFinish();
        // Request 3: Success
        mockResponse.statusCode = 201;
        (0, monitoringMiddleware_1.monitoringMiddleware)(mockRequest, mockResponse, mockNext);
        mockResponse._triggerFinish();
        const metrics = (0, monitoringMiddleware_1.getMetrics)();
        expect(metrics.totalRequests).toBe(3);
        expect(metrics.successfulRequests).toBe(2);
        expect(metrics.failedRequests).toBe(1);
    });
    it('should track status codes', () => {
        mockResponse.statusCode = 200;
        (0, monitoringMiddleware_1.monitoringMiddleware)(mockRequest, mockResponse, mockNext);
        mockResponse._triggerFinish();
        mockResponse.statusCode = 404;
        (0, monitoringMiddleware_1.monitoringMiddleware)(mockRequest, mockResponse, mockNext);
        mockResponse._triggerFinish();
        mockResponse.statusCode = 200;
        (0, monitoringMiddleware_1.monitoringMiddleware)(mockRequest, mockResponse, mockNext);
        mockResponse._triggerFinish();
        const metrics = (0, monitoringMiddleware_1.getMetrics)();
        const statusCodes = metrics.statusCodes;
        const code200 = statusCodes.find((s) => s.code === 200);
        const code404 = statusCodes.find((s) => s.code === 404);
        expect(code200?.count).toBe(2);
        expect(code404?.count).toBe(1);
    });
    it('should track endpoint metrics', () => {
        mockRequest.route = { path: '/api/users' };
        mockResponse.statusCode = 200;
        (0, monitoringMiddleware_1.monitoringMiddleware)(mockRequest, mockResponse, mockNext);
        mockResponse._triggerFinish();
        const metrics = (0, monitoringMiddleware_1.getMetrics)();
        const endpoint = metrics.endpoints.find((e) => e.endpoint === 'GET /api/users');
        expect(endpoint).toBeDefined();
        expect(endpoint?.count).toBe(1);
        expect(endpoint?.errors).toBe(0);
    });
    it('should track endpoint errors', () => {
        mockRequest.route = { path: '/api/users' };
        mockResponse.statusCode = 500;
        (0, monitoringMiddleware_1.monitoringMiddleware)(mockRequest, mockResponse, mockNext);
        mockResponse._triggerFinish();
        const metrics = (0, monitoringMiddleware_1.getMetrics)();
        const endpoint = metrics.endpoints.find((e) => e.endpoint === 'GET /api/users');
        expect(endpoint?.errors).toBe(1);
        expect(endpoint?.errorRate).toBe('100.00%');
    });
    it('should calculate average response time', () => {
        mockResponse.statusCode = 200;
        // Simulate multiple requests
        for (let i = 0; i < 5; i++) {
            (0, monitoringMiddleware_1.monitoringMiddleware)(mockRequest, mockResponse, mockNext);
            mockResponse._triggerFinish();
        }
        const metrics = (0, monitoringMiddleware_1.getMetrics)();
        expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
    });
    it('should reset metrics correctly', () => {
        mockResponse.statusCode = 200;
        (0, monitoringMiddleware_1.monitoringMiddleware)(mockRequest, mockResponse, mockNext);
        mockResponse._triggerFinish();
        (0, monitoringMiddleware_1.resetMetrics)();
        const metrics = (0, monitoringMiddleware_1.getMetrics)();
        expect(metrics.totalRequests).toBe(0);
        expect(metrics.successfulRequests).toBe(0);
        expect(metrics.failedRequests).toBe(0);
        expect(metrics.endpoints).toHaveLength(0);
        expect(metrics.statusCodes).toHaveLength(0);
    });
});
