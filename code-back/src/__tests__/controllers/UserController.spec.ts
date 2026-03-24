import { UserController } from '@infrastructure/express/controllers/UserController';
import { Request, Response } from 'express';
import { User } from '@domain/entities/User';

jest.mock('@infrastructure/container/ServiceContainer', () => ({
  serviceContainer: {
    registerUserUseCase: { execute: jest.fn() },
    loginUserUseCase: { execute: jest.fn() },
    refreshTokenUseCase: { execute: jest.fn() },
    logoutUserUseCase: { execute: jest.fn() },
    getAllUsersUseCase: { execute: jest.fn() },
    deleteUserUseCase: { execute: jest.fn() },
    updateUserUseCase: { execute: jest.fn() },
    getEmpresaUseCase: { execute: jest.fn() },
  },
}));

jest.mock('@infrastructure/express/utils/cookieAuth', () => ({
  isCookieAuthEnabled: jest.fn().mockReturnValue(false),
  setAuthCookies: jest.fn(),
  setAccessTokenCookie: jest.fn(),
  clearAuthCookies: jest.fn(),
  COOKIE_NAMES: { REFRESH_TOKEN: 'refreshToken', ACCESS_TOKEN: 'accessToken' },
}));

jest.mock('@infrastructure/express/middleware/csrfMiddleware', () => ({
  generateToken: jest.fn().mockReturnValue('csrf-token'),
}));

jest.mock('@infrastructure/observability/logger/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

import { serviceContainer } from '@infrastructure/container/ServiceContainer';

describe('UserController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const mockUser: User = {
    id: 'user-1',
    firstName: 'Juan',
    lastName: 'Pérez',
    username: 'juan123',
    password: 'hashed',
    role: 'administrador',
    lastLoginAt: null,
    toPrisma: () => ({}),
  } as any;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();

    req = {
      body: {},
      get: jest.fn().mockReturnValue('application/json'), // Mock del método get()
      headers: {},
      method: 'POST',
      url: '/api/users/logout',
    };
    res = { status: statusMock, json: jsonMock };
    jest.clearAllMocks();
  });

  // REGISTER
  it('register: debería registrar un usuario correctamente', async () => {
    (serviceContainer.registerUserUseCase.execute as jest.Mock).mockResolvedValue(mockUser);
    req.user = { id: 'admin-1', role: 'administrador', firstName: 'Admin', empresaId: '00000000-0000-0000-0000-000000000001' } as any;
    req.body = {
      firstName: 'Juan',
      lastName: 'Pérez',
      username: 'juan123',
      password: '123456',
      role: 'administrador',
    };

    await UserController.register(req as Request, res as Response);

    expect(serviceContainer.registerUserUseCase.execute).toHaveBeenCalledWith({
      firstName: 'Juan',
      lastName: 'Pérez',
      username: 'juan123',
      password: '123456',
      role: 'administrador',
      empresaId: '00000000-0000-0000-0000-000000000001',
    });
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith({
      user: {
        id: mockUser.id,
        username: mockUser.username,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        lastLoginAt: mockUser.lastLoginAt,
      },
      message: 'Usuario creado correctamente',
    });
  });

  it('register: debería devolver 400 si hay error', async () => {
    (serviceContainer.registerUserUseCase.execute as jest.Mock).mockRejectedValue(
      new Error('Error registro')
    );
    req.user = { id: 'admin-1', role: 'administrador', firstName: 'Admin', empresaId: '00000000-0000-0000-0000-000000000001' } as any;
    req.body = {};

    await UserController.register(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Error registro',
    });
  });

  // LOGIN
  it('login: debería iniciar sesión correctamente y devolver tokens', async () => {
    const mockTokens = {
      user: mockUser,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    };
    (serviceContainer.loginUserUseCase.execute as jest.Mock).mockResolvedValue(mockTokens);
    req.body = { username: 'juan123', password: '123456' };

    await UserController.login(req as Request, res as Response);

    expect(serviceContainer.loginUserUseCase.execute).toHaveBeenCalledWith({
      username: 'juan123',
      password: '123456',
    });
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      id: mockUser.id,
      username: mockUser.username,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      role: mockUser.role,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('login: debería devolver 401 si hay error', async () => {
    (serviceContainer.loginUserUseCase.execute as jest.Mock).mockRejectedValue(new Error('Error login'));
    req.body = { username: 'juan123', password: '123456' };

    await UserController.login(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Error login',
    });
  });

  // REFRESH
  it('refresh: debería devolver un nuevo access token', async () => {
    (serviceContainer.refreshTokenUseCase.execute as jest.Mock).mockResolvedValue({
      accessToken: 'newAccessToken',
      user: mockUser,
    });
    req.body = { refreshToken: 'valid-refresh-token' };

    await UserController.refresh(req as Request, res as Response);

    expect(serviceContainer.refreshTokenUseCase.execute).toHaveBeenCalledWith('valid-refresh-token');
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      accessToken: 'newAccessToken',
    });
  });

  it('refresh: debería devolver 401 si no hay token en el body', async () => {
    req.body = {}; // Sin refreshToken en el body

    await UserController.refresh(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Refresh token no enviado',
    });
  });

  // LOGOUT
  it('logout: debería limpiar refreshToken y devolver 200 si el token es válido', async () => {
    (serviceContainer.logoutUserUseCase.execute as jest.Mock).mockResolvedValue(undefined);
    req.body = { refreshToken: 'valid-refresh-token' };

    await UserController.logout(req as Request, res as Response);

    expect(serviceContainer.logoutUserUseCase.execute).toHaveBeenCalledWith('valid-refresh-token');
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Sesión cerrada',
    });
  });

  it('logout: debería devolver 200 incluso si no hay refreshToken', async () => {
    req.body = {}; // Sin refreshToken

    await UserController.logout(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Sesión cerrada',
    });
  });

  // GET ME
  it('getMe: debería devolver datos del usuario con paginasHabilitadas', async () => {
    const mockEmpresa = { paginasHabilitadas: ['ventas', 'buscador'] };
    (serviceContainer.getEmpresaUseCase.execute as jest.Mock).mockResolvedValue(mockEmpresa);

    req = {
      ...req,
      user: {
        id: 'user-1',
        role: 'administrador',
        firstName: 'Juan',
        empresaId: '00000000-0000-0000-0000-000000000001',
      } as any,
    };

    await UserController.getMe(req as any, res as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        role: 'administrador',
        firstName: 'Juan',
        empresaId: '00000000-0000-0000-0000-000000000001',
        paginasHabilitadas: ['ventas', 'buscador'],
      })
    );
  });

  it('getMe: devuelve paginasHabilitadas vacío si empresa no encontrada', async () => {
    (serviceContainer.getEmpresaUseCase.execute as jest.Mock).mockRejectedValue(
      new Error('Empresa con ID xxx no encontrado')
    );

    req = {
      ...req,
      user: {
        id: 'user-1',
        role: 'comercial',
        firstName: 'Maria',
        empresaId: 'nonexistent-id',
      } as any,
    };

    await UserController.getMe(req as any, res as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ paginasHabilitadas: [] })
    );
  });
});
