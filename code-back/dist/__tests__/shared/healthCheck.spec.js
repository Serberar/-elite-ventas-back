"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const healthCheck_1 = require("../../infrastructure/express/health/healthCheck");
const prismaClient_1 = require("../../infrastructure/prisma/prismaClient");
// Mock de prisma
jest.mock('@infrastructure/prisma/prismaClient', () => ({
    prisma: {
        $queryRaw: jest.fn(),
    },
}));
describe('Health Check Handlers', () => {
    let mockRequest;
    let mockResponse;
    let jsonMock;
    let statusMock;
    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockRequest = {};
        mockResponse = {
            status: statusMock,
            json: jsonMock,
        };
        jest.clearAllMocks();
    });
    describe('healthCheckHandler', () => {
        it('should return healthy status when all checks pass', async () => {
            // Mock successful and fast database query
            prismaClient_1.prisma.$queryRaw.mockImplementation(() => Promise.resolve([{ 1: 1 }]));
            // Mock memory usage para que esté por debajo del 80%
            const originalMemoryUsage = process.memoryUsage;
            process.memoryUsage = jest.fn().mockReturnValue({
                heapUsed: 100 * 1024 * 1024, // 100MB
                heapTotal: 200 * 1024 * 1024, // 200MB (50% usage)
                external: 5 * 1024 * 1024,
                rss: 300 * 1024 * 1024,
            });
            await (0, healthCheck_1.healthCheckHandler)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'healthy',
                checks: expect.objectContaining({
                    database: expect.objectContaining({
                        status: 'pass',
                    }),
                    memory: expect.objectContaining({
                        status: 'pass',
                    }),
                }),
            }));
            // Restore original function
            process.memoryUsage = originalMemoryUsage;
        });
        it('should return unhealthy status when database fails', async () => {
            // Mock database failure
            prismaClient_1.prisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));
            await (0, healthCheck_1.healthCheckHandler)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(503);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'unhealthy',
                checks: expect.objectContaining({
                    database: expect.objectContaining({
                        status: 'fail',
                        message: 'Database connection failed',
                    }),
                }),
            }));
        });
        it('should include timestamp and uptime', async () => {
            prismaClient_1.prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);
            // Mock memory usage normal
            const originalMemoryUsage = process.memoryUsage;
            process.memoryUsage = jest.fn().mockReturnValue({
                heapUsed: 100 * 1024 * 1024,
                heapTotal: 200 * 1024 * 1024,
                external: 5 * 1024 * 1024,
                rss: 300 * 1024 * 1024,
            });
            await (0, healthCheck_1.healthCheckHandler)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                timestamp: expect.any(String),
                uptime: expect.any(Number),
            }));
            process.memoryUsage = originalMemoryUsage;
        });
        it('should include version information', async () => {
            prismaClient_1.prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);
            // Mock memory usage normal
            const originalMemoryUsage = process.memoryUsage;
            process.memoryUsage = jest.fn().mockReturnValue({
                heapUsed: 100 * 1024 * 1024,
                heapTotal: 200 * 1024 * 1024,
                external: 5 * 1024 * 1024,
                rss: 300 * 1024 * 1024,
            });
            await (0, healthCheck_1.healthCheckHandler)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                version: expect.any(String),
            }));
            process.memoryUsage = originalMemoryUsage;
        });
        it('should return degraded status when database is slow', async () => {
            // Mock slow database query (>100ms)
            prismaClient_1.prisma.$queryRaw.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve([{ 1: 1 }]), 150)));
            // Mock memory usage normal
            const originalMemoryUsage = process.memoryUsage;
            process.memoryUsage = jest.fn().mockReturnValue({
                heapUsed: 100 * 1024 * 1024,
                heapTotal: 200 * 1024 * 1024,
                external: 5 * 1024 * 1024,
                rss: 300 * 1024 * 1024,
            });
            await (0, healthCheck_1.healthCheckHandler)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'degraded',
                checks: expect.objectContaining({
                    database: expect.objectContaining({
                        status: 'warn',
                        responseTime: expect.any(Number),
                    }),
                }),
            }));
            process.memoryUsage = originalMemoryUsage;
        });
        it('should handle unexpected errors gracefully', async () => {
            // Mock unexpected error during health check
            prismaClient_1.prisma.$queryRaw.mockImplementation(() => {
                throw new Error('Unexpected error');
            });
            await (0, healthCheck_1.healthCheckHandler)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(503);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'unhealthy',
                checks: expect.objectContaining({
                    database: expect.objectContaining({
                        status: 'fail',
                        message: 'Database connection failed',
                    }),
                }),
            }));
        });
        it('should include memory details in response', async () => {
            prismaClient_1.prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);
            // Mock memory usage normal
            const originalMemoryUsage = process.memoryUsage;
            process.memoryUsage = jest.fn().mockReturnValue({
                heapUsed: 100 * 1024 * 1024,
                heapTotal: 200 * 1024 * 1024,
                external: 5 * 1024 * 1024,
                rss: 300 * 1024 * 1024,
            });
            await (0, healthCheck_1.healthCheckHandler)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                checks: expect.objectContaining({
                    memory: expect.objectContaining({
                        status: expect.any(String),
                        message: expect.any(String),
                        details: expect.objectContaining({
                            heapUsed: expect.any(Number),
                            heapTotal: expect.any(Number),
                            usagePercent: expect.any(Number),
                        }),
                    }),
                }),
            }));
            process.memoryUsage = originalMemoryUsage;
        });
    });
    describe('readinessHandler', () => {
        it('should return ready status', () => {
            (0, healthCheck_1.readinessHandler)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'ready',
                timestamp: expect.any(String),
            }));
        });
        it('should return valid ISO timestamp', () => {
            (0, healthCheck_1.readinessHandler)(mockRequest, mockResponse);
            const call = jsonMock.mock.calls[0][0];
            const timestamp = new Date(call.timestamp);
            expect(timestamp.toISOString()).toBe(call.timestamp);
        });
    });
    describe('livenessHandler', () => {
        it('should return alive status', () => {
            (0, healthCheck_1.livenessHandler)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'alive',
                timestamp: expect.any(String),
                uptime: expect.any(Number),
            }));
        });
        it('should return positive uptime', () => {
            (0, healthCheck_1.livenessHandler)(mockRequest, mockResponse);
            const call = jsonMock.mock.calls[0][0];
            expect(call.uptime).toBeGreaterThanOrEqual(0);
        });
        it('should return valid ISO timestamp', () => {
            (0, healthCheck_1.livenessHandler)(mockRequest, mockResponse);
            const call = jsonMock.mock.calls[0][0];
            const timestamp = new Date(call.timestamp);
            expect(timestamp.toISOString()).toBe(call.timestamp);
        });
    });
});
