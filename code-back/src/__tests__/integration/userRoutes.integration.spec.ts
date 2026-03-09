import request from 'supertest';
import express, { Application } from 'express';
import userRoutes from '@infrastructure/routes/userRoutes';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { errorHandler } from '@infrastructure/express/middleware/errorHandler';
import { AuthorizationError, NotFoundError } from '@application/shared/AppError';

// Mock del serviceContainer
jest.mock('@infrastructure/container/ServiceContainer', () => ({
  serviceContainer: {
    registerUserUseCase: { execute: jest.fn() },
    loginUserUseCase: { execute: jest.fn() },
    refreshTokenUseCase: { execute: jest.fn() },
    logoutUserUseCase: { execute: jest.fn() },
    getAllUsersUseCase: { execute: jest.fn() },
    deleteUserUseCase: { execute: jest.fn() },
    updateUserUseCase: { execute: jest.fn() },
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

// Mock del rate limiter
jest.mock('@infrastructure/express/middleware/rateLimiter', () => ({
  authRateLimiter: (req: any, res: any, next: any) => next(),
}));

// Mock del CSRF middleware
jest.mock('@infrastructure/express/middleware/csrfMiddleware', () => ({
  csrfTokenEndpoint: (req: any, res: any) => res.json({ csrfToken: 'test-csrf-token' }),
  csrfProtection: (req: any, res: any, next: any) => next(),
  generateToken: jest.fn().mockReturnValue('test-csrf-token'),
}));

// Mock de cookieAuth
jest.mock('@infrastructure/express/utils/cookieAuth', () => ({
  setAuthCookies: jest.fn(),
  setAccessTokenCookie: jest.fn(),
  clearAuthCookies: jest.fn(),
  isCookieAuthEnabled: jest.fn().mockReturnValue(false),
  COOKIE_NAMES: {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
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

describe('Integration: User Routes', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/users', userRoutes);
    app.use((err: any, req: any, res: any, next: any) => errorHandler(err, req, res));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users/csrf-token', () => {
    it('should return csrf token', async () => {
      const response = await request(app)
        .get('/api/users/csrf-token')
        .expect(200);

      expect(response.body).toHaveProperty('csrfToken');
    });
  });

  describe('POST /api/users/register', () => {
    it('should register a new user with valid data', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'comercial',
      };

      (serviceContainer.registerUserUseCase.execute as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: 'testuser',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'comercial',
        })
        .expect(201);

      expect(response.body.user).toHaveProperty('id', 'user-123');
      expect(response.body.user).toHaveProperty('username', 'testuser');
    });

    it('should return 400 for registration error', async () => {
      (serviceContainer.registerUserUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Usuario ya existe')
      );

      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: 'existinguser',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'comercial',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Usuario ya existe');
    });
  });

  describe('POST /api/users/login', () => {
    it('should login successfully with correct credentials', async () => {
      const mockLoginResult = {
        user: {
          id: 'user-123',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          role: 'administrador',
        },
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
      };

      (serviceContainer.loginUserUseCase.execute as jest.Mock).mockResolvedValue(mockLoginResult);

      const response = await request(app)
        .post('/api/users/login')
        .send({
          username: 'testuser',
          password: 'Password123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken', 'access-token-123');
      expect(response.body).toHaveProperty('refreshToken', 'refresh-token-123');
      expect(response.body).toHaveProperty('username', 'testuser');
    });

    it('should return 401 for invalid credentials', async () => {
      (serviceContainer.loginUserUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Credenciales inválidas')
      );

      const response = await request(app)
        .post('/api/users/login')
        .send({
          username: 'wronguser',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/users/refresh', () => {
    it('should refresh token successfully', async () => {
      (serviceContainer.refreshTokenUseCase.execute as jest.Mock).mockResolvedValue({
        accessToken: 'new-access-token',
      });

      const response = await request(app)
        .post('/api/users/refresh')
        .send({
          refreshToken: 'valid-refresh-token',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken', 'new-access-token');
    });

    it('should return 401 for invalid refresh token', async () => {
      (serviceContainer.refreshTokenUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Token inválido')
      );

      const response = await request(app)
        .post('/api/users/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 when no refresh token provided', async () => {
      const response = await request(app)
        .post('/api/users/refresh')
        .send({})
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Refresh token no enviado');
    });
  });

  describe('POST /api/users/logout', () => {
    it('should logout successfully', async () => {
      (serviceContainer.logoutUserUseCase.execute as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/users/logout')
        .send({
          refreshToken: 'valid-refresh-token',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Sesión cerrada');
    });

    it('should return 200 even on logout error', async () => {
      (serviceContainer.logoutUserUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Error al cerrar sesión')
      );

      const response = await request(app)
        .post('/api/users/logout')
        .send({
          refreshToken: 'some-token',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Sesión cerrada');
    });
  });

  describe('GET /api/users', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });

    it('should return all users with valid token', async () => {
      const mockUsers = [
        { id: 'user-1', username: 'admin', firstName: 'Admin', lastName: 'User', role: 'administrador' },
        { id: 'user-2', username: 'comercial1', firstName: 'John', lastName: 'Doe', role: 'comercial' },
      ];

      (serviceContainer.getAllUsersUseCase.execute as jest.Mock).mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id', 'user-1');
      expect(response.body[1]).toHaveProperty('role', 'comercial');
      expect(serviceContainer.getAllUsersUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return 500 on internal error', async () => {
      (serviceContainer.getAllUsersUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Error de base de datos')
      );

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Error de base de datos');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .delete('/api/users/user-999')
        .expect(401);
    });

    it('should delete user successfully', async () => {
      (serviceContainer.deleteUserUseCase.execute as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/users/user-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Usuario eliminado correctamente');
      expect(serviceContainer.deleteUserUseCase.execute).toHaveBeenCalledWith('user-123');
    });

    it('should return 404 when user not found', async () => {
      (serviceContainer.deleteUserUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Usuario no encontrado')
      );

      const response = await request(app)
        .delete('/api/users/nonexistent-id')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Usuario no encontrado');
    });

    it('should return 500 on internal error', async () => {
      (serviceContainer.deleteUserUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Error de base de datos')
      );

      const response = await request(app)
        .delete('/api/users/user-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Error de base de datos');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .put('/api/users/user-123')
        .send({ firstName: 'Nuevo' })
        .expect(401);
    });

    it('should update user successfully', async () => {
      const mockUpdatedUser = {
        id: 'user-123',
        username: 'testuser',
        firstName: 'Nombre Actualizado',
        lastName: 'Apellido',
        role: 'comercial',
      };

      (serviceContainer.updateUserUseCase.execute as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const response = await request(app)
        .put('/api/users/user-123')
        .set('Authorization', 'Bearer valid-token')
        .send({ firstName: 'Nombre Actualizado' })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Usuario actualizado correctamente');
      expect(response.body.user).toHaveProperty('id', 'user-123');
      expect(response.body.user).toHaveProperty('firstName', 'Nombre Actualizado');
      expect(serviceContainer.updateUserUseCase.execute).toHaveBeenCalledWith('user-123', { firstName: 'Nombre Actualizado' });
    });

    it('should return 404 when user not found', async () => {
      (serviceContainer.updateUserUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Usuario no encontrado')
      );

      const response = await request(app)
        .put('/api/users/nonexistent-id')
        .set('Authorization', 'Bearer valid-token')
        .send({ firstName: 'Test' })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Usuario no encontrado');
    });

    it('should return 409 when username already in use', async () => {
      (serviceContainer.updateUserUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('El nombre de usuario ya está en uso')
      );

      const response = await request(app)
        .put('/api/users/user-123')
        .set('Authorization', 'Bearer valid-token')
        .send({ username: 'duplicado' })
        .expect(409);

      expect(response.body).toHaveProperty('error', 'El nombre de usuario ya está en uso');
    });

    it('should return 500 on internal error', async () => {
      (serviceContainer.updateUserUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Error de base de datos')
      );

      const response = await request(app)
        .put('/api/users/user-123')
        .set('Authorization', 'Bearer valid-token')
        .send({ firstName: 'Test' })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Error de base de datos');
    });
  });
});
