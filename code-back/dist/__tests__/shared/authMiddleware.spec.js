"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const authMiddleware_1 = require("../../infrastructure/express/middleware/authMiddleware");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
jest.mock('jsonwebtoken');
describe('authMiddleware', () => {
    let req;
    let res;
    let next;
    let statusMock;
    let jsonMock;
    beforeEach(() => {
        statusMock = jest.fn().mockReturnThis();
        jsonMock = jest.fn();
        next = jest.fn();
        res = { status: statusMock, json: jsonMock };
        req = { headers: {} };
        jest.clearAllMocks();
        // IMPORTANTE: definir JWT_SECRET para que jwt.verify funcione
        process.env.JWT_SECRET = 'test_secret';
    });
    it('debería devolver 401 si no hay Authorization header', () => {
        (0, authMiddleware_1.authMiddleware)(req, res, next);
        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'Token no enviado' });
        expect(next).not.toHaveBeenCalled();
    });
    it('debería devolver 401 si el token es inválido', () => {
        req.headers = { authorization: 'Bearer invalidToken' };
        jsonwebtoken_1.default.verify.mockImplementation(() => {
            throw new Error('invalid');
        });
        (0, authMiddleware_1.authMiddleware)(req, res, next);
        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'Token inválido' });
        expect(next).not.toHaveBeenCalled();
    });
    it('debería setear req.user y llamar a next si el token es válido', () => {
        const mockUser = { id: '1', role: 'administrador', firstName: 'Test' };
        req.headers = { authorization: 'Bearer validToken' };
        jsonwebtoken_1.default.verify.mockReturnValue(mockUser);
        (0, authMiddleware_1.authMiddleware)(req, res, next);
        expect(req.user).toEqual(mockUser);
        expect(next).toHaveBeenCalled();
    });
});
