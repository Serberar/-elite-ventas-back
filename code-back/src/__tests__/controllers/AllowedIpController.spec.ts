import { AllowedIpController } from '@infrastructure/express/controllers/AllowedIpController';
import { Request, Response, NextFunction } from 'express';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { AuthenticationError, AuthorizationError } from '@application/shared/AppError';

jest.mock('@infrastructure/container/ServiceContainer', () => ({
  serviceContainer: {
    listAllowedIpsUseCase: { execute: jest.fn() },
    createAllowedIpUseCase: { execute: jest.fn() },
    deleteAllowedIpUseCase: { execute: jest.fn() },
    allowedIpRepository: { listIpStrings: jest.fn() },
    systemSettingRepository: { getBool: jest.fn(), set: jest.fn() },
  },
}));

jest.mock('ip', () => ({
  isPrivate: jest.fn(),
}));

import ipLib from 'ip';

describe('AllowedIpController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<NextFunction>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const adminUser: CurrentUser = { id: 'user-1', role: 'administrador', firstName: 'Admin' };
  const comercialUser: CurrentUser = { id: 'user-2', role: 'comercial', firstName: 'Com' };

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    next = jest.fn();
    res = { status: statusMock, json: jsonMock };
    req = {
      user: adminUser,
      params: {},
      body: {},
      headers: {},
      socket: { remoteAddress: '192.168.1.10' } as any,
    };
    jest.clearAllMocks();
  });

  describe('listAllowedIps', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await AllowedIpController.listAllowedIps(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 200 with ips list', async () => {
      const ips = [{ id: 'ip-1', ip: '192.168.1.1' }, { id: 'ip-2', ip: '10.0.0.1' }];
      (serviceContainer.listAllowedIpsUseCase.execute as jest.Mock).mockResolvedValue(ips);

      await AllowedIpController.listAllowedIps(req as any, res as any, next);

      expect(serviceContainer.listAllowedIpsUseCase.execute).toHaveBeenCalledWith(adminUser);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(ips);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with AuthorizationError on permission denied', async () => {
      const error = new AuthorizationError('Sin permiso');
      (serviceContainer.listAllowedIpsUseCase.execute as jest.Mock).mockRejectedValue(error);

      await AllowedIpController.listAllowedIps(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with generic errors', async () => {
      const error = new Error('DB error');
      (serviceContainer.listAllowedIpsUseCase.execute as jest.Mock).mockRejectedValue(error);

      await AllowedIpController.listAllowedIps(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('createAllowedIp', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await AllowedIpController.createAllowedIp(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 201 with created ip', async () => {
      const allowedIp = { id: 'ip-1', ip: '203.0.113.5', description: 'Oficina' };
      req.body = { ip: '203.0.113.5', description: 'Oficina' };
      (serviceContainer.createAllowedIpUseCase.execute as jest.Mock).mockResolvedValue(allowedIp);

      await AllowedIpController.createAllowedIp(req as any, res as any, next);

      expect(serviceContainer.createAllowedIpUseCase.execute).toHaveBeenCalledWith(req.body, adminUser);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'IP permitida creada correctamente',
        allowedIp,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with errors', async () => {
      req.body = { ip: 'invalid' };
      const error = new Error('Invalid IP');
      (serviceContainer.createAllowedIpUseCase.execute as jest.Mock).mockRejectedValue(error);

      await AllowedIpController.createAllowedIp(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteAllowedIp', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await AllowedIpController.deleteAllowedIp(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 200 with success message on delete', async () => {
      req.params = { id: 'ip-1' };
      (serviceContainer.deleteAllowedIpUseCase.execute as jest.Mock).mockResolvedValue(undefined);

      await AllowedIpController.deleteAllowedIp(req as any, res as any, next);

      expect(serviceContainer.deleteAllowedIpUseCase.execute).toHaveBeenCalledWith('ip-1', adminUser);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'IP permitida eliminada correctamente' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with errors', async () => {
      req.params = { id: 'ip-1' };
      const error = new Error('Not found');
      (serviceContainer.deleteAllowedIpUseCase.execute as jest.Mock).mockRejectedValue(error);

      await AllowedIpController.deleteAllowedIp(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getMyIp', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await AllowedIpController.getMyIp(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 200 with ip info for private IP in whitelist', async () => {
      req.socket = { remoteAddress: '192.168.1.10' } as any;
      (ipLib.isPrivate as jest.Mock).mockReturnValue(true);
      (serviceContainer.allowedIpRepository.listIpStrings as jest.Mock).mockResolvedValue([
        '192.168.1.10',
      ]);

      await AllowedIpController.getMyIp(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        ip: '192.168.1.10',
        isWhitelisted: true,
        isPrivate: true,
        alwaysAllowed: true,
      });
    });

    it('should return 200 with public IP that is whitelisted', async () => {
      req.socket = { remoteAddress: '203.0.113.5' } as any;
      (ipLib.isPrivate as jest.Mock).mockReturnValue(false);
      (serviceContainer.allowedIpRepository.listIpStrings as jest.Mock).mockResolvedValue([
        '203.0.113.5',
      ]);

      await AllowedIpController.getMyIp(req as any, res as any, next);

      expect(jsonMock).toHaveBeenCalledWith({
        ip: '203.0.113.5',
        isWhitelisted: true,
        isPrivate: false,
        alwaysAllowed: true,
      });
    });

    it('should return 200 with public IP not in whitelist', async () => {
      req.socket = { remoteAddress: '8.8.8.8' } as any;
      (ipLib.isPrivate as jest.Mock).mockReturnValue(false);
      (serviceContainer.allowedIpRepository.listIpStrings as jest.Mock).mockResolvedValue([]);

      await AllowedIpController.getMyIp(req as any, res as any, next);

      expect(jsonMock).toHaveBeenCalledWith({
        ip: '8.8.8.8',
        isWhitelisted: false,
        isPrivate: false,
        alwaysAllowed: false,
      });
    });

    it('should use X-Forwarded-For header when present', async () => {
      req.headers = { 'x-forwarded-for': '203.0.113.99, 10.0.0.1' };
      req.socket = { remoteAddress: '10.0.0.1' } as any;
      (ipLib.isPrivate as jest.Mock).mockReturnValue(false);
      (serviceContainer.allowedIpRepository.listIpStrings as jest.Mock).mockResolvedValue([]);

      await AllowedIpController.getMyIp(req as any, res as any, next);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ ip: '203.0.113.99' })
      );
    });

    it('should normalize ::ffff: IPv6 prefix to IPv4', async () => {
      req.headers = {};
      req.socket = { remoteAddress: '::ffff:192.168.1.50' } as any;
      (ipLib.isPrivate as jest.Mock).mockReturnValue(true);
      (serviceContainer.allowedIpRepository.listIpStrings as jest.Mock).mockResolvedValue([]);

      await AllowedIpController.getMyIp(req as any, res as any, next);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ ip: '192.168.1.50' })
      );
    });

    it('should call next with errors', async () => {
      const error = new Error('DB error');
      (serviceContainer.allowedIpRepository.listIpStrings as jest.Mock).mockRejectedValue(error);
      (ipLib.isPrivate as jest.Mock).mockReturnValue(false);

      await AllowedIpController.getMyIp(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getFilterMode', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await AllowedIpController.getFilterMode(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should call next with AuthorizationError for non-admin users', async () => {
      req.user = comercialUser;

      await AllowedIpController.getFilterMode(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });

    it('should return 200 with filter mode for admin', async () => {
      (serviceContainer.systemSettingRepository.getBool as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await AllowedIpController.getFilterMode(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ filteringEnabled: true, allowAll: false });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with errors from repository', async () => {
      const error = new Error('DB error');
      (serviceContainer.systemSettingRepository.getBool as jest.Mock).mockRejectedValue(error);

      await AllowedIpController.getFilterMode(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('setFilterMode', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await AllowedIpController.setFilterMode(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should call next with AuthorizationError for non-admin users', async () => {
      req.user = comercialUser;

      await AllowedIpController.setFilterMode(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });

    it('should return 200 and update filteringEnabled', async () => {
      req.body = { filteringEnabled: true };
      (serviceContainer.systemSettingRepository.set as jest.Mock).mockResolvedValue(undefined);

      await AllowedIpController.setFilterMode(req as any, res as any, next);

      expect(serviceContainer.systemSettingRepository.set).toHaveBeenCalledWith(
        'ip_filter_enabled',
        'true'
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Configuración de filtrado actualizada' });
    });

    it('should return 200 and update allowAll', async () => {
      req.body = { allowAll: false };
      (serviceContainer.systemSettingRepository.set as jest.Mock).mockResolvedValue(undefined);

      await AllowedIpController.setFilterMode(req as any, res as any, next);

      expect(serviceContainer.systemSettingRepository.set).toHaveBeenCalledWith(
        'ip_filter_allow_all',
        'false'
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 400 when filteringEnabled is not boolean', async () => {
      req.body = { filteringEnabled: 'yes' };

      await AllowedIpController.setFilterMode(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'El campo "filteringEnabled" debe ser un booleano',
      });
    });

    it('should return 400 when allowAll is not boolean', async () => {
      req.body = { allowAll: 1 };

      await AllowedIpController.setFilterMode(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'El campo "allowAll" debe ser un booleano',
      });
    });

    it('should update both fields when both provided', async () => {
      req.body = { filteringEnabled: false, allowAll: true };
      (serviceContainer.systemSettingRepository.set as jest.Mock).mockResolvedValue(undefined);

      await AllowedIpController.setFilterMode(req as any, res as any, next);

      expect(serviceContainer.systemSettingRepository.set).toHaveBeenCalledTimes(2);
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should call next with errors from repository', async () => {
      req.body = { filteringEnabled: true };
      const error = new Error('DB error');
      (serviceContainer.systemSettingRepository.set as jest.Mock).mockRejectedValue(error);

      await AllowedIpController.setFilterMode(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
