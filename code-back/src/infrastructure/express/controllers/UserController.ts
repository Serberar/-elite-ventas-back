import { Request, Response } from 'express';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import logger from '@infrastructure/observability/logger/logger';
import { AuthRequest } from '@infrastructure/express/middleware/authMiddleware';
import {
  setAuthCookies,
  setAccessTokenCookie,
  clearAuthCookies,
  isCookieAuthEnabled,
  COOKIE_NAMES,
} from '@infrastructure/express/utils/cookieAuth';
import { generateToken } from '@infrastructure/express/middleware/csrfMiddleware';

// Tipos para los datos de entrada
interface RegisterBody {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  role: 'administrador' | 'coordinador' | 'comercial';
  empresaId?: string;
}

interface LoginBody {
  username: string;
  password: string;
}

interface RefreshTokenBody {
  refreshToken?: string; // Hacerlo opcional
}

export class UserController {
  static async getAll(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ error: 'No autorizado' });
      const users = await serviceContainer.getAllUsersUseCase.execute(currentUser.empresaId, currentUser.role);
      res.status(200).json(users);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al obtener usuarios';
      res.status(500).json({ error: errorMessage });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params as Record<string, string>;
      await serviceContainer.deleteUserUseCase.execute(id);
      res.status(200).json({ message: 'Usuario eliminado correctamente' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar usuario';
      const statusCode = errorMessage === 'Usuario no encontrado' ? 404 : 500;
      res.status(statusCode).json({ error: errorMessage });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ error: 'No autorizado' });
      const { id } = req.params as Record<string, string>;
      const updateData = req.body;
      const user = await serviceContainer.updateUserUseCase.execute(id, updateData, currentUser);
      res.status(200).json({ user, message: 'Usuario actualizado correctamente' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar usuario';
      let statusCode = 500;
      if (errorMessage === 'Usuario no encontrado') statusCode = 404;
      if (errorMessage === 'El nombre de usuario ya está en uso') statusCode = 409;
      res.status(statusCode).json({ error: errorMessage });
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ error: 'No autorizado' });
      const userData = req.body as RegisterBody;
      const user = await serviceContainer.registerUserUseCase.execute({
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        password: userData.password,
        role: userData.role,
        empresaId: userData.empresaId ?? currentUser.empresaId,
      });
      res.status(201).json({
        user: {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          active: user.active,
          failedLoginAttempts: user.failedLoginAttempts,
          empresaId: user.empresaId,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },
        message: 'Usuario creado correctamente',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al registrar usuario';
      res.status(400).json({ error: errorMessage });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const loginData = req.body as LoginBody;
      const { user, accessToken, refreshToken } = await serviceContainer.loginUserUseCase.execute({
        username: loginData.username,
        password: loginData.password,
      });

      // Preparar respuesta base
      const responseData = {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      };

      // Si USE_COOKIE_AUTH está habilitado, enviar tokens como httpOnly cookies
      if (isCookieAuthEnabled()) {
        setAuthCookies(res, accessToken, refreshToken);

        // Generar y enviar CSRF token para protección
        const csrfToken = generateToken(req, res);

        res.status(200).json({
          ...responseData,
          csrfToken, // El frontend debe enviar esto en header X-CSRF-Token
        });
      } else {
        // Modo tradicional: tokens en el cuerpo de la respuesta
        res.status(200).json({
          ...responseData,
          accessToken,
          refreshToken,
        });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Usuario o contraseña incorrectos';
      res.status(401).json({ error: errorMessage });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      let refreshTokenValue: string | undefined;

      // Si usamos cookies, obtener el refresh token de la cookie
      if (isCookieAuthEnabled()) {
        refreshTokenValue = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
      } else {
        // Modo tradicional: del body
        const refreshData = req.body as RefreshTokenBody;
        refreshTokenValue = refreshData.refreshToken;
      }

      if (!refreshTokenValue) {
        return res.status(401).json({ error: 'Refresh token no enviado' });
      }

      const { accessToken } = await serviceContainer.refreshTokenUseCase.execute(refreshTokenValue);

      // Si usamos cookies, actualizar la cookie del access token
      if (isCookieAuthEnabled()) {
        setAccessTokenCookie(res, accessToken);
        res.status(200).json({ message: 'Token actualizado' });
      } else {
        res.status(200).json({ accessToken });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Refresh token inválido';
      res.status(401).json({ error: errorMessage });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      // Sanitizar headers antes de loguear (excluir tokens y cookies)
      const sanitizedHeaders = { ...req.headers };
      delete sanitizedHeaders.authorization;
      delete sanitizedHeaders.cookie;

      logger.debug('Logout request headers', { headers: sanitizedHeaders });
      logger.debug('Logout request metadata', {
        contentType: req.get('Content-Type'),
        method: req.method,
        url: req.url,
      });

      let refreshTokenValue: string | undefined;

      // Obtener refresh token de cookie o body
      if (isCookieAuthEnabled()) {
        refreshTokenValue = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
      } else {
        const logoutData = req.body as RefreshTokenBody;
        refreshTokenValue = logoutData.refreshToken;
      }

      logger.debug('Logout data received', {
        hasRefreshToken: !!refreshTokenValue,
      });

      if (refreshTokenValue) {
        await serviceContainer.logoutUserUseCase.execute(refreshTokenValue);
      }

      // Limpiar cookies si están habilitadas
      if (isCookieAuthEnabled()) {
        clearAuthCookies(res);
      }

      logger.info('Logout successful');
      res.status(200).json({ message: 'Sesión cerrada' });
    } catch (error) {
      logger.error('Error during logout', { error });

      // Aún así limpiar cookies
      if (isCookieAuthEnabled()) {
        clearAuthCookies(res);
      }

      res.status(200).json({ message: 'Sesión cerrada' });
    }
  }

  static async getMe(req: AuthRequest, res: Response) {
    try {
      const { id, role, firstName, empresaId } = req.user!;

      let paginasHabilitadas: string[] = [];
      let paginaInicio: string | null = null;
      let colorPrimario: string | null = null;
      let logo: string | null = null;
      let empresaNombre: string | null = null;
      let colorNombreEmpresa: string | null = null;
      try {
        const empresa = await serviceContainer.getEmpresaUseCase.execute(empresaId);
        paginasHabilitadas = empresa.paginasHabilitadas;
        paginaInicio = empresa.paginaInicio ?? null;
        colorPrimario = empresa.colorPrimario ?? null;
        logo = empresa.logo ?? null;
        empresaNombre = empresa.nombre;
        colorNombreEmpresa = empresa.colorNombreEmpresa ?? null;
      } catch {
        // Empresa no encontrada → acceso total por defecto
      }

      res.status(200).json({ id, role, firstName, empresaId, paginasHabilitadas, paginaInicio, colorPrimario, logo, empresaNombre, colorNombreEmpresa });
    } catch (error) {
      logger.error('Error getting current user', { error });
      res.status(500).json({ error: 'Error al obtener usuario actual' });
    }
  }
}
