import { Request, Response, NextFunction } from 'express';
import {
  monitoringMiddleware,
  getMetrics,
  resetMetrics,
} from '@infrastructure/express/middleware/monitoringMiddleware';

describe('monitoringMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset metrics before each test
    resetMetrics();

    mockRequest = {
      method: 'GET',
      path: '/test',
      route: {
        path: '/test',
      } as any,
    };

    const eventHandlers: { [key: string]: () => void } = {};

    mockResponse = {
      statusCode: 200,
      on: jest.fn((event: string, handler: () => void) => {
        eventHandlers[event] = handler;
      }),
      // Simular el evento 'finish'
      _triggerFinish: () => {
        if (eventHandlers['finish']) {
          eventHandlers['finish']();
        }
      },
    } as any;

    mockNext = jest.fn();
  });

  it('should call next() when middleware is executed', () => {
    monitoringMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should track successful requests', () => {
    mockResponse.statusCode = 200;

    monitoringMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
    (mockResponse as any)._triggerFinish();

    const metrics = getMetrics();
    expect(metrics.totalRequests).toBe(1);
    expect(metrics.successfulRequests).toBe(1);
    expect(metrics.failedRequests).toBe(0);
  });

  it('should track failed requests (4xx)', () => {
    mockResponse.statusCode = 404;

    monitoringMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
    (mockResponse as any)._triggerFinish();

    const metrics = getMetrics();
    expect(metrics.totalRequests).toBe(1);
    expect(metrics.successfulRequests).toBe(0);
    expect(metrics.failedRequests).toBe(1);
  });

  it('should track failed requests (5xx)', () => {
    mockResponse.statusCode = 500;

    monitoringMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
    (mockResponse as any)._triggerFinish();

    const metrics = getMetrics();
    expect(metrics.totalRequests).toBe(1);
    expect(metrics.successfulRequests).toBe(0);
    expect(metrics.failedRequests).toBe(1);
  });

  it('should track multiple requests correctly', () => {
    // Request 1: Success
    mockResponse.statusCode = 200;
    monitoringMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
    (mockResponse as any)._triggerFinish();

    // Request 2: Client error
    mockResponse.statusCode = 400;
    monitoringMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
    (mockResponse as any)._triggerFinish();

    // Request 3: Success
    mockResponse.statusCode = 201;
    monitoringMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
    (mockResponse as any)._triggerFinish();

    const metrics = getMetrics();
    expect(metrics.totalRequests).toBe(3);
    expect(metrics.successfulRequests).toBe(2);
    expect(metrics.failedRequests).toBe(1);
  });

  it('should track status codes', () => {
    mockResponse.statusCode = 200;
    monitoringMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
    (mockResponse as any)._triggerFinish();

    mockResponse.statusCode = 404;
    monitoringMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
    (mockResponse as any)._triggerFinish();

    mockResponse.statusCode = 200;
    monitoringMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
    (mockResponse as any)._triggerFinish();

    const metrics = getMetrics();
    const statusCodes = metrics.statusCodes;

    const code200 = statusCodes.find((s) => s.code === 200);
    const code404 = statusCodes.find((s) => s.code === 404);

    expect(code200?.count).toBe(2);
    expect(code404?.count).toBe(1);
  });

  it('should track endpoint metrics', () => {
    mockRequest.route = { path: '/api/users' } as any;
    mockResponse.statusCode = 200;

    monitoringMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
    (mockResponse as any)._triggerFinish();

    const metrics = getMetrics();
    const endpoint = metrics.endpoints.find((e) => e.endpoint === 'GET /api/users');

    expect(endpoint).toBeDefined();
    expect(endpoint?.count).toBe(1);
    expect(endpoint?.errors).toBe(0);
  });

  it('should track endpoint errors', () => {
    mockRequest.route = { path: '/api/users' } as any;
    mockResponse.statusCode = 500;

    monitoringMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
    (mockResponse as any)._triggerFinish();

    const metrics = getMetrics();
    const endpoint = metrics.endpoints.find((e) => e.endpoint === 'GET /api/users');

    expect(endpoint?.errors).toBe(1);
    expect(endpoint?.errorRate).toBe('100.00%');
  });

  it('should calculate average response time', () => {
    mockResponse.statusCode = 200;

    // Simulate multiple requests
    for (let i = 0; i < 5; i++) {
      monitoringMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      (mockResponse as any)._triggerFinish();
    }

    const metrics = getMetrics();
    expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
  });

  it('should reset metrics correctly', () => {
    mockResponse.statusCode = 200;
    monitoringMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
    (mockResponse as any)._triggerFinish();

    resetMetrics();
    const metrics = getMetrics();

    expect(metrics.totalRequests).toBe(0);
    expect(metrics.successfulRequests).toBe(0);
    expect(metrics.failedRequests).toBe(0);
    expect(metrics.endpoints).toHaveLength(0);
    expect(metrics.statusCodes).toHaveLength(0);
  });
});
