import { SaleStatusController } from '@infrastructure/express/controllers/SaleStatusController';
import { Request, Response, NextFunction } from 'express';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { AuthenticationError, AuthorizationError, NotFoundError } from '@application/shared/AppError';

jest.mock('@infrastructure/container/ServiceContainer', () => ({
  serviceContainer: {
    listSaleStatusUseCase: { execute: jest.fn() },
    createSaleStatusUseCase: { execute: jest.fn() },
    updateSaleStatusUseCase: { execute: jest.fn() },
    reorderSaleStatusesUseCase: { execute: jest.fn() },
    deleteSaleStatusUseCase: { execute: jest.fn() },
  },
}));

describe('SaleStatusController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<NextFunction>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const currentUser: CurrentUser = { id: 'user-1', role: 'administrador', firstName: 'Admin', empresaId: '00000000-0000-0000-0000-000000000001' };

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    next = jest.fn();
    res = { status: statusMock, json: jsonMock };
    req = { user: currentUser, params: {}, body: {}, query: {} };
    jest.clearAllMocks();
  });

  describe('listSaleStatuses', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await SaleStatusController.listSaleStatuses(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 200 with statuses list', async () => {
      const statuses = [
        { id: 'status-1', name: 'Pending' },
        { id: 'status-2', name: 'Completed' },
      ];
      (serviceContainer.listSaleStatusUseCase.execute as jest.Mock).mockResolvedValue(statuses);

      await SaleStatusController.listSaleStatuses(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(statuses);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error for permission errors', async () => {
      const error = new AuthorizationError('No tiene permiso');
      (serviceContainer.listSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleStatusController.listSaleStatuses(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for other errors', async () => {
      const error = new Error('Database error');
      (serviceContainer.listSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleStatusController.listSaleStatuses(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('createSaleStatus', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await SaleStatusController.createSaleStatus(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 201 with created status', async () => {
      const status = { id: 'status-1', name: 'New Status' };
      req.body = { name: 'New Status', order: 1 };
      (serviceContainer.createSaleStatusUseCase.execute as jest.Mock).mockResolvedValue(status);

      await SaleStatusController.createSaleStatus(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Estado de venta creado correctamente',
        status,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error for permission errors', async () => {
      req.body = { name: 'New Status' };
      const error = new AuthorizationError('No tiene permiso');
      (serviceContainer.createSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleStatusController.createSaleStatus(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for other errors', async () => {
      req.body = { name: 'New Status' };
      const error = new Error('Database error');
      (serviceContainer.createSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleStatusController.createSaleStatus(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateSaleStatus', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await SaleStatusController.updateSaleStatus(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 200 with updated status', async () => {
      const status = { id: 'status-1', name: 'Updated Status' };
      req.params = { id: 'status-1' };
      req.body = { name: 'Updated Status' };
      (serviceContainer.updateSaleStatusUseCase.execute as jest.Mock).mockResolvedValue(status);

      await SaleStatusController.updateSaleStatus(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Estado de venta actualizado correctamente',
        status,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error for permission errors', async () => {
      req.params = { id: 'status-1' };
      req.body = { name: 'Updated Status' };
      const error = new AuthorizationError('No tiene permiso');
      (serviceContainer.updateSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleStatusController.updateSaleStatus(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for not found errors', async () => {
      req.params = { id: 'status-1' };
      req.body = { name: 'Updated Status' };
      const error = new NotFoundError('Estado', 'status-1');
      (serviceContainer.updateSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleStatusController.updateSaleStatus(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for other errors', async () => {
      req.params = { id: 'status-1' };
      req.body = { name: 'Updated Status' };
      const error = new Error('Database error');
      (serviceContainer.updateSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleStatusController.updateSaleStatus(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('reorderSaleStatuses', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await SaleStatusController.reorderSaleStatuses(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 200 after reordering', async () => {
      const statuses = [
        { id: 'status-1', order: 2 },
        { id: 'status-2', order: 1 },
      ];
      req.body = { orderedIds: ['status-2', 'status-1'] };
      (serviceContainer.reorderSaleStatusesUseCase.execute as jest.Mock).mockResolvedValue(statuses);

      await SaleStatusController.reorderSaleStatuses(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(statuses);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error for permission errors', async () => {
      req.body = { orderedIds: [] };
      const error = new AuthorizationError('No tiene permiso');
      (serviceContainer.reorderSaleStatusesUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleStatusController.reorderSaleStatuses(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for other errors', async () => {
      req.body = { orderedIds: [] };
      const error = new Error('Database error');
      (serviceContainer.reorderSaleStatusesUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleStatusController.reorderSaleStatuses(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteSaleStatus', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await SaleStatusController.deleteSaleStatus(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 200 after deleting', async () => {
      req.params = { id: 'status-1' };
      (serviceContainer.deleteSaleStatusUseCase.execute as jest.Mock).mockResolvedValue(undefined);

      await SaleStatusController.deleteSaleStatus(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Estado de venta eliminado correctamente',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error for permission errors', async () => {
      req.params = { id: 'status-1' };
      const error = new AuthorizationError('No tiene permiso');
      (serviceContainer.deleteSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleStatusController.deleteSaleStatus(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for not found errors', async () => {
      req.params = { id: 'status-1' };
      const error = new NotFoundError('Estado', 'status-1');
      (serviceContainer.deleteSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleStatusController.deleteSaleStatus(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
