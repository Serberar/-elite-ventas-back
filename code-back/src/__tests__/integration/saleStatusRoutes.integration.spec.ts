import request from 'supertest';
import express, { Application } from 'express';
import saleStatusRoutes from '@infrastructure/routes/saleStatusRoutes';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { errorHandler } from '@infrastructure/express/middleware/errorHandler';
import { AuthorizationError, NotFoundError } from '@application/shared/AppError';

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
  authMiddleware: (req: any, res: any, next: any) => {
    if (req.headers.authorization === 'Bearer valid-token') {
      req.user = { id: 'user-123', role: 'administrador', firstName: 'Admin' };
      next();
    } else {
      res.status(401).json({ message: 'No autorizado' });
    }
  },
}));

// Mock del validateRequest middleware
jest.mock('@infrastructure/express/middleware/validateRequest', () => ({
  validateRequest: () => (req: any, res: any, next: any) => next(),
}));

describe('Integration: Sale Status Routes', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/sale-status', saleStatusRoutes);
    app.use((err: any, req: any, res: any, next: any) => errorHandler(err, req, res));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/sale-status', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/sale-status')
        .expect(401);
    });

    it('should list sale statuses with authentication', async () => {
      const mockStatuses = [
        { id: 'status-1', name: 'Pendiente', order: 1, color: '#FFFF00', isFinal: false },
        { id: 'status-2', name: 'Completada', order: 2, color: '#00FF00', isFinal: true },
      ];

      (serviceContainer.listSaleStatusUseCase.execute as jest.Mock).mockResolvedValue(mockStatuses);

      const response = await request(app)
        .get('/api/sale-status')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Pendiente');
    });

    it('should return 403 for permission errors', async () => {
      (serviceContainer.listSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(
        new AuthorizationError('No tiene permiso')
      );

      const response = await request(app)
        .get('/api/sale-status')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      expect(response.body).toHaveProperty('message', 'No tiene permiso');
    });
  });

  describe('POST /api/sale-status', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
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

      (serviceContainer.createSaleStatusUseCase.execute as jest.Mock).mockResolvedValue(mockStatus);

      const response = await request(app)
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

      (serviceContainer.createSaleStatusUseCase.execute as jest.Mock).mockResolvedValue(mockStatus);

      const response = await request(app)
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
      (serviceContainer.createSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(
        new AuthorizationError('No tiene permiso')
      );

      const response = await request(app)
        .post('/api/sale-status')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Test', order: 1 })
        .expect(403);

      expect(response.body).toHaveProperty('message', 'No tiene permiso');
    });
  });

  describe('PUT /api/sale-status/:id', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
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

      (serviceContainer.updateSaleStatusUseCase.execute as jest.Mock).mockResolvedValue(mockUpdatedStatus);

      const response = await request(app)
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

      (serviceContainer.updateSaleStatusUseCase.execute as jest.Mock).mockResolvedValue(mockUpdatedStatus);

      const response = await request(app)
        .put('/api/sale-status/status-123')
        .set('Authorization', 'Bearer valid-token')
        .send({ isFinal: true })
        .expect(200);

      expect(response.body.status.isFinal).toBe(true);
    });

    it('should return 404 for non-existent status', async () => {
      (serviceContainer.updateSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(
        new NotFoundError('Estado', 'nonexistent')
      );

      const response = await request(app)
        .put('/api/sale-status/nonexistent')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Test' })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 for permission errors', async () => {
      (serviceContainer.updateSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(
        new AuthorizationError('No tiene permiso')
      );

      const response = await request(app)
        .put('/api/sale-status/status-123')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Test' })
        .expect(403);

      expect(response.body).toHaveProperty('message', 'No tiene permiso');
    });
  });

  describe('PATCH /api/sale-status/reorder', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
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

      (serviceContainer.reorderSaleStatusesUseCase.execute as jest.Mock).mockResolvedValue(mockReorderedStatuses);

      const response = await request(app)
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
      (serviceContainer.reorderSaleStatusesUseCase.execute as jest.Mock).mockRejectedValue(
        new AuthorizationError('No tiene permiso')
      );

      const response = await request(app)
        .patch('/api/sale-status/reorder')
        .set('Authorization', 'Bearer valid-token')
        .send({ statuses: [{ id: 'status-1', order: 1 }] })
        .expect(403);

      expect(response.body).toHaveProperty('message', 'No tiene permiso');
    });
  });

  describe('DELETE /api/sale-status/:id', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .delete('/api/sale-status/status-123')
        .expect(401);
    });

    it('should delete sale status', async () => {
      (serviceContainer.deleteSaleStatusUseCase.execute as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/sale-status/status-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Estado de venta eliminado correctamente');
    });

    it('should return 404 for non-existent status', async () => {
      (serviceContainer.deleteSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(
        new NotFoundError('Estado', 'nonexistent')
      );

      const response = await request(app)
        .delete('/api/sale-status/nonexistent')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 for permission errors', async () => {
      (serviceContainer.deleteSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(
        new AuthorizationError('No tiene permiso')
      );

      const response = await request(app)
        .delete('/api/sale-status/status-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      expect(response.body).toHaveProperty('message', 'No tiene permiso');
    });
  });
});
