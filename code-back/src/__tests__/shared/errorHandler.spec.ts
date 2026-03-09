import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
} from '@application/shared/AppError';
import { errorHandler } from '@infrastructure/express/middleware/errorHandler';

// Crear mocks tipados correctamente
const createMockResponse = () => {
  const statusMock = jest.fn().mockReturnThis();
  const jsonMock = jest.fn();

  return {
    status: statusMock,
    json: jsonMock,
    statusMock,
    jsonMock,
  };
};

describe('errorHandler middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
    };

    mockResponse = createMockResponse();

    // Mock NODE_ENV
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AppError handling', () => {
    it('should handle ValidationError (400)', () => {
      const error = new ValidationError('Datos inválidos', [
        { field: 'email', message: 'Email inválido' },
      ]);

      errorHandler(error, mockRequest as Request, mockResponse as Response);

      expect(mockResponse.statusMock).toHaveBeenCalledWith(400);
      expect(mockResponse.jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Datos inválidos',
          errors: [{ field: 'email', message: 'Email inválido' }],
        })
      );
    });

    it('should handle AuthenticationError (401)', () => {
      const error = new AuthenticationError('No autenticado');

      errorHandler(error, mockRequest as Request, mockResponse as Response);

      expect(mockResponse.statusMock).toHaveBeenCalledWith(401);
      expect(mockResponse.jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'AUTHENTICATION_ERROR',
          message: 'No autenticado',
        })
      );
    });

    it('should handle AuthorizationError (403)', () => {
      const error = new AuthorizationError('Sin permisos');

      errorHandler(error, mockRequest as Request, mockResponse as Response);

      expect(mockResponse.statusMock).toHaveBeenCalledWith(403);
      expect(mockResponse.jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'AUTHORIZATION_ERROR',
          message: 'Sin permisos',
        })
      );
    });

    it('should handle NotFoundError (404)', () => {
      const error = new NotFoundError('Usuario', '123');

      errorHandler(error, mockRequest as Request, mockResponse as Response);

      expect(mockResponse.statusMock).toHaveBeenCalledWith(404);
      expect(mockResponse.jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Usuario con ID 123 no encontrado',
        })
      );
    });

    it('should handle ConflictError (409)', () => {
      const error = new ConflictError('Email ya existe');

      errorHandler(error, mockRequest as Request, mockResponse as Response);

      expect(mockResponse.statusMock).toHaveBeenCalledWith(409);
      expect(mockResponse.jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'CONFLICT_ERROR',
          message: 'Email ya existe',
        })
      );
    });

    it('should handle DatabaseError (500)', () => {
      const error = new DatabaseError('Error de conexión');

      errorHandler(error, mockRequest as Request, mockResponse as Response);

      expect(mockResponse.statusMock).toHaveBeenCalledWith(500);
      expect(mockResponse.jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'DATABASE_ERROR',
          message: 'Error de conexión',
        })
      );
    });
  });

  describe('Prisma error handling', () => {
    it('should handle P2002 (unique constraint violation)', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: { target: ['email'] },
      });

      errorHandler(prismaError, mockRequest as Request, mockResponse as Response);

      expect(mockResponse.statusMock).toHaveBeenCalledWith(409);
      expect(mockResponse.jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'CONFLICT',
          message: 'El email ya está en uso',
        })
      );
    });

    it('should handle P2025 (record not found)', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });

      errorHandler(prismaError, mockRequest as Request, mockResponse as Response);

      expect(mockResponse.statusMock).toHaveBeenCalledWith(404);
      expect(mockResponse.jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'NOT_FOUND',
          message: 'Recurso no encontrado',
        })
      );
    });

    it('should handle P2003 (foreign key violation)', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '5.0.0',
          meta: { field_name: 'userId' },
        }
      );

      errorHandler(prismaError, mockRequest as Request, mockResponse as Response);

      expect(mockResponse.statusMock).toHaveBeenCalledWith(400);
      expect(mockResponse.jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'FOREIGN_KEY_VIOLATION',
        })
      );
    });

    it('should handle unknown Prisma errors (500)', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unknown error', {
        code: 'P9999',
        clientVersion: '5.0.0',
      });

      errorHandler(prismaError, mockRequest as Request, mockResponse as Response);

      expect(mockResponse.statusMock).toHaveBeenCalledWith(500);
      expect(mockResponse.jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'DATABASE_ERROR',
        })
      );
    });
  });

  describe('Generic error handling', () => {
    it('should handle generic Error (500)', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockRequest as Request, mockResponse as Response);

      expect(mockResponse.statusMock).toHaveBeenCalledWith(500);
      expect(mockResponse.jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'INTERNAL_SERVER_ERROR',
        })
      );
    });

    it('should not include stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Production error');

      errorHandler(error, mockRequest as Request, mockResponse as Response);

      expect(mockResponse.jsonMock).toHaveBeenCalledWith(
        expect.not.objectContaining({
          stack: expect.anything(),
        })
      );
    });

    it('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new AppError('Dev error', 500);

      errorHandler(error, mockRequest as Request, mockResponse as Response);

      expect(mockResponse.jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.any(String),
        })
      );
    });
  });
});
