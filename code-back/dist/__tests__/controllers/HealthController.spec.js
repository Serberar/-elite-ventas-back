"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const HealthController_1 = require("../../infrastructure/express/controllers/HealthController");
const ServiceContainer_1 = require("../../infrastructure/container/ServiceContainer");
jest.mock('@infrastructure/container/ServiceContainer', () => ({
    serviceContainer: {
        healthChecker: {
            getHealthStatus: jest.fn(),
            quickHealthCheck: jest.fn(),
        },
        getSystemInfo: jest.fn(),
        config: {
            database: {
                poolSize: 10,
            },
        },
    },
}));
describe('HealthController', () => {
    let req;
    let res;
    let statusMock;
    let jsonMock;
    beforeEach(() => {
        statusMock = jest.fn().mockReturnThis();
        jsonMock = jest.fn();
        req = {};
        res = { status: statusMock, json: jsonMock };
        jest.clearAllMocks();
    });
    describe('health', () => {
        it('debería devolver 200 cuando el servicio está healthy', async () => {
            const mockHealthStatus = {
                status: 'healthy',
                timestamp: '2023-01-01T00:00:00.000Z',
                services: {
                    database: { status: 'healthy' },
                    external: { status: 'healthy' },
                },
            };
            ServiceContainer_1.serviceContainer.healthChecker.getHealthStatus.mockResolvedValue(mockHealthStatus);
            await HealthController_1.HealthController.health(req, res);
            expect(ServiceContainer_1.serviceContainer.healthChecker.getHealthStatus).toHaveBeenCalledTimes(1);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(mockHealthStatus);
        });
        it('debería devolver 200 cuando el servicio está degraded', async () => {
            const mockHealthStatus = {
                status: 'degraded',
                timestamp: '2023-01-01T00:00:00.000Z',
                services: {
                    database: { status: 'healthy' },
                    external: { status: 'unhealthy' },
                },
            };
            ServiceContainer_1.serviceContainer.healthChecker.getHealthStatus.mockResolvedValue(mockHealthStatus);
            await HealthController_1.HealthController.health(req, res);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(mockHealthStatus);
        });
        it('debería devolver 503 cuando el servicio está unhealthy', async () => {
            const mockHealthStatus = {
                status: 'unhealthy',
                timestamp: '2023-01-01T00:00:00.000Z',
                services: {
                    database: { status: 'unhealthy' },
                    external: { status: 'unhealthy' },
                },
            };
            ServiceContainer_1.serviceContainer.healthChecker.getHealthStatus.mockResolvedValue(mockHealthStatus);
            await HealthController_1.HealthController.health(req, res);
            expect(statusMock).toHaveBeenCalledWith(503);
            expect(jsonMock).toHaveBeenCalledWith(mockHealthStatus);
        });
        it('debería devolver 503 cuando hay error en el health check', async () => {
            const error = new Error('Health check failed');
            ServiceContainer_1.serviceContainer.healthChecker.getHealthStatus.mockRejectedValue(error);
            await HealthController_1.HealthController.health(req, res);
            expect(statusMock).toHaveBeenCalledWith(503);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'unhealthy',
                timestamp: expect.any(String),
                message: 'Health check failed',
                error: 'Health check execution failed',
            });
        });
    });
    describe('ping', () => {
        it('debería devolver 200 cuando el ping es exitoso', async () => {
            const mockPingResult = {
                status: 'healthy',
                responseTime: 50,
            };
            ServiceContainer_1.serviceContainer.healthChecker.quickHealthCheck.mockResolvedValue(mockPingResult);
            await HealthController_1.HealthController.ping(req, res);
            expect(ServiceContainer_1.serviceContainer.healthChecker.quickHealthCheck).toHaveBeenCalledTimes(1);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'healthy',
                timestamp: expect.any(String),
                responseTime: 50,
                message: 'Service is operational',
            });
        });
        it('debería devolver 503 cuando el ping falla', async () => {
            const mockPingResult = {
                status: 'unhealthy',
                responseTime: 1000,
            };
            ServiceContainer_1.serviceContainer.healthChecker.quickHealthCheck.mockResolvedValue(mockPingResult);
            await HealthController_1.HealthController.ping(req, res);
            expect(statusMock).toHaveBeenCalledWith(503);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'unhealthy',
                timestamp: expect.any(String),
                responseTime: 1000,
                message: 'Service is unavailable',
            });
        });
        it('debería devolver 503 cuando hay error en el ping', async () => {
            const error = new Error('Ping failed');
            ServiceContainer_1.serviceContainer.healthChecker.quickHealthCheck.mockRejectedValue(error);
            await HealthController_1.HealthController.ping(req, res);
            expect(statusMock).toHaveBeenCalledWith(503);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'unhealthy',
                timestamp: expect.any(String),
                message: 'Ping failed',
            });
        });
    });
    describe('info', () => {
        it('debería devolver información del sistema exitosamente', () => {
            const mockSystemInfo = {
                version: '1.0.0',
                environment: 'test',
                uptime: 12345,
            };
            ServiceContainer_1.serviceContainer.getSystemInfo.mockReturnValue(mockSystemInfo);
            HealthController_1.HealthController.info(req, res);
            expect(ServiceContainer_1.serviceContainer.getSystemInfo).toHaveBeenCalledTimes(1);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'success',
                timestamp: expect.any(String),
                data: mockSystemInfo,
            });
        });
        it('debería devolver 500 cuando hay error obteniendo info del sistema', () => {
            const error = new Error('System info failed');
            ServiceContainer_1.serviceContainer.getSystemInfo.mockImplementation(() => {
                throw error;
            });
            HealthController_1.HealthController.info(req, res);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                timestamp: expect.any(String),
                message: 'System info failed',
            });
        });
    });
    describe('services', () => {
        it('debería devolver estadísticas de servicios exitosamente', () => {
            HealthController_1.HealthController.services(req, res);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'success',
                timestamp: expect.any(String),
                services: {
                    database: {
                        status: 'operational',
                        pools: {
                            user: 10,
                            client: 10,
                            sale: 10,
                        },
                    },
                    system: {
                        uptime: expect.any(Number),
                        memory: expect.any(Object),
                        platform: expect.any(String),
                        version: expect.any(String),
                    },
                },
            });
        });
        it('debería devolver 500 cuando hay error obteniendo estadísticas', () => {
            // Mockear process.uptime para que lance error
            const originalUptime = process.uptime;
            process.uptime = jest.fn().mockImplementation(() => {
                throw new Error('Services info failed');
            });
            HealthController_1.HealthController.services(req, res);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                timestamp: expect.any(String),
                message: 'Services info failed',
            });
            // Restaurar el método original
            process.uptime = originalUptime;
        });
    });
});
