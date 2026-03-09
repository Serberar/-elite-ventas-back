import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import logger from '@infrastructure/observability/logger/logger';

/**
 * Middleware para validar request con esquemas Zod
 * Valida body, params, y query según el esquema proporcionado
 */
export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Log especial para logout
      if (req.path.includes('logout')) {
        logger.debug('Logout validation starting', {
          path: req.path,
          method: req.method,
          hasBody: !!req.body,
        });
      }

      // Log especial para clientes
      if (req.path.includes('clients') && req.method === 'POST') {
        logger.debug('Client creation validation starting', {
          path: req.path,
          method: req.method,
          bodyKeys: Object.keys(req.body),
        });
      }

      // Validar request completo (body, params, query)
      await schema.parseAsync({
        body: req.body as unknown,
        params: req.params,
        query: req.query,
      });

      if (req.path.includes('logout')) {
        logger.debug('Logout validation passed');
      }

      if (req.path.includes('clients') && req.method === 'POST') {
        logger.debug('Client validation passed');
      }

      logger.debug(`Validación exitosa para ${req.method} ${req.path}`);
      next();
    } catch (error) {
      if (req.path.includes('logout')) {
        logger.error('Logout validation failed', { error });
      }

      if (req.path.includes('clients') && req.method === 'POST') {
        logger.error('Client validation failed', { error });
        if (error instanceof ZodError) {
          logger.error('Zod validation errors', { issues: error.issues });
        }
      }

      if (error instanceof ZodError) {
        // Formatear errores de Zod con nombres de campo más amigables
        const fieldNames: Record<string, string> = {
          'body.firstName': 'Nombre',
          'body.lastName': 'Apellidos',
          'body.dni': 'DNI',
          'body.email': 'Email',
          'body.birthday': 'Fecha de nacimiento',
          'body.phones': 'Teléfonos',
          'body.addresses': 'Direcciones',
          'body.bankAccounts': 'Cuentas bancarias',
          'body.comments': 'Comentarios',
          'body.authorized': 'Persona autorizada',
          'body.businessName': 'Razón social',
        };

        const formattedErrors = error.issues.map((err: ZodIssue) => {
          const fieldPath = err.path.join('.');

          // Manejar campos de arrays con índices (ej: body.addresses.0.address)
          let friendlyField = fieldNames[fieldPath];
          if (!friendlyField) {
            // Intentar extraer el campo base y el índice
            const addressMatch = fieldPath.match(/body\.addresses\.(\d+)\.address/);
            const phoneMatch = fieldPath.match(/body\.phones\.(\d+)/);
            const bankMatch = fieldPath.match(/body\.bankAccounts\.(\d+)/);

            if (addressMatch) {
              friendlyField = `Dirección ${parseInt(addressMatch[1]) + 1}`;
            } else if (phoneMatch) {
              friendlyField = `Teléfono ${parseInt(phoneMatch[1]) + 1}`;
            } else if (bankMatch) {
              friendlyField = `Cuenta bancaria ${parseInt(bankMatch[1]) + 1}`;
            } else {
              friendlyField = fieldPath;
            }
          }

          return {
            field: friendlyField,
            path: fieldPath,
            message: err.message,
          };
        });

        logger.warn(
          `Validación fallida en ${req.method} ${req.path}: ${JSON.stringify(formattedErrors)}`
        );

        return res.status(400).json({
          message: 'Errores de validación',
          errors: formattedErrors,
        });
      }

      // Error inesperado
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error inesperado en validación: ${errorMessage}`);
      return res.status(500).json({
        message: 'Error interno del servidor',
      });
    }
  };
};
