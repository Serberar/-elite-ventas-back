import { Request, Response, NextFunction } from 'express';
import ipLib from 'ip';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { AuthenticationError, AuthorizationError } from '@application/shared/AppError';

const IP_FILTER_ALLOW_ALL_KEY = 'ip_filter_allow_all';

function normalizeIp(raw?: string): string | undefined {
  if (!raw) return undefined;
  if (raw.startsWith('::ffff:')) return raw.replace('::ffff:', '');
  if (raw === '::1') return '127.0.0.1';
  return raw;
}

function resolveClientIp(req: Request): string | undefined {
  return normalizeIp(req.ip);
}

export class AllowedIpController {
  static async listAllowedIps(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const ips = await serviceContainer.listAllowedIpsUseCase.execute(currentUser);
      res.status(200).json(ips);
    } catch (error) {
      next(error);
    }
  }

  static async createAllowedIp(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const allowedIp = await serviceContainer.createAllowedIpUseCase.execute(req.body, currentUser);
      res.status(201).json({ message: 'IP permitida creada correctamente', allowedIp });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAllowedIp(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { id } = req.params as Record<string, string>;
      await serviceContainer.deleteAllowedIpUseCase.execute(id, currentUser);
      res.status(200).json({ message: 'IP permitida eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/allowed-ips/my-ip — devuelve la IP del cliente y si está en la lista blanca */
  static async getMyIp(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const clientIp = resolveClientIp(req);
      const isPrivate = clientIp ? ipLib.isPrivate(clientIp) : false;

      const whitelistedIps = await serviceContainer.allowedIpRepository.listIpStrings(currentUser.empresaId);
      const isWhitelisted = clientIp ? whitelistedIps.includes(clientIp) : false;

      // La IP tiene acceso garantizado si es privada (red local) o está en la lista
      const alwaysAllowed = isPrivate || isWhitelisted;

      res.status(200).json({
        ip: clientIp ?? null,
        isWhitelisted,
        isPrivate,
        alwaysAllowed,
      });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/allowed-ips/filter-mode — devuelve el estado de filtrado actual */
  static async getFilterMode(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');
      if (currentUser.role !== 'administrador') {
        throw new AuthorizationError('Solo administradores pueden ver la configuración de filtrado');
      }

      const filteringEnabled = await serviceContainer.systemSettingRepository.getBool('ip_filter_enabled', currentUser.empresaId);
      const allowAll = await serviceContainer.systemSettingRepository.getBool(IP_FILTER_ALLOW_ALL_KEY, currentUser.empresaId);

      res.status(200).json({ filteringEnabled, allowAll });
    } catch (error) {
      next(error);
    }
  }

  /** PUT /api/allowed-ips/filter-mode — cambia el estado de filtrado */
  static async setFilterMode(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');
      if (currentUser.role !== 'administrador') {
        throw new AuthorizationError('Solo administradores pueden cambiar la configuración de filtrado');
      }

      const { filteringEnabled, allowAll } = req.body;

      if (filteringEnabled !== undefined) {
        if (typeof filteringEnabled !== 'boolean') {
          res.status(400).json({ message: 'El campo "filteringEnabled" debe ser un booleano' });
          return;
        }
        await serviceContainer.systemSettingRepository.set('ip_filter_enabled', filteringEnabled ? 'true' : 'false', currentUser.empresaId);
      }

      if (allowAll !== undefined) {
        if (typeof allowAll !== 'boolean') {
          res.status(400).json({ message: 'El campo "allowAll" debe ser un booleano' });
          return;
        }
        await serviceContainer.systemSettingRepository.set(IP_FILTER_ALLOW_ALL_KEY, allowAll ? 'true' : 'false', currentUser.empresaId);
      }

      res.status(200).json({ message: 'Configuración de filtrado actualizada' });
    } catch (error) {
      next(error);
    }
  }
}
