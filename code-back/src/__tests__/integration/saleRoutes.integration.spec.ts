import request from 'supertest';
import express, { Application } from 'express';
import saleRoutes from '@infrastructure/routes/saleRoutes';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { errorHandler } from '@infrastructure/express/middleware/errorHandler';
import { AuthorizationError, NotFoundError } from '@application/shared/AppError';

// Mock del serviceContainer
jest.mock('@infrastructure/container/ServiceContainer', () => ({
  serviceContainer: {
    createSaleWithProductsUseCase: { execute: jest.fn() },
    addSaleItemUseCase: { execute: jest.fn() },
    updateSaleItemUseCase: { execute: jest.fn() },
    removeSaleItemUseCase: { execute: jest.fn() },
    changeSaleStatusUseCase: { execute: jest.fn() },
    updateClientSnapshotUseCase: { execute: jest.fn() },
    getSalesStatsUseCase: { execute: jest.fn() },
    saleRepository: {
      findWithRelations: jest.fn(),
      listWithRelations: jest.fn(),
      listPaginatedWithRelations: jest.fn(),
      getDistinctComerciales: jest.fn(),
    },
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

const mockSaleWithRelations = {
  sale: {
    id: 'sale-123',
    toPrisma: () => ({
      id: 'sale-123',
      clientId: 'client-123',
      statusId: 'status-1',
      totalAmount: 200,
      notes: null,
      metadata: null,
      clientSnapshot: { firstName: 'John', lastName: 'Doe' },
      addressSnapshot: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      closedAt: null,
    }),
  },
  status: { id: 'status-1', name: 'Pendiente', order: 1, color: '#FFFF00', isFinal: false },
  items: [
    {
      toPrisma: () => ({
        id: 'item-1',
        saleId: 'sale-123',
        productId: 'prod-1',
        nameSnapshot: 'Product 1',
        skuSnapshot: 'SKU-1',
        unitPrice: 100,
        quantity: 2,
        finalPrice: 200,
      }),
    },
  ],
  assignments: [],
  histories: [],
  signatureRequest: null,
};

describe('Integration: Sale Routes', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/sales', saleRoutes);
    app.use((err: any, req: any, res: any, next: any) => errorHandler(err, req, res, next));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/sales/stats', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/sales/stats')
        .expect(401);
    });

    it('should get sales stats', async () => {
      const mockStats = {
        totalSales: 100,
        totalRevenue: 50000,
        averageOrderValue: 500,
      };

      (serviceContainer.getSalesStatsUseCase.execute as jest.Mock).mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/sales/stats')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('totalSales', 100);
      expect(response.body).toHaveProperty('totalRevenue', 50000);
    });

    it('should return 403 for permission errors', async () => {
      (serviceContainer.getSalesStatsUseCase.execute as jest.Mock).mockRejectedValue(
        new AuthorizationError('No tiene permiso')
      );

      const response = await request(app)
        .get('/api/sales/stats')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      expect(response.body).toHaveProperty('message', 'No tiene permiso');
    });
  });

  describe('GET /api/sales/comerciales', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/sales/comerciales')
        .expect(401);
    });

    it('should return list of distinct comerciales', async () => {
      const mockComerciales = [
        { id: 'user-1', firstName: 'Juan', lastName: 'García', username: 'jgarcia' },
        { id: 'user-2', firstName: 'María', lastName: 'López', username: 'mlopez' },
      ];

      (serviceContainer.saleRepository.getDistinctComerciales as jest.Mock).mockResolvedValue(mockComerciales);

      const response = await request(app)
        .get('/api/sales/comerciales')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id', 'user-1');
      expect(response.body[1]).toHaveProperty('firstName', 'María');
      expect(serviceContainer.saleRepository.getDistinctComerciales).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no comerciales exist', async () => {
      (serviceContainer.saleRepository.getDistinctComerciales as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/sales/comerciales')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should return 500 on internal error', async () => {
      (serviceContainer.saleRepository.getDistinctComerciales as jest.Mock).mockRejectedValue(
        new Error('Error de base de datos')
      );

      const response = await request(app)
        .get('/api/sales/comerciales')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/sales', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/sales')
        .expect(401);
    });

    it('should list all sales', async () => {
      (serviceContainer.saleRepository.listWithRelations as jest.Mock).mockResolvedValue([mockSaleWithRelations]);

      const response = await request(app)
        .get('/api/sales')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter sales by clientId', async () => {
      (serviceContainer.saleRepository.listWithRelations as jest.Mock).mockResolvedValue([mockSaleWithRelations]);

      const response = await request(app)
        .get('/api/sales?clientId=client-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter sales by statusId', async () => {
      (serviceContainer.saleRepository.listWithRelations as jest.Mock).mockResolvedValue([mockSaleWithRelations]);

      const response = await request(app)
        .get('/api/sales?statusId=status-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 403 for permission errors', async () => {
      (serviceContainer.saleRepository.listWithRelations as jest.Mock).mockRejectedValue(
        new AuthorizationError('No tiene permiso')
      );

      const response = await request(app)
        .get('/api/sales')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      expect(response.body).toHaveProperty('message', 'No tiene permiso');
    });
  });

  describe('GET /api/sales/paginated', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/sales/paginated')
        .expect(401);
    });

    it('should list sales paginated', async () => {
      const mockResult = {
        data: [mockSaleWithRelations],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      (serviceContainer.saleRepository.listPaginatedWithRelations as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/sales/paginated?page=1&limit=10')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
    });
  });

  describe('GET /api/sales/:saleId', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/sales/sale-123')
        .expect(401);
    });

    it('should get sale by id', async () => {
      (serviceContainer.saleRepository.findWithRelations as jest.Mock).mockResolvedValue(mockSaleWithRelations);

      const response = await request(app)
        .get('/api/sales/sale-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.id).toBe('sale-123');
    });

    it('should return 404 for non-existent sale', async () => {
      (serviceContainer.saleRepository.findWithRelations as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/sales/nonexistent')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/sales', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/sales')
        .send({ client: { firstName: 'John' }, items: [] })
        .expect(401);
    });

    it('should create a sale with products', async () => {
      const mockCreatedSale = { id: 'sale-new' };

      (serviceContainer.createSaleWithProductsUseCase.execute as jest.Mock).mockResolvedValue(mockCreatedSale);
      (serviceContainer.saleRepository.findWithRelations as jest.Mock).mockResolvedValue(mockSaleWithRelations);

      const response = await request(app)
        .post('/api/sales')
        .set('Authorization', 'Bearer valid-token')
        .send({
          client: { firstName: 'John', lastName: 'Doe' },
          items: [{ productId: 'prod-1', name: 'Product 1', quantity: 2, price: 100 }],
        })
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Venta creada correctamente');
      expect(response.body).toHaveProperty('sale');
    });

    it('should return 403 for permission errors', async () => {
      (serviceContainer.createSaleWithProductsUseCase.execute as jest.Mock).mockRejectedValue(
        new AuthorizationError('No tiene permiso')
      );

      const response = await request(app)
        .post('/api/sales')
        .set('Authorization', 'Bearer valid-token')
        .send({ client: { firstName: 'John' }, items: [] })
        .expect(403);

      expect(response.body).toHaveProperty('message', 'No tiene permiso');
    });
  });

  describe('POST /api/sales/:saleId/items', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/sales/sale-123/items')
        .send({ name: 'Item', quantity: 1, price: 100 })
        .expect(401);
    });

    it('should add item to sale', async () => {
      (serviceContainer.addSaleItemUseCase.execute as jest.Mock).mockResolvedValue({});
      (serviceContainer.saleRepository.findWithRelations as jest.Mock).mockResolvedValue(mockSaleWithRelations);

      const response = await request(app)
        .post('/api/sales/sale-123/items')
        .set('Authorization', 'Bearer valid-token')
        .send({
          productId: 'prod-1',
          name: 'Product 1',
          quantity: 3,
          price: 100,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Item añadido a la venta correctamente');
      expect(response.body).toHaveProperty('sale');
    });

    it('should return 404 for non-existent sale', async () => {
      (serviceContainer.addSaleItemUseCase.execute as jest.Mock).mockRejectedValue(
        new NotFoundError('Venta', 'nonexistent')
      );

      const response = await request(app)
        .post('/api/sales/nonexistent/items')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Item', quantity: 1, price: 100 })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 for permission errors', async () => {
      (serviceContainer.addSaleItemUseCase.execute as jest.Mock).mockRejectedValue(
        new AuthorizationError('No tiene permiso')
      );

      const response = await request(app)
        .post('/api/sales/sale-123/items')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Item', quantity: 1, price: 100 })
        .expect(403);

      expect(response.body).toHaveProperty('message', 'No tiene permiso');
    });
  });

  describe('PUT /api/sales/:saleId/items/:itemId', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .put('/api/sales/sale-123/items/item-1')
        .send({ quantity: 5 })
        .expect(401);
    });

    it('should update sale item', async () => {
      (serviceContainer.updateSaleItemUseCase.execute as jest.Mock).mockResolvedValue({});
      (serviceContainer.saleRepository.findWithRelations as jest.Mock).mockResolvedValue(mockSaleWithRelations);

      const response = await request(app)
        .put('/api/sales/sale-123/items/item-1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          quantity: 5,
          unitPrice: 100,
          finalPrice: 500,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Item actualizado correctamente');
      expect(response.body).toHaveProperty('sale');
    });

    it('should return 404 for non-existent item', async () => {
      (serviceContainer.updateSaleItemUseCase.execute as jest.Mock).mockRejectedValue(
        new NotFoundError('Item', 'nonexistent')
      );

      const response = await request(app)
        .put('/api/sales/sale-123/items/nonexistent')
        .set('Authorization', 'Bearer valid-token')
        .send({ quantity: 5 })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('DELETE /api/sales/:saleId/items/:itemId', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .delete('/api/sales/sale-123/items/item-1')
        .expect(401);
    });

    it('should remove item from sale', async () => {
      (serviceContainer.removeSaleItemUseCase.execute as jest.Mock).mockResolvedValue({});
      (serviceContainer.saleRepository.findWithRelations as jest.Mock).mockResolvedValue({
        ...mockSaleWithRelations,
        items: [],
      });

      const response = await request(app)
        .delete('/api/sales/sale-123/items/item-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Item eliminado correctamente');
    });

    it('should return 404 for non-existent item', async () => {
      (serviceContainer.removeSaleItemUseCase.execute as jest.Mock).mockRejectedValue(
        new NotFoundError('Item', 'nonexistent')
      );

      const response = await request(app)
        .delete('/api/sales/sale-123/items/nonexistent')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PATCH /api/sales/:saleId/status', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .patch('/api/sales/sale-123/status')
        .send({ statusId: 'status-2' })
        .expect(401);
    });

    it('should change sale status', async () => {
      const mockUpdatedSale = { id: 'sale-123', statusId: 'status-2' };

      (serviceContainer.changeSaleStatusUseCase.execute as jest.Mock).mockResolvedValue(mockUpdatedSale);
      (serviceContainer.saleRepository.findWithRelations as jest.Mock).mockResolvedValue({
        ...mockSaleWithRelations,
        status: { id: 'status-2', name: 'Completada', order: 2, color: '#00FF00', isFinal: true },
      });

      const response = await request(app)
        .patch('/api/sales/sale-123/status')
        .set('Authorization', 'Bearer valid-token')
        .send({ statusId: 'status-2' })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Estado de venta cambiado correctamente');
      expect(response.body).toHaveProperty('sale');
    });

    it('should return 404 for non-existent sale', async () => {
      (serviceContainer.changeSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(
        new NotFoundError('Venta', 'nonexistent')
      );

      const response = await request(app)
        .patch('/api/sales/nonexistent/status')
        .set('Authorization', 'Bearer valid-token')
        .send({ statusId: 'status-2' })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 for permission errors', async () => {
      (serviceContainer.changeSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(
        new AuthorizationError('No tiene permiso')
      );

      const response = await request(app)
        .patch('/api/sales/sale-123/status')
        .set('Authorization', 'Bearer valid-token')
        .send({ statusId: 'status-2' })
        .expect(403);

      expect(response.body).toHaveProperty('message', 'No tiene permiso');
    });
  });

  describe('PATCH /api/sales/:saleId/client', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .patch('/api/sales/sale-123/client')
        .send({ clientSnapshot: { firstName: 'Updated' } })
        .expect(401);
    });

    it('should update client snapshot', async () => {
      const mockUpdatedSale = {
        id: 'sale-123',
        clientSnapshot: { firstName: 'Updated', lastName: 'Name' },
      };

      (serviceContainer.updateClientSnapshotUseCase.execute as jest.Mock).mockResolvedValue(mockUpdatedSale);

      const response = await request(app)
        .patch('/api/sales/sale-123/client')
        .set('Authorization', 'Bearer valid-token')
        .send({
          clientSnapshot: { firstName: 'Updated', lastName: 'Name' },
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Datos del cliente actualizados correctamente');
    });

    it('should return 400 when clientSnapshot is missing', async () => {
      const response = await request(app)
        .patch('/api/sales/sale-123/client')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message', 'El clientSnapshot es requerido');
    });

    it('should return 404 for non-existent sale', async () => {
      (serviceContainer.updateClientSnapshotUseCase.execute as jest.Mock).mockRejectedValue(
        new NotFoundError('Venta', 'nonexistent')
      );

      const response = await request(app)
        .patch('/api/sales/nonexistent/client')
        .set('Authorization', 'Bearer valid-token')
        .send({ clientSnapshot: { firstName: 'Test' } })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });
});
