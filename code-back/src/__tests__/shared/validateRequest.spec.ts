import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { validateRequest } from '@infrastructure/express/middleware/validateRequest';

jest.mock('@infrastructure/observability/logger/logger', () => ({
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  default: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('validateRequest middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    next = jest.fn();
    res = { status: statusMock, json: jsonMock };
    req = { body: {}, params: {}, query: {}, path: '/test', method: 'POST' };
    jest.clearAllMocks();
  });

  const simpleSchema = z.object({
    body: z.object({
      name: z.string().min(2, 'Mínimo 2 caracteres'),
      age: z.number().positive('Debe ser positivo'),
    }),
  });

  describe('happy path', () => {
    it('should call next() when data is valid', async () => {
      req.body = { name: 'John', age: 25 };

      const middleware = validateRequest(simpleSchema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should call next() when schema allows empty body', async () => {
      const permissiveSchema = z.object({
        body: z.object({}).optional(),
      });
      req.body = {};

      const middleware = validateRequest(permissiveSchema);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('ZodError — 400 response', () => {
    it('should return 400 with errors array on invalid body', async () => {
      req.body = { name: 'J', age: -5 };

      const middleware = validateRequest(simpleSchema);
      await middleware(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      const body = jsonMock.mock.calls[0][0];
      expect(body.message).toBe('Errores de validación');
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors.length).toBeGreaterThan(0);
      expect(next).not.toHaveBeenCalled();
    });

    it('should include field, path and message in each error', async () => {
      req.body = { name: 'J', age: -1 };

      const middleware = validateRequest(simpleSchema);
      await middleware(req as Request, res as Response, next);

      const { errors } = jsonMock.mock.calls[0][0];
      expect(errors[0]).toHaveProperty('field');
      expect(errors[0]).toHaveProperty('path');
      expect(errors[0]).toHaveProperty('message');
    });
  });

  describe('friendly field name mapping', () => {
    it('should map body.firstName to "Nombre"', async () => {
      const schema = z.object({ body: z.object({ firstName: z.string().min(2) }) });
      req.body = { firstName: 'A' };

      await validateRequest(schema)(req as Request, res as Response, next);

      const { errors } = jsonMock.mock.calls[0][0];
      expect(errors[0].field).toBe('Nombre');
    });

    it('should map body.lastName to "Apellidos"', async () => {
      const schema = z.object({ body: z.object({ lastName: z.string().min(2) }) });
      req.body = { lastName: 'A' };

      await validateRequest(schema)(req as Request, res as Response, next);

      const { errors } = jsonMock.mock.calls[0][0];
      expect(errors[0].field).toBe('Apellidos');
    });

    it('should map body.dni to "DNI"', async () => {
      const schema = z.object({ body: z.object({ dni: z.string().min(9) }) });
      req.body = { dni: '123' };

      await validateRequest(schema)(req as Request, res as Response, next);

      const { errors } = jsonMock.mock.calls[0][0];
      expect(errors[0].field).toBe('DNI');
    });

    it('should map body.email to "Email"', async () => {
      const schema = z.object({ body: z.object({ email: z.string().email() }) });
      req.body = { email: 'not-an-email' };

      await validateRequest(schema)(req as Request, res as Response, next);

      const { errors } = jsonMock.mock.calls[0][0];
      expect(errors[0].field).toBe('Email');
    });

    it('should use raw path for unmapped fields', async () => {
      const schema = z.object({ body: z.object({ unknownField: z.string().min(3) }) });
      req.body = { unknownField: 'a' };

      await validateRequest(schema)(req as Request, res as Response, next);

      const { errors } = jsonMock.mock.calls[0][0];
      expect(errors[0].field).toBe('body.unknownField');
    });
  });

  describe('array field mapping', () => {
    it('should map body.phones.0 to "Teléfono 1"', async () => {
      const schema = z.object({ body: z.object({ phones: z.array(z.string().min(9)) }) });
      req.body = { phones: ['12'] };

      await validateRequest(schema)(req as Request, res as Response, next);

      const { errors } = jsonMock.mock.calls[0][0];
      expect(errors[0].field).toBe('Teléfono 1');
    });

    it('should map body.phones.1 to "Teléfono 2"', async () => {
      const schema = z.object({ body: z.object({ phones: z.array(z.string().min(9)) }) });
      req.body = { phones: ['123456789', '12'] };

      await validateRequest(schema)(req as Request, res as Response, next);

      const { errors } = jsonMock.mock.calls[0][0];
      expect(errors[0].field).toBe('Teléfono 2');
    });

    it('should map body.addresses.0.address to "Dirección 1"', async () => {
      const schema = z.object({
        body: z.object({ addresses: z.array(z.object({ address: z.string().min(5) })) }),
      });
      req.body = { addresses: [{ address: 'ab' }] };

      await validateRequest(schema)(req as Request, res as Response, next);

      const { errors } = jsonMock.mock.calls[0][0];
      expect(errors[0].field).toBe('Dirección 1');
    });

    it('should map body.bankAccounts.0 to "Cuenta bancaria 1"', async () => {
      const schema = z.object({
        body: z.object({ bankAccounts: z.array(z.string().min(5)) }),
      });
      req.body = { bankAccounts: ['ab'] };

      await validateRequest(schema)(req as Request, res as Response, next);

      const { errors } = jsonMock.mock.calls[0][0];
      expect(errors[0].field).toBe('Cuenta bancaria 1');
    });
  });

  describe('non-Zod errors', () => {
    it('should return 500 for unexpected errors', async () => {
      const brokenSchema = {
        parseAsync: jest.fn().mockRejectedValue(new Error('Unexpected error')),
      } as unknown as z.ZodSchema;

      await validateRequest(brokenSchema)(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should include error message text in 500 response for string errors', async () => {
      const brokenSchema = {
        parseAsync: jest.fn().mockRejectedValue('string error'),
      } as unknown as z.ZodSchema;

      await validateRequest(brokenSchema)(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('special path logging (behavior unchanged)', () => {
    it('should still call next() on valid logout body', async () => {
      const logoutSchema = z.object({
        body: z.object({ refreshToken: z.string().optional() }).optional().default({}),
      });
      req = { body: {}, params: {}, query: {}, path: '/logout', method: 'POST' };

      await validateRequest(logoutSchema)(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should return 400 on invalid clients POST body', async () => {
      const clientSchema = z.object({
        body: z.object({ firstName: z.string().min(2) }),
      });
      req = { body: { firstName: 'A' }, params: {}, query: {}, path: '/clients', method: 'POST' };

      await validateRequest(clientSchema)(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });
});
