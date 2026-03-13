import request from 'supertest';
import express, { Application } from 'express';
import clientRoutes from '@infrastructure/routes/clientRoutes';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { errorHandler } from '@infrastructure/express/middleware/errorHandler';
import { AuthorizationError, NotFoundError } from '@application/shared/AppError';

// Mock del serviceContainer
jest.mock('@infrastructure/container/ServiceContainer', () => ({
  serviceContainer: {
    getClientUseCase: { execute: jest.fn() },
    createClientUseCase: { execute: jest.fn() },
    updateClientUseCase: { execute: jest.fn() },
    pushDataClientUseCase: { execute: jest.fn() },
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

describe('Integration: Client Routes', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/clients', clientRoutes);
    // Wrap errorHandler with 4 params so Express recognizes it as an error handler
    app.use((err: any, req: any, res: any, next: any) => errorHandler(err, req, res, next));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/clients/:value', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/clients/12345678')
        .expect(401);
    });

    it('should get client by DNI or phone', async () => {
      const mockClients = [
        {
          id: 'client-123',
          firstName: 'John',
          lastName: 'Doe',
          dni: '12345678A',
          email: 'john@example.com',
          phones: ['612345678'],
        },
      ];

      (serviceContainer.getClientUseCase.execute as jest.Mock).mockResolvedValue(mockClients);

      const response = await request(app)
        .get('/api/clients/12345678A')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].dni).toBe('12345678A');
    });

    it('should return 404 when client not found', async () => {
      (serviceContainer.getClientUseCase.execute as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/clients/nonexistent')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 for permission errors', async () => {
      (serviceContainer.getClientUseCase.execute as jest.Mock).mockRejectedValue(
        new AuthorizationError('No tiene permiso')
      );

      const response = await request(app)
        .get('/api/clients/12345678')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      expect(response.body).toHaveProperty('message', 'No tiene permiso');
    });
  });

  describe('POST /api/clients', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/clients')
        .send({ firstName: 'John', lastName: 'Doe' })
        .expect(401);
    });

    it('should create a client with valid data', async () => {
      const mockClient = {
        id: 'client-123',
        firstName: 'John',
        lastName: 'Doe',
        dni: '12345678A',
        email: 'john@example.com',
        phones: ['612345678'],
        birthday: '1990-01-01',
      };

      (serviceContainer.createClientUseCase.execute as jest.Mock).mockResolvedValue(mockClient);

      const response = await request(app)
        .post('/api/clients')
        .set('Authorization', 'Bearer valid-token')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          dni: '12345678A',
          email: 'john@example.com',
          phones: ['612345678'],
          birthday: '1990-01-01',
        })
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Cliente creado correctamente');
      expect(response.body.client.firstName).toBe('John');
    });

    it('should return 500 for creation errors', async () => {
      (serviceContainer.createClientUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Error al crear cliente')
      );

      const response = await request(app)
        .post('/api/clients')
        .set('Authorization', 'Bearer valid-token')
        .send({
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(500);

      expect(response.body).toHaveProperty('status', 'error');
    });
  });

  describe('PUT /api/clients/:id', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .put('/api/clients/client-123')
        .send({ firstName: 'Updated' })
        .expect(401);
    });

    it('should update client with valid data', async () => {
      const mockUpdatedClient = {
        id: 'client-123',
        firstName: 'Updated',
        lastName: 'Name',
        dni: '12345678A',
        email: 'updated@example.com',
      };

      (serviceContainer.updateClientUseCase.execute as jest.Mock).mockResolvedValue(mockUpdatedClient);

      const response = await request(app)
        .put('/api/clients/client-123')
        .set('Authorization', 'Bearer valid-token')
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Cliente editado correctamente');
      expect(response.body.client.firstName).toBe('Updated');
    });

    it('should return 500 for update errors', async () => {
      (serviceContainer.updateClientUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Error al actualizar')
      );

      const response = await request(app)
        .put('/api/clients/client-123')
        .set('Authorization', 'Bearer valid-token')
        .send({ firstName: 'Test' })
        .expect(500);

      expect(response.body).toHaveProperty('status', 'error');
    });
  });

  describe('POST /api/clients/:id/push', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/clients/client-123/push')
        .send({ phones: ['987654321'] })
        .expect(401);
    });

    it('should push data to client', async () => {
      const mockUpdatedClient = {
        id: 'client-123',
        firstName: 'John',
        lastName: 'Doe',
        phones: ['612345678', '987654321'],
      };

      (serviceContainer.pushDataClientUseCase.execute as jest.Mock).mockResolvedValue(mockUpdatedClient);

      const response = await request(app)
        .post('/api/clients/client-123/push')
        .set('Authorization', 'Bearer valid-token')
        .send({
          phones: ['987654321'],
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Datos del cliente añadidos correctamente');
      expect(response.body.client.phones).toContain('987654321');
    });

    it('should return 404 when client not found', async () => {
      (serviceContainer.pushDataClientUseCase.execute as jest.Mock).mockRejectedValue(
        new NotFoundError('Cliente', 'nonexistent')
      );

      const response = await request(app)
        .post('/api/clients/nonexistent/push')
        .set('Authorization', 'Bearer valid-token')
        .send({ phones: ['123456789'] })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should push addresses to client', async () => {
      const mockUpdatedClient = {
        id: 'client-123',
        firstName: 'John',
        lastName: 'Doe',
        addresses: [{ address: 'Calle Nueva 123', cupsLuz: 'ES123', cupsGas: null }],
      };

      (serviceContainer.pushDataClientUseCase.execute as jest.Mock).mockResolvedValue(mockUpdatedClient);

      const response = await request(app)
        .post('/api/clients/client-123/push')
        .set('Authorization', 'Bearer valid-token')
        .send({
          addresses: [{ address: 'Calle Nueva 123', cupsLuz: 'ES123' }],
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Datos del cliente añadidos correctamente');
    });

    it('should push comments to client', async () => {
      const mockUpdatedClient = {
        id: 'client-123',
        firstName: 'John',
        lastName: 'Doe',
        comments: ['Comentario anterior', 'Nuevo comentario'],
      };

      (serviceContainer.pushDataClientUseCase.execute as jest.Mock).mockResolvedValue(mockUpdatedClient);

      const response = await request(app)
        .post('/api/clients/client-123/push')
        .set('Authorization', 'Bearer valid-token')
        .send({
          comments: ['Nuevo comentario'],
        })
        .expect(200);

      expect(response.body.client.comments).toContain('Nuevo comentario');
    });

    it('should push bank accounts to client', async () => {
      const mockUpdatedClient = {
        id: 'client-123',
        firstName: 'John',
        lastName: 'Doe',
        bankAccounts: ['ES1234567890123456789012'],
      };

      (serviceContainer.pushDataClientUseCase.execute as jest.Mock).mockResolvedValue(mockUpdatedClient);

      const response = await request(app)
        .post('/api/clients/client-123/push')
        .set('Authorization', 'Bearer valid-token')
        .send({
          bankAccounts: ['ES1234567890123456789012'],
        })
        .expect(200);

      expect(response.body.client.bankAccounts).toContain('ES1234567890123456789012');
    });
  });
});
