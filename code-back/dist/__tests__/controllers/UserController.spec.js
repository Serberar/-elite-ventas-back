"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UserController_1 = require("../../infrastructure/express/controllers/UserController");
const RegisterUserUseCase_1 = require("../../application/use-cases/user/RegisterUserUseCase");
const LoginUserUseCase_1 = require("../../application/use-cases/user/LoginUserUseCase");
const RefreshTokenUseCase_1 = require("../../application/use-cases/user/RefreshTokenUseCase");
const LogoutUserUseCase_1 = require("../../application/use-cases/user/LogoutUserUseCase");
jest.mock('@application/use-cases/user/RegisterUserUseCase');
jest.mock('@application/use-cases/user/LoginUserUseCase');
jest.mock('@application/use-cases/user/RefreshTokenUseCase');
jest.mock('@application/use-cases/user/LogoutUserUseCase');
describe('UserController', () => {
    let req;
    let res;
    let statusMock;
    let jsonMock;
    const mockUser = {
        id: 'user-1',
        firstName: 'Juan',
        lastName: 'Pérez',
        username: 'juan123',
        password: 'hashed',
        role: 'administrador',
        lastLoginAt: null,
        toPrisma: () => ({}),
    };
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
        RegisterUserUseCase_1.RegisterUserUseCase.prototype.execute.mockResolvedValue(mockUser);
        req.body = {
            firstName: 'Juan',
            lastName: 'Pérez',
            username: 'juan123',
            password: '123456',
            role: 'administrador',
        };
        await UserController_1.UserController.register(req, res);
        expect(RegisterUserUseCase_1.RegisterUserUseCase.prototype.execute).toHaveBeenCalledWith(req.body);
        expect(statusMock).toHaveBeenCalledWith(201);
        expect(jsonMock).toHaveBeenCalledWith({
            id: mockUser.id,
            username: mockUser.username,
        });
    });
    it('register: debería devolver 400 si hay error', async () => {
        RegisterUserUseCase_1.RegisterUserUseCase.prototype.execute.mockRejectedValue(new Error('Error registro'));
        req.body = {};
        await UserController_1.UserController.register(req, res);
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
        LoginUserUseCase_1.LoginUserUseCase.prototype.execute.mockResolvedValue(mockTokens);
        req.body = { username: 'juan123', password: '123456' };
        await UserController_1.UserController.login(req, res);
        expect(LoginUserUseCase_1.LoginUserUseCase.prototype.execute).toHaveBeenCalledWith({
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
            refreshToken: 'refresh-token', // Se devuelve en el JSON, no en cookies
        });
    });
    it('login: debería devolver 401 si hay error', async () => {
        LoginUserUseCase_1.LoginUserUseCase.prototype.execute.mockRejectedValue(new Error('Error login'));
        req.body = { username: 'juan123', password: '123456' };
        await UserController_1.UserController.login(req, res);
        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
            error: 'Error login',
        });
    });
    // REFRESH
    it('refresh: debería devolver un nuevo access token', async () => {
        RefreshTokenUseCase_1.RefreshTokenUseCase.prototype.execute.mockResolvedValue({
            accessToken: 'newAccessToken',
            user: mockUser,
        });
        req.body = { refreshToken: 'valid-refresh-token' };
        await UserController_1.UserController.refresh(req, res);
        expect(RefreshTokenUseCase_1.RefreshTokenUseCase.prototype.execute).toHaveBeenCalledWith('valid-refresh-token');
        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith({
            accessToken: 'newAccessToken',
        });
    });
    it('refresh: debería devolver 401 si no hay token o es inválido', async () => {
        RefreshTokenUseCase_1.RefreshTokenUseCase.prototype.execute.mockRejectedValue(new Error('Refresh token inválido'));
        req.body = {}; // Sin refreshToken en el body
        await UserController_1.UserController.refresh(req, res);
        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
            error: 'Refresh token no enviado',
        });
    });
    // LOGOUT
    it('logout: debería limpiar refreshToken y devolver 200 si el token es válido', async () => {
        LogoutUserUseCase_1.LogoutUserUseCase.prototype.execute.mockResolvedValue(undefined);
        req.body = { refreshToken: 'valid-refresh-token' };
        await UserController_1.UserController.logout(req, res);
        expect(LogoutUserUseCase_1.LogoutUserUseCase.prototype.execute).toHaveBeenCalledWith('valid-refresh-token');
        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith({
            message: 'Sesión cerrada',
        });
    });
    it('logout: debería devolver 200 incluso si no hay refreshToken', async () => {
        LogoutUserUseCase_1.LogoutUserUseCase.prototype.execute.mockResolvedValue(undefined);
        req.body = {}; // Sin refreshToken
        await UserController_1.UserController.logout(req, res);
        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith({
            message: 'Sesión cerrada',
        });
    });
});
