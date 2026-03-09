/**
 * @file appError.spec.ts
 * Tests para las clases de error personalizadas del sistema
 * Cubre todas las clases de error, códigos HTTP, mensajes y funciones utilitarias
 */

import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  RateLimitError,
  UnsupportedMediaTypeError,
  isOperationalError,
  getErrorInfo,
} from '@application/shared/AppError';

describe('AppError Classes', () => {
  describe('AppError (Base Class)', () => {
    it('should create error with default values', () => {
      const error = new AppError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.code).toBeUndefined();
      expect(error.stack).toBeDefined();
    });

    it('should create error with custom values', () => {
      const error = new AppError('Custom error', 418, false, 'CUSTOM_CODE');

      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(418);
      expect(error.isOperational).toBe(false);
      expect(error.code).toBe('CUSTOM_CODE');
    });

    it('should maintain proper prototype chain', () => {
      const error = new AppError('Test error');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error.constructor.name).toBe('AppError');
    });

    it('should capture stack trace', () => {
      const error = new AppError('Test error');

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
      expect(error.stack).toContain('AppError');
    });

    it('should handle empty message', () => {
      const error = new AppError('');

      expect(error.message).toBe('');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with default message', () => {
      const error = new ValidationError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Error de validación');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.errors).toBeUndefined();
    });

    it('should create validation error with custom message', () => {
      const error = new ValidationError('Custom validation error');

      expect(error.message).toBe('Custom validation error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should create validation error with field errors', () => {
      const fieldErrors = [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password must be at least 8 characters' },
      ];

      const error = new ValidationError('Validation failed', fieldErrors);

      expect(error.message).toBe('Validation failed');
      expect(error.errors).toEqual(fieldErrors);
      expect(error.errors?.length).toBe(2);
    });

    it('should handle empty field errors array', () => {
      const error = new ValidationError('Test error', []);

      expect(error.errors).toEqual([]);
      expect(Array.isArray(error.errors)).toBe(true);
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error with default message', () => {
      const error = new AuthenticationError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.message).toBe('No autenticado');
      expect(error.statusCode).toBe(401);
      expect(error.isOperational).toBe(true);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should create authentication error with custom message', () => {
      const error = new AuthenticationError('Invalid credentials');

      expect(error.message).toBe('Invalid credentials');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('AuthorizationError', () => {
    it('should create authorization error with default message', () => {
      const error = new AuthorizationError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(AuthorizationError);
      expect(error.message).toBe('No autorizado');
      expect(error.statusCode).toBe(403);
      expect(error.isOperational).toBe(true);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should create authorization error with custom message', () => {
      const error = new AuthorizationError('Insufficient permissions');

      expect(error.message).toBe('Insufficient permissions');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with default message', () => {
      const error = new NotFoundError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('Recurso no encontrado');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should create not found error with resource name', () => {
      const error = new NotFoundError('Usuario');

      expect(error.message).toBe('Usuario no encontrado');
      expect(error.statusCode).toBe(404);
    });

    it('should create not found error with resource name and ID', () => {
      const error = new NotFoundError('Cliente', '123');

      expect(error.message).toBe('Cliente con ID 123 no encontrado');
      expect(error.statusCode).toBe(404);
    });

    it('should handle empty resource name', () => {
      const error = new NotFoundError('', '456');

      expect(error.message).toBe(' con ID 456 no encontrado');
    });
  });

  describe('ConflictError', () => {
    it('should create conflict error with default message', () => {
      const error = new ConflictError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe('El recurso ya existe');
      expect(error.statusCode).toBe(409);
      expect(error.isOperational).toBe(true);
      expect(error.code).toBe('CONFLICT_ERROR');
    });

    it('should create conflict error with custom message', () => {
      const error = new ConflictError('Email already exists');

      expect(error.message).toBe('Email already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT_ERROR');
    });
  });

  describe('DatabaseError', () => {
    it('should create database error with default message', () => {
      const error = new DatabaseError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.message).toBe('Error de base de datos');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.originalError).toBeUndefined();
    });

    it('should create database error with custom message', () => {
      const error = new DatabaseError('Connection timeout');

      expect(error.message).toBe('Connection timeout');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DATABASE_ERROR');
    });

    it('should create database error with original error', () => {
      const originalError = new Error('Connection failed');
      const error = new DatabaseError('Database connection error', originalError);

      expect(error.message).toBe('Database connection error');
      expect(error.originalError).toBe(originalError);
      expect(error.originalError?.message).toBe('Connection failed');
    });

    it('should handle original error with stack trace', () => {
      const originalError = new Error('SQL syntax error');
      const error = new DatabaseError('Query failed', originalError);

      expect(error.originalError).toBe(originalError);
      expect(error.originalError?.stack).toBeDefined();
    });
  });

  describe('ExternalServiceError', () => {
    it('should create external service error with service name', () => {
      const error = new ExternalServiceError('PaymentAPI');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ExternalServiceError);
      expect(error.message).toBe('Error en servicio externo: PaymentAPI');
      expect(error.statusCode).toBe(502);
      expect(error.isOperational).toBe(true);
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
    });

    it('should create external service error with custom message', () => {
      const error = new ExternalServiceError('EmailAPI', 'Service temporarily unavailable');

      expect(error.message).toBe('Service temporarily unavailable');
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
    });

    it('should handle empty service name', () => {
      const error = new ExternalServiceError('');

      expect(error.message).toBe('Error en servicio externo: ');
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with default message', () => {
      const error = new RateLimitError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.message).toBe('Demasiadas peticiones');
      expect(error.statusCode).toBe(429);
      expect(error.isOperational).toBe(true);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
    });

    it('should create rate limit error with custom message', () => {
      const error = new RateLimitError('API rate limit exceeded');

      expect(error.message).toBe('API rate limit exceeded');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
    });
  });

  describe('UnsupportedMediaTypeError', () => {
    it('should create unsupported media type error with default message', () => {
      const error = new UnsupportedMediaTypeError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(UnsupportedMediaTypeError);
      expect(error.message).toBe('Tipo de contenido no soportado');
      expect(error.statusCode).toBe(415);
      expect(error.isOperational).toBe(true);
      expect(error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    });

    it('should create unsupported media type error with custom message', () => {
      const error = new UnsupportedMediaTypeError('Only JSON content type is supported');

      expect(error.message).toBe('Only JSON content type is supported');
      expect(error.statusCode).toBe(415);
      expect(error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    });
  });

  describe('isOperationalError function', () => {
    it('should return true for operational AppError', () => {
      const error = new AppError('Test error', 400, true);

      expect(isOperationalError(error)).toBe(true);
    });

    it('should return false for non-operational AppError', () => {
      const error = new AppError('Test error', 500, false);

      expect(isOperationalError(error)).toBe(false);
    });

    it('should return true for ValidationError (operational by default)', () => {
      const error = new ValidationError();

      expect(isOperationalError(error)).toBe(true);
    });

    it('should return false for standard Error', () => {
      const error = new Error('Standard error');

      expect(isOperationalError(error)).toBe(false);
    });

    it('should return false for TypeError', () => {
      const error = new TypeError('Type error');

      expect(isOperationalError(error)).toBe(false);
    });

    it('should return false for ReferenceError', () => {
      const error = new ReferenceError('Reference error');

      expect(isOperationalError(error)).toBe(false);
    });

    it('should return false for SyntaxError', () => {
      const error = new SyntaxError('Syntax error');

      expect(isOperationalError(error)).toBe(false);
    });
  });

  describe('getErrorInfo function', () => {
    it('should extract info from AppError', () => {
      const error = new ValidationError('Test validation error');
      const info = getErrorInfo(error);

      expect(info).toEqual({
        message: 'Test validation error',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        isOperational: true,
        stack: expect.any(String),
      });
    });

    it('should extract info from custom AppError', () => {
      const error = new AppError('Custom error', 418, false, 'CUSTOM_CODE');
      const info = getErrorInfo(error);

      expect(info).toEqual({
        message: 'Custom error',
        statusCode: 418,
        code: 'CUSTOM_CODE',
        isOperational: false,
        stack: expect.any(String),
      });
    });

    it('should extract info from standard Error', () => {
      const error = new Error('Standard error');
      const info = getErrorInfo(error);

      expect(info).toEqual({
        message: 'Standard error',
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        isOperational: false,
        stack: expect.any(String),
      });
    });

    it('should handle string error', () => {
      const info = getErrorInfo('String error');

      expect(info).toEqual({
        message: 'Error desconocido',
        statusCode: 500,
        code: 'UNKNOWN_ERROR',
        isOperational: false,
        stack: undefined,
      });
    });

    it('should handle null/undefined errors', () => {
      const nullInfo = getErrorInfo(null);
      const undefinedInfo = getErrorInfo(undefined);

      expect(nullInfo).toEqual({
        message: 'Error desconocido',
        statusCode: 500,
        code: 'UNKNOWN_ERROR',
        isOperational: false,
        stack: undefined,
      });

      expect(undefinedInfo).toEqual({
        message: 'Error desconocido',
        statusCode: 500,
        code: 'UNKNOWN_ERROR',
        isOperational: false,
        stack: undefined,
      });
    });

    it('should handle object errors', () => {
      const objectError = { custom: 'error object' };
      const info = getErrorInfo(objectError);

      expect(info).toEqual({
        message: 'Error desconocido',
        statusCode: 500,
        code: 'UNKNOWN_ERROR',
        isOperational: false,
        stack: undefined,
      });
    });

    it('should handle number errors', () => {
      const info = getErrorInfo(404);

      expect(info).toEqual({
        message: 'Error desconocido',
        statusCode: 500,
        code: 'UNKNOWN_ERROR',
        isOperational: false,
        stack: undefined,
      });
    });
  });

  describe('Error Inheritance and Polymorphism', () => {
    it('should maintain inheritance chain for all error types', () => {
      const errors = [
        new ValidationError(),
        new AuthenticationError(),
        new AuthorizationError(),
        new NotFoundError(),
        new ConflictError(),
        new DatabaseError(),
        new ExternalServiceError('test'),
        new RateLimitError(),
        new UnsupportedMediaTypeError(),
      ];

      errors.forEach((error) => {
        expect(error instanceof Error).toBe(true);
        expect(error instanceof AppError).toBe(true);
        expect(isOperationalError(error)).toBe(true);
      });
    });

    it('should have unique error codes for each type', () => {
      const errors = [
        { error: new ValidationError(), code: 'VALIDATION_ERROR' },
        { error: new AuthenticationError(), code: 'AUTHENTICATION_ERROR' },
        { error: new AuthorizationError(), code: 'AUTHORIZATION_ERROR' },
        { error: new NotFoundError(), code: 'NOT_FOUND' },
        { error: new ConflictError(), code: 'CONFLICT_ERROR' },
        { error: new DatabaseError(), code: 'DATABASE_ERROR' },
        { error: new ExternalServiceError('test'), code: 'EXTERNAL_SERVICE_ERROR' },
        { error: new RateLimitError(), code: 'RATE_LIMIT_ERROR' },
        { error: new UnsupportedMediaTypeError(), code: 'UNSUPPORTED_MEDIA_TYPE' },
      ];

      errors.forEach(({ error, code }) => {
        expect(error.code).toBe(code);
      });

      // Verificar que todos los códigos son únicos
      const codes = errors.map((e) => e.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should have correct HTTP status codes', () => {
      const statusCodes = [
        { error: new ValidationError(), status: 400 },
        { error: new AuthenticationError(), status: 401 },
        { error: new AuthorizationError(), status: 403 },
        { error: new NotFoundError(), status: 404 },
        { error: new ConflictError(), status: 409 },
        { error: new UnsupportedMediaTypeError(), status: 415 },
        { error: new RateLimitError(), status: 429 },
        { error: new DatabaseError(), status: 500 },
        { error: new ExternalServiceError('test'), status: 502 },
      ];

      statusCodes.forEach(({ error, status }) => {
        expect(error.statusCode).toBe(status);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000);
      const error = new AppError(longMessage);

      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(1000);
    });

    it('should handle special characters in error messages', () => {
      const specialMessage = 'Error with emojis and special chars: äöü@#$%&*()';
      const error = new ValidationError(specialMessage);

      expect(error.message).toBe(specialMessage);
    });

    it('should handle nested DatabaseError with complex original error', () => {
      const complexError = new Error('Complex database error');
      complexError.stack = 'Custom stack trace';

      const dbError = new DatabaseError('Wrapper error', complexError);

      expect(dbError.originalError).toBe(complexError);
      expect(dbError.originalError?.stack).toBe('Custom stack trace');
    });

    it('should handle ValidationError with malformed field errors', () => {
      const malformedErrors = [
        { field: '', message: '' },
        { field: null as any, message: undefined as any },
      ];

      const error = new ValidationError('Test', malformedErrors);

      expect(error.errors).toEqual(malformedErrors);
      expect(error.errors?.length).toBe(2);
    });
  });
});
