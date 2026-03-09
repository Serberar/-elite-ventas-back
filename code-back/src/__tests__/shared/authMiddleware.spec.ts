import { authMiddleware, AuthRequest } from '@infrastructure/express/middleware/authMiddleware';
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CurrentUser } from '@application/shared/types/CurrentUser';

jest.mock('jsonwebtoken');

describe('authMiddleware', () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let next: NextFunction;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

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
    authMiddleware(req as AuthRequest, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Token no enviado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('debería devolver 401 si el token es inválido', () => {
    req.headers = { authorization: 'Bearer invalidToken' };
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('invalid');
    });

    authMiddleware(req as AuthRequest, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Token inválido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('debería setear req.user y llamar a next si el token es válido', () => {
    const mockUser: CurrentUser = { id: '1', role: 'administrador', firstName: 'Test' };
    req.headers = { authorization: 'Bearer validToken' };
    (jwt.verify as jest.Mock).mockReturnValue(mockUser);

    authMiddleware(req as AuthRequest, res as Response, next);

    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
  });
});
