import request from 'supertest';
import express, { Application } from 'express';
import productRoutes from '@infrastructure/routes/productRoutes';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { errorHandler } from '@infrastructure/express/middleware/errorHandler';
import { AuthorizationError, NotFoundError } from '@application/shared/AppError';

// Mock del serviceContainer
jest.mock('@infrastructure/container/ServiceContainer', () => ({
  serviceContainer: {
    listProductsUseCase: { execute: jest.fn() },
    getProductUseCase: { execute: jest.fn() },
    createProductUseCase: { execute: jest.fn() },
    updateProductUseCase: { execute: jest.fn() },
    toggleProductActiveUseCase: { execute: jest.fn() },
    productRepository: {
      findAllPaginated: jest.fn(),
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

describe('Integration: Product Routes', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/products', productRoutes);
    app.use((err: any, req: any, res: any, next: any) => errorHandler(err, req, res, next));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/products', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/products')
        .expect(401);
    });

    it('should list products with authentication', async () => {
      const mockProducts = [
        { id: 'prod-1', name: 'Product 1', price: 100, active: true },
        { id: 'prod-2', name: 'Product 2', price: 200, active: true },
      ];

      (serviceContainer.listProductsUseCase.execute as jest.Mock).mockResolvedValue(mockProducts);

      const response = await request(app)
        .get('/api/products')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });

    it('should return 403 for permission errors', async () => {
      (serviceContainer.listProductsUseCase.execute as jest.Mock).mockRejectedValue(
        new AuthorizationError('No tiene permiso')
      );

      const response = await request(app)
        .get('/api/products')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      expect(response.body).toHaveProperty('message', 'No tiene permiso');
    });
  });

  describe('GET /api/products/paginated', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/products/paginated')
        .expect(401);
    });

    it('should list products paginated', async () => {
      const mockResult = {
        data: [
          { toPrisma: () => ({ id: 'prod-1', name: 'Product 1', price: 100 }) },
          { toPrisma: () => ({ id: 'prod-2', name: 'Product 2', price: 200 }) },
        ],
        meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
      };

      (serviceContainer.productRepository.findAllPaginated as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/products/paginated?page=1&limit=10')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta.page).toBe(1);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/products/prod-123')
        .expect(401);
    });

    it('should get product by id', async () => {
      const mockProduct = {
        id: 'prod-123',
        name: 'Test Product',
        description: 'Description',
        price: 99.99,
        active: true,
      };

      (serviceContainer.getProductUseCase.execute as jest.Mock).mockResolvedValue(mockProduct);

      const response = await request(app)
        .get('/api/products/prod-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.id).toBe('prod-123');
      expect(response.body.name).toBe('Test Product');
    });

    it('should return 404 for non-existent product', async () => {
      (serviceContainer.getProductUseCase.execute as jest.Mock).mockRejectedValue(
        new NotFoundError('Producto', 'nonexistent')
      );

      const response = await request(app)
        .get('/api/products/nonexistent')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/products', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/products')
        .send({ name: 'Test', price: 100 })
        .expect(401);
    });

    it('should create a product with valid data', async () => {
      const mockProduct = {
        id: 'prod-new',
        name: 'New Product',
        description: 'New description',
        sku: 'SKU-123',
        price: 149.99,
        active: true,
      };

      (serviceContainer.createProductUseCase.execute as jest.Mock).mockResolvedValue(mockProduct);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'New Product',
          description: 'New description',
          sku: 'SKU-123',
          price: 149.99,
        })
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Producto creado correctamente');
      expect(response.body.product.name).toBe('New Product');
    });

    it('should return 403 for permission errors', async () => {
      (serviceContainer.createProductUseCase.execute as jest.Mock).mockRejectedValue(
        new AuthorizationError('No tiene permiso')
      );

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Test', price: 100 })
        .expect(403);

      expect(response.body).toHaveProperty('message', 'No tiene permiso');
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .put('/api/products/prod-123')
        .send({ name: 'Updated' })
        .expect(401);
    });

    it('should update product with valid data', async () => {
      const mockUpdatedProduct = {
        id: 'prod-123',
        name: 'Updated Product',
        price: 199.99,
        active: true,
      };

      (serviceContainer.updateProductUseCase.execute as jest.Mock).mockResolvedValue(mockUpdatedProduct);

      const response = await request(app)
        .put('/api/products/prod-123')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Product',
          price: 199.99,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Producto actualizado correctamente');
      expect(response.body.product.name).toBe('Updated Product');
    });

    it('should return 404 for non-existent product', async () => {
      (serviceContainer.updateProductUseCase.execute as jest.Mock).mockRejectedValue(
        new NotFoundError('Producto', 'nonexistent')
      );

      const response = await request(app)
        .put('/api/products/nonexistent')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Test' })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 for permission errors', async () => {
      (serviceContainer.updateProductUseCase.execute as jest.Mock).mockRejectedValue(
        new AuthorizationError('No tiene permiso')
      );

      const response = await request(app)
        .put('/api/products/prod-123')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Test' })
        .expect(403);

      expect(response.body).toHaveProperty('message', 'No tiene permiso');
    });
  });

  describe('PATCH /api/products/:id/toggle', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .patch('/api/products/prod-123/toggle')
        .expect(401);
    });

    it('should toggle product active status to inactive', async () => {
      const mockProduct = {
        id: 'prod-123',
        name: 'Test Product',
        active: false,
      };

      (serviceContainer.toggleProductActiveUseCase.execute as jest.Mock).mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/products/prod-123/toggle')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Producto desactivado correctamente');
      expect(response.body.product.active).toBe(false);
    });

    it('should toggle product active status to active', async () => {
      const mockProduct = {
        id: 'prod-123',
        name: 'Test Product',
        active: true,
      };

      (serviceContainer.toggleProductActiveUseCase.execute as jest.Mock).mockResolvedValue(mockProduct);

      const response = await request(app)
        .patch('/api/products/prod-123/toggle')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Producto activado correctamente');
      expect(response.body.product.active).toBe(true);
    });

    it('should return 404 for non-existent product', async () => {
      (serviceContainer.toggleProductActiveUseCase.execute as jest.Mock).mockRejectedValue(
        new NotFoundError('Producto', 'nonexistent')
      );

      const response = await request(app)
        .patch('/api/products/nonexistent/toggle')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 for permission errors', async () => {
      (serviceContainer.toggleProductActiveUseCase.execute as jest.Mock).mockRejectedValue(
        new AuthorizationError('No tiene permiso')
      );

      const response = await request(app)
        .patch('/api/products/prod-123/toggle')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      expect(response.body).toHaveProperty('message', 'No tiene permiso');
    });
  });
});
