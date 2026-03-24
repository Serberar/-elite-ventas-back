import { ClientController } from '@infrastructure/express/controllers/ClientController';
import { Request, Response, NextFunction } from 'express';
import { CurrentUser } from '@application/shared/types/CurrentUser';

jest.mock('@application/use-cases/client/GetClientUseCase');
jest.mock('@application/use-cases/client/CreateClientUseCase');
jest.mock('@application/use-cases/client/UpdateClientUseCase');
jest.mock('@application/use-cases/client/PushDataClientUseCase');

const mockGetClientUseCase = require('@application/use-cases/client/GetClientUseCase')
  .GetClientUseCase.prototype;
const mockCreateClientUseCase = require('@application/use-cases/client/CreateClientUseCase')
  .CreateClientUseCase.prototype;
const mockUpdateClientUseCase = require('@application/use-cases/client/UpdateClientUseCase')
  .UpdateClientUseCase.prototype;
const mockPushDataClientUseCase = require('@application/use-cases/client/PushDataClientUseCase')
  .PushDataClientUseCase.prototype;

describe('ClientController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.MockedFunction<NextFunction>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const currentUser: CurrentUser = { id: 'user-1', role: 'administrador', firstName: 'Admin', empresaId: '00000000-0000-0000-0000-000000000001' };

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    res = { status: statusMock, json: jsonMock };
    req = { user: currentUser, params: {}, body: {} };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getClient', () => {
    it('debería devolver 404 si no hay clientes', async () => {
      req.params = { value: '123' };
      mockGetClientUseCase.execute.mockResolvedValue([]);

      await ClientController.getClient(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'No existen clientes con este teléfono o DNI',
      });
    });

    it('debería devolver 200 con clientes encontrados', async () => {
      const clients = [{ id: 'client-1', name: 'Cliente 1' }];
      req.params = { value: '123' };
      mockGetClientUseCase.execute.mockResolvedValue(clients);

      await ClientController.getClient(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(clients);
    });

    it('debería delegar errores al error handler centralizado', async () => {
      req.params = { value: '123' };
      const error = new Error('No tiene permiso');
      mockGetClientUseCase.execute.mockRejectedValue(error);

      await ClientController.getClient(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('debería delegar errores internos al error handler centralizado', async () => {
      req.params = { value: '123' };
      const error = new Error('Error interno');
      mockGetClientUseCase.execute.mockRejectedValue(error);

      await ClientController.getClient(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('createClient', () => {
    it('debería crear un cliente correctamente', async () => {
      const client = { id: 'client-1', name: 'Cliente 1' };
      req.body = { name: 'Cliente 1' };
      mockCreateClientUseCase.execute.mockResolvedValue(client);

      await ClientController.createClient(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Cliente creado correctamente', client });
    });

    it('debería delegar errores al error handler centralizado', async () => {
      req.body = { name: 'Cliente 1' };
      const error = new Error('Error creación');
      mockCreateClientUseCase.execute.mockRejectedValue(error);

      await ClientController.createClient(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateClient', () => {
    it('debería actualizar cliente correctamente', async () => {
      const updatedClient = { id: 'client-1', name: 'Cliente actualizado' };
      req.params = { id: 'client-1' };
      req.body = { name: 'Cliente actualizado' };
      mockUpdateClientUseCase.execute.mockResolvedValue(updatedClient);

      await ClientController.updateClient(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Cliente editado correctamente',
        client: updatedClient,
      });
    });

    it('debería delegar errores al error handler centralizado', async () => {
      req.params = { id: 'client-1' };
      req.body = { name: 'Cliente actualizado' };
      const error = new Error('Error actualización');
      mockUpdateClientUseCase.execute.mockRejectedValue(error);

      await ClientController.updateClient(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('pushClientData', () => {
    it('debería añadir datos correctamente', async () => {
      const updatedClient = { id: 'client-1', name: 'Cliente 1' };
      req.params = { id: 'client-1' };
      req.body = { phones: ['123'], addresses: ['Calle 1'], bankAccounts: [], comments: [] };
      mockPushDataClientUseCase.execute.mockResolvedValue(updatedClient);

      await ClientController.pushClientData(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Datos del cliente añadidos correctamente',
        client: updatedClient,
      });
    });

    it('debería delegar errores al error handler centralizado', async () => {
      req.params = { id: 'client-1' };
      req.body = {};
      const error = new Error('Cliente no funciona');
      mockPushDataClientUseCase.execute.mockRejectedValue(error);

      await ClientController.pushClientData(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('debería delegar errores inesperados al error handler centralizado', async () => {
      req.params = { id: 'client-1' };
      req.body = {};
      const error = new Error('Error inesperado');
      mockPushDataClientUseCase.execute.mockRejectedValue(error);

      await ClientController.pushClientData(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
