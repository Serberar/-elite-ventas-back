import { Request, Response, NextFunction } from 'express';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { AuthenticationError, ValidationError } from '@application/shared/AppError';

/** Claves permitidas de configuración (whitelist explícita) */
const ALLOWED_KEYS = new Set(['firma_requerida', 'ventas_sin_firma', 'requiere_autorizacion_llamada']);

export class SettingsController {
  // GET /api/settings/:key
  static async getSetting(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { key } = req.params as Record<string, string>;
      if (!ALLOWED_KEYS.has(key)) {
        return res.status(404).json({ message: `Configuración '${key}' no encontrada` });
      }

      // firma_requerida: default true; ventas_sin_firma: default false; requiere_autorizacion_llamada: default true
      const defaultValue = key === 'ventas_sin_firma' ? false : true;
      const value = await serviceContainer.getSystemSettingUseCase.executeAsBool(key, currentUser.empresaId, defaultValue);
      res.status(200).json({ key, value });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/settings/:key
  static async setSetting(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { key } = req.params as Record<string, string>;
      if (!ALLOWED_KEYS.has(key)) {
        return res.status(404).json({ message: `Configuración '${key}' no encontrada` });
      }

      const { value } = req.body;
      if (typeof value !== 'boolean') {
        throw new ValidationError('El campo value debe ser un booleano');
      }

      await serviceContainer.setSystemSettingUseCase.execute(key, String(value), currentUser);
      res.status(200).json({ key, value });
    } catch (error) {
      next(error);
    }
  }
}
