"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const AppError_1 = require("../../application/shared/AppError");
const errorHandler_1 = require("../../infrastructure/express/middleware/errorHandler");
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
    let mockRequest;
    let mockResponse;
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
            const error = new AppError_1.ValidationError('Datos inválidos', [
                { field: 'email', message: 'Email inválido' },
            ]);
            (0, errorHandler_1.errorHandler)(error, mockRequest, mockResponse);
            expect(mockResponse.statusMock).toHaveBeenCalledWith(400);
            expect(mockResponse.jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'error',
                code: 'VALIDATION_ERROR',
                message: 'Datos inválidos',
                errors: [{ field: 'email', message: 'Email inválido' }],
            }));
        });
        it('should handle AuthenticationError (401)', () => {
            const error = new AppError_1.AuthenticationError('No autenticado');
            (0, errorHandler_1.errorHandler)(error, mockRequest, mockResponse);
            expect(mockResponse.statusMock).toHaveBeenCalledWith(401);
            expect(mockResponse.jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'error',
                code: 'AUTHENTICATION_ERROR',
                message: 'No autenticado',
            }));
        });
        it('should handle AuthorizationError (403)', () => {
            const error = new AppError_1.AuthorizationError('Sin permisos');
            (0, errorHandler_1.errorHandler)(error, mockRequest, mockResponse);
            expect(mockResponse.statusMock).toHaveBeenCalledWith(403);
            expect(mockResponse.jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'error',
                code: 'AUTHORIZATION_ERROR',
                message: 'Sin permisos',
            }));
        });
        it('should handle NotFoundError (404)', () => {
            const error = new AppError_1.NotFoundError('Usuario', '123');
            (0, errorHandler_1.errorHandler)(error, mockRequest, mockResponse);
            expect(mockResponse.statusMock).toHaveBeenCalledWith(404);
            expect(mockResponse.jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'error',
                code: 'NOT_FOUND',
                message: 'Usuario con ID 123 no encontrado',
            }));
        });
        it('should handle ConflictError (409)', () => {
            const error = new AppError_1.ConflictError('Email ya existe');
            (0, errorHandler_1.errorHandler)(error, mockRequest, mockResponse);
            expect(mockResponse.statusMock).toHaveBeenCalledWith(409);
            expect(mockResponse.jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'error',
                code: 'CONFLICT_ERROR',
                message: 'Email ya existe',
            }));
        });
        it('should handle DatabaseError (500)', () => {
            const error = new AppError_1.DatabaseError('Error de conexión');
            (0, errorHandler_1.errorHandler)(error, mockRequest, mockResponse);
            expect(mockResponse.statusMock).toHaveBeenCalledWith(500);
            expect(mockResponse.jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'error',
                code: 'DATABASE_ERROR',
                message: 'Error de conexión',
            }));
        });
    });
    describe('Prisma error handling', () => {
        it('should handle P2002 (unique constraint violation)', () => {
            const prismaError = new client_1.Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002',
                clientVersion: '5.0.0',
                meta: { target: ['email'] },
            });
            (0, errorHandler_1.errorHandler)(prismaError, mockRequest, mockResponse);
            expect(mockResponse.statusMock).toHaveBeenCalledWith(409);
            expect(mockResponse.jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'error',
                code: 'CONFLICT',
                message: 'El email ya está en uso',
            }));
        });
        it('should handle P2025 (record not found)', () => {
            const prismaError = new client_1.Prisma.PrismaClientKnownRequestError('Record not found', {
                code: 'P2025',
                clientVersion: '5.0.0',
            });
            (0, errorHandler_1.errorHandler)(prismaError, mockRequest, mockResponse);
            expect(mockResponse.statusMock).toHaveBeenCalledWith(404);
            expect(mockResponse.jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'error',
                code: 'NOT_FOUND',
                message: 'Recurso no encontrado',
            }));
        });
        it('should handle P2003 (foreign key violation)', () => {
            const prismaError = new client_1.Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
                code: 'P2003',
                clientVersion: '5.0.0',
                meta: { field_name: 'userId' },
            });
            (0, errorHandler_1.errorHandler)(prismaError, mockRequest, mockResponse);
            expect(mockResponse.statusMock).toHaveBeenCalledWith(400);
            expect(mockResponse.jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'error',
                code: 'FOREIGN_KEY_VIOLATION',
            }));
        });
        it('should handle unknown Prisma errors (500)', () => {
            const prismaError = new client_1.Prisma.PrismaClientKnownRequestError('Unknown error', {
                code: 'P9999',
                clientVersion: '5.0.0',
            });
            (0, errorHandler_1.errorHandler)(prismaError, mockRequest, mockResponse);
            expect(mockResponse.statusMock).toHaveBeenCalledWith(500);
            expect(mockResponse.jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'error',
                code: 'DATABASE_ERROR',
            }));
        });
    });
    describe('Generic error handling', () => {
        it('should handle generic Error (500)', () => {
            const error = new Error('Something went wrong');
            (0, errorHandler_1.errorHandler)(error, mockRequest, mockResponse);
            expect(mockResponse.statusMock).toHaveBeenCalledWith(500);
            expect(mockResponse.jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'error',
                code: 'INTERNAL_SERVER_ERROR',
            }));
        });
        it('should not include stack trace in production', () => {
            process.env.NODE_ENV = 'production';
            const error = new Error('Production error');
            (0, errorHandler_1.errorHandler)(error, mockRequest, mockResponse);
            expect(mockResponse.jsonMock).toHaveBeenCalledWith(expect.not.objectContaining({
                stack: expect.anything(),
            }));
        });
        it('should include stack trace in development', () => {
            process.env.NODE_ENV = 'development';
            const error = new AppError_1.AppError('Dev error', 500);
            (0, errorHandler_1.errorHandler)(error, mockRequest, mockResponse);
            expect(mockResponse.jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                stack: expect.any(String),
            }));
        });
    });
});
