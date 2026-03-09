import { Request, Response } from 'express';
import { healthCheckHandler, readinessHandler, livenessHandler } from '@infrastructure/express/health/healthCheck';
import { prisma } from '@infrastructure/prisma/prismaClient';

// Mock de prisma
jest.mock('@infrastructure/prisma/prismaClient', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

describe('Health Check Handlers', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

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
      (prisma.$queryRaw as jest.Mock).mockImplementation(() => Promise.resolve([{ 1: 1 }]));

      // Mock memory usage para que esté por debajo del 80%
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as any) = jest.fn().mockReturnValue({
        heapUsed: 100 * 1024 * 1024, // 100MB
        heapTotal: 200 * 1024 * 1024, // 200MB (50% usage)
        external: 5 * 1024 * 1024,
        rss: 300 * 1024 * 1024,
      });

      await healthCheckHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          checks: expect.objectContaining({
            database: expect.objectContaining({
              status: 'pass',
            }),
            memory: expect.objectContaining({
              status: 'pass',
            }),
          }),
        })
      );

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should return unhealthy status when database fails', async () => {
      // Mock database failure
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      await healthCheckHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhealthy',
          checks: expect.objectContaining({
            database: expect.objectContaining({
              status: 'fail',
              message: 'Database connection failed',
            }),
          }),
        })
      );
    });

    it('should include timestamp and uptime', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);

      // Mock memory usage normal
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as any) = jest.fn().mockReturnValue({
        heapUsed: 100 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        rss: 300 * 1024 * 1024,
      });

      await healthCheckHandler(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
          uptime: expect.any(Number),
        })
      );

      process.memoryUsage = originalMemoryUsage;
    });

    it('should include version information', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);

      // Mock memory usage normal
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as any) = jest.fn().mockReturnValue({
        heapUsed: 100 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        rss: 300 * 1024 * 1024,
      });

      await healthCheckHandler(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          version: expect.any(String),
        })
      );

      process.memoryUsage = originalMemoryUsage;
    });

    it('should return degraded status when database is slow', async () => {
      // Mock slow database query (>100ms)
      (prisma.$queryRaw as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([{ 1: 1 }]), 150))
      );

      // Mock memory usage normal
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as any) = jest.fn().mockReturnValue({
        heapUsed: 100 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        rss: 300 * 1024 * 1024,
      });

      await healthCheckHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'degraded',
          checks: expect.objectContaining({
            database: expect.objectContaining({
              status: 'warn',
              responseTime: expect.any(Number),
            }),
          }),
        })
      );

      process.memoryUsage = originalMemoryUsage;
    });

    it('should handle unexpected errors gracefully', async () => {
      // Mock unexpected error during health check
      (prisma.$queryRaw as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await healthCheckHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhealthy',
          checks: expect.objectContaining({
            database: expect.objectContaining({
              status: 'fail',
              message: 'Database connection failed',
            }),
          }),
        })
      );
    });

    it('should include memory details in response', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);

      // Mock memory usage normal
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as any) = jest.fn().mockReturnValue({
        heapUsed: 100 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        rss: 300 * 1024 * 1024,
      });

      await healthCheckHandler(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
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
        })
      );

      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('readinessHandler', () => {
    it('should return ready status', () => {
      readinessHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready',
          timestamp: expect.any(String),
        })
      );
    });

    it('should return valid ISO timestamp', () => {
      readinessHandler(mockRequest as Request, mockResponse as Response);

      const call = jsonMock.mock.calls[0][0];
      const timestamp = new Date(call.timestamp);

      expect(timestamp.toISOString()).toBe(call.timestamp);
    });
  });

  describe('livenessHandler', () => {
    it('should return alive status', () => {
      livenessHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'alive',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
        })
      );
    });

    it('should return positive uptime', () => {
      livenessHandler(mockRequest as Request, mockResponse as Response);

      const call = jsonMock.mock.calls[0][0];
      expect(call.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return valid ISO timestamp', () => {
      livenessHandler(mockRequest as Request, mockResponse as Response);

      const call = jsonMock.mock.calls[0][0];
      const timestamp = new Date(call.timestamp);

      expect(timestamp.toISOString()).toBe(call.timestamp);
    });
  });
});
