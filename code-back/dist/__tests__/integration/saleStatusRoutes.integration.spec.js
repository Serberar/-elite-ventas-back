"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const saleStatusRoutes_1 = __importDefault(require("../../infrastructure/routes/saleStatusRoutes"));
const ServiceContainer_1 = require("../../infrastructure/container/ServiceContainer");
// Mock del serviceContainer
jest.mock('@infrastructure/container/ServiceContainer', () => ({
    serviceContainer: {
        listSaleStatusUseCase: { execute: jest.fn() },
        createSaleStatusUseCase: { execute: jest.fn() },
        updateSaleStatusUseCase: { execute: jest.fn() },
        reorderSaleStatusesUseCase: { execute: jest.fn() },
        deleteSaleStatusUseCase: { execute: jest.fn() },
    },
}));
// Mock del logger
jest.mock('@infrastructure/observability/logger/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));
// Mock del authMiddleware
jest.mock('@infrastructure/express/middleware/authMiddleware', () => ({
    authMiddleware: (req, res, next) => {
        if (req.headers.authorization === 'Bearer valid-token') {
            req.user = { id: 'user-123', role: 'administrador', firstName: 'Admin' };
            next();
        }
        else {
            res.status(401).json({ message: 'No autorizado' });
        }
    },
}));
// Mock del validateRequest middleware
jest.mock('@infrastructure/express/middleware/validateRequest', () => ({
    validateRequest: () => (req, res, next) => next(),
}));
describe('Integration: Sale Status Routes', () => {
    let app;
    beforeAll(() => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/sale-status', saleStatusRoutes_1.default);
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('GET /api/sale-status', () => {
        it('should return 401 without authentication', async () => {
            await (0, supertest_1.default)(app)
                .get('/api/sale-status')
                .expect(401);
        });
        it('should list sale statuses with authentication', async () => {
            const mockStatuses = [
                { id: 'status-1', name: 'Pendiente', order: 1, color: '#FFFF00', isFinal: false },
                { id: 'status-2', name: 'Completada', order: 2, color: '#00FF00', isFinal: true },
            ];
            ServiceContainer_1.serviceContainer.listSaleStatusUseCase.execute.mockResolvedValue(mockStatuses);
            const response = await (0, supertest_1.default)(app)
                .get('/api/sale-status')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].name).toBe('Pendiente');
        });
        it('should return 403 for permission errors', async () => {
            ServiceContainer_1.serviceContainer.listSaleStatusUseCase.execute.mockRejectedValue(new Error('No tiene permiso'));
            const response = await (0, supertest_1.default)(app)
                .get('/api/sale-status')
                .set('Authorization', 'Bearer valid-token')
                .expect(403);
            expect(response.body).toHaveProperty('message', 'No tiene permiso');
        });
    });
    describe('POST /api/sale-status', () => {
        it('should return 401 without authentication', async () => {
            await (0, supertest_1.default)(app)
                .post('/api/sale-status')
                .send({ name: 'Nuevo Estado', order: 1 })
                .expect(401);
        });
        it('should create a sale status with valid data', async () => {
            const mockStatus = {
                id: 'status-new',
                name: 'Nuevo Estado',
                order: 3,
                color: '#FF0000',
                isFinal: false,
                isCancelled: false,
            };
            ServiceContainer_1.serviceContainer.createSaleStatusUseCase.execute.mockResolvedValue(mockStatus);
            const response = await (0, supertest_1.default)(app)
                .post('/api/sale-status')
                .set('Authorization', 'Bearer valid-token')
                .send({
                name: 'Nuevo Estado',
                order: 3,
                color: '#FF0000',
                isFinal: false,
            })
                .expect(201);
            expect(response.body).toHaveProperty('message', 'Estado de venta creado correctamente');
            expect(response.body.status.name).toBe('Nuevo Estado');
        });
        it('should create a sale status with minimal data', async () => {
            const mockStatus = {
                id: 'status-minimal',
                name: 'Estado Mínimo',
                order: 5,
                color: null,
                isFinal: false,
                isCancelled: false,
            };
            ServiceContainer_1.serviceContainer.createSaleStatusUseCase.execute.mockResolvedValue(mockStatus);
            const response = await (0, supertest_1.default)(app)
                .post('/api/sale-status')
                .set('Authorization', 'Bearer valid-token')
                .send({
                name: 'Estado Mínimo',
                order: 5,
            })
                .expect(201);
            expect(response.body).toHaveProperty('message', 'Estado de venta creado correctamente');
        });
        it('should return 403 for permission errors', async () => {
            ServiceContainer_1.serviceContainer.createSaleStatusUseCase.execute.mockRejectedValue(new Error('No tiene permiso'));
            const response = await (0, supertest_1.default)(app)
                .post('/api/sale-status')
                .set('Authorization', 'Bearer valid-token')
                .send({ name: 'Test', order: 1 })
                .expect(403);
            expect(response.body).toHaveProperty('message', 'No tiene permiso');
        });
    });
    describe('PUT /api/sale-status/:id', () => {
        it('should return 401 without authentication', async () => {
            await (0, supertest_1.default)(app)
                .put('/api/sale-status/status-123')
                .send({ name: 'Updated' })
                .expect(401);
        });
        it('should update sale status with valid data', async () => {
            const mockUpdatedStatus = {
                id: 'status-123',
                name: 'Estado Actualizado',
                order: 1,
                color: '#0000FF',
                isFinal: false,
            };
            ServiceContainer_1.serviceContainer.updateSaleStatusUseCase.execute.mockResolvedValue(mockUpdatedStatus);
            const response = await (0, supertest_1.default)(app)
                .put('/api/sale-status/status-123')
                .set('Authorization', 'Bearer valid-token')
                .send({
                name: 'Estado Actualizado',
                color: '#0000FF',
            })
                .expect(200);
            expect(response.body).toHaveProperty('message', 'Estado de venta actualizado correctamente');
            expect(response.body.status.name).toBe('Estado Actualizado');
        });
        it('should update only isFinal field', async () => {
            const mockUpdatedStatus = {
                id: 'status-123',
                name: 'Estado',
                order: 1,
                color: '#FF0000',
                isFinal: true,
            };
            ServiceContainer_1.serviceContainer.updateSaleStatusUseCase.execute.mockResolvedValue(mockUpdatedStatus);
            const response = await (0, supertest_1.default)(app)
                .put('/api/sale-status/status-123')
                .set('Authorization', 'Bearer valid-token')
                .send({ isFinal: true })
                .expect(200);
            expect(response.body.status.isFinal).toBe(true);
        });
        it('should return 404 for non-existent status', async () => {
            ServiceContainer_1.serviceContainer.updateSaleStatusUseCase.execute.mockRejectedValue(new Error('Estado no encontrado'));
            const response = await (0, supertest_1.default)(app)
                .put('/api/sale-status/nonexistent')
                .set('Authorization', 'Bearer valid-token')
                .send({ name: 'Test' })
                .expect(404);
            expect(response.body).toHaveProperty('message');
        });
        it('should return 403 for permission errors', async () => {
            ServiceContainer_1.serviceContainer.updateSaleStatusUseCase.execute.mockRejectedValue(new Error('No tiene permiso'));
            const response = await (0, supertest_1.default)(app)
                .put('/api/sale-status/status-123')
                .set('Authorization', 'Bearer valid-token')
                .send({ name: 'Test' })
                .expect(403);
            expect(response.body).toHaveProperty('message', 'No tiene permiso');
        });
    });
    describe('PATCH /api/sale-status/reorder', () => {
        it('should return 401 without authentication', async () => {
            await (0, supertest_1.default)(app)
                .patch('/api/sale-status/reorder')
                .send({ statuses: [{ id: 'status-1', order: 1 }] })
                .expect(401);
        });
        it('should reorder sale statuses', async () => {
            const mockReorderedStatuses = [
                { id: 'status-3', name: 'Estado 3', order: 1 },
                { id: 'status-1', name: 'Estado 1', order: 2 },
                { id: 'status-2', name: 'Estado 2', order: 3 },
            ];
            ServiceContainer_1.serviceContainer.reorderSaleStatusesUseCase.execute.mockResolvedValue(mockReorderedStatuses);
            const response = await (0, supertest_1.default)(app)
                .patch('/api/sale-status/reorder')
                .set('Authorization', 'Bearer valid-token')
                .send({
                statuses: [
                    { id: 'status-3', order: 1 },
                    { id: 'status-1', order: 2 },
                    { id: 'status-2', order: 3 },
                ],
            })
                .expect(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body[0].order).toBe(1);
        });
        it('should return 403 for permission errors', async () => {
            ServiceContainer_1.serviceContainer.reorderSaleStatusesUseCase.execute.mockRejectedValue(new Error('No tiene permiso'));
            const response = await (0, supertest_1.default)(app)
                .patch('/api/sale-status/reorder')
                .set('Authorization', 'Bearer valid-token')
                .send({ statuses: [{ id: 'status-1', order: 1 }] })
                .expect(403);
            expect(response.body).toHaveProperty('message', 'No tiene permiso');
        });
    });
    describe('DELETE /api/sale-status/:id', () => {
        it('should return 401 without authentication', async () => {
            await (0, supertest_1.default)(app)
                .delete('/api/sale-status/status-123')
                .expect(401);
        });
        it('should delete sale status', async () => {
            ServiceContainer_1.serviceContainer.deleteSaleStatusUseCase.execute.mockResolvedValue(undefined);
            const response = await (0, supertest_1.default)(app)
                .delete('/api/sale-status/status-123')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);
            expect(response.body).toHaveProperty('message', 'Estado de venta eliminado correctamente');
        });
        it('should return 404 for non-existent status', async () => {
            ServiceContainer_1.serviceContainer.deleteSaleStatusUseCase.execute.mockRejectedValue(new Error('Estado no encontrado'));
            const response = await (0, supertest_1.default)(app)
                .delete('/api/sale-status/nonexistent')
                .set('Authorization', 'Bearer valid-token')
                .expect(404);
            expect(response.body).toHaveProperty('message');
        });
        it('should return 403 for permission errors', async () => {
            ServiceContainer_1.serviceContainer.deleteSaleStatusUseCase.execute.mockRejectedValue(new Error('No tiene permiso'));
            const response = await (0, supertest_1.default)(app)
                .delete('/api/sale-status/status-123')
                .set('Authorization', 'Bearer valid-token')
                .expect(403);
            expect(response.body).toHaveProperty('message', 'No tiene permiso');
        });
    });
});
