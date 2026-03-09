"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const userRoutes_1 = __importDefault(require("../../infrastructure/routes/userRoutes"));
const ServiceContainer_1 = require("../../infrastructure/container/ServiceContainer");
// Mock del serviceContainer
jest.mock('@infrastructure/container/ServiceContainer', () => ({
    serviceContainer: {
        registerUserUseCase: { execute: jest.fn() },
        loginUserUseCase: { execute: jest.fn() },
        refreshTokenUseCase: { execute: jest.fn() },
        logoutUserUseCase: { execute: jest.fn() },
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
    authRateLimiter: (req, res, next) => next(),
}));
// Mock del CSRF middleware
jest.mock('@infrastructure/express/middleware/csrfMiddleware', () => ({
    csrfTokenEndpoint: (req, res) => res.json({ csrfToken: 'test-csrf-token' }),
    csrfProtection: (req, res, next) => next(),
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
// Mock del validateRequest middleware
jest.mock('@infrastructure/express/middleware/validateRequest', () => ({
    validateRequest: () => (req, res, next) => next(),
}));
describe('Integration: User Routes', () => {
    let app;
    beforeAll(() => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/users', userRoutes_1.default);
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('GET /api/users/csrf-token', () => {
        it('should return csrf token', async () => {
            const response = await (0, supertest_1.default)(app)
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
            ServiceContainer_1.serviceContainer.registerUserUseCase.execute.mockResolvedValue(mockUser);
            const response = await (0, supertest_1.default)(app)
                .post('/api/users/register')
                .send({
                username: 'testuser',
                password: 'Password123!',
                firstName: 'Test',
                lastName: 'User',
                role: 'comercial',
            })
                .expect(201);
            expect(response.body).toHaveProperty('id', 'user-123');
            expect(response.body).toHaveProperty('username', 'testuser');
        });
        it('should return 400 for registration error', async () => {
            ServiceContainer_1.serviceContainer.registerUserUseCase.execute.mockRejectedValue(new Error('Usuario ya existe'));
            const response = await (0, supertest_1.default)(app)
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
            ServiceContainer_1.serviceContainer.loginUserUseCase.execute.mockResolvedValue(mockLoginResult);
            const response = await (0, supertest_1.default)(app)
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
            ServiceContainer_1.serviceContainer.loginUserUseCase.execute.mockRejectedValue(new Error('Credenciales inválidas'));
            const response = await (0, supertest_1.default)(app)
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
            ServiceContainer_1.serviceContainer.refreshTokenUseCase.execute.mockResolvedValue({
                accessToken: 'new-access-token',
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/users/refresh')
                .send({
                refreshToken: 'valid-refresh-token',
            })
                .expect(200);
            expect(response.body).toHaveProperty('accessToken', 'new-access-token');
        });
        it('should return 401 for invalid refresh token', async () => {
            ServiceContainer_1.serviceContainer.refreshTokenUseCase.execute.mockRejectedValue(new Error('Token inválido'));
            const response = await (0, supertest_1.default)(app)
                .post('/api/users/refresh')
                .send({
                refreshToken: 'invalid-token',
            })
                .expect(401);
            expect(response.body).toHaveProperty('error');
        });
        it('should return 401 when no refresh token provided', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/users/refresh')
                .send({})
                .expect(401);
            expect(response.body).toHaveProperty('error', 'Refresh token no enviado');
        });
    });
    describe('POST /api/users/logout', () => {
        it('should logout successfully', async () => {
            ServiceContainer_1.serviceContainer.logoutUserUseCase.execute.mockResolvedValue(undefined);
            const response = await (0, supertest_1.default)(app)
                .post('/api/users/logout')
                .send({
                refreshToken: 'valid-refresh-token',
            })
                .expect(200);
            expect(response.body).toHaveProperty('message', 'Sesión cerrada');
        });
        it('should return 200 even on logout error', async () => {
            ServiceContainer_1.serviceContainer.logoutUserUseCase.execute.mockRejectedValue(new Error('Error al cerrar sesión'));
            const response = await (0, supertest_1.default)(app)
                .post('/api/users/logout')
                .send({
                refreshToken: 'some-token',
            })
                .expect(200);
            expect(response.body).toHaveProperty('message', 'Sesión cerrada');
        });
    });
});
