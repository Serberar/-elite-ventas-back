"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ClientController_1 = require("../../infrastructure/express/controllers/ClientController");
jest.mock('@application/use-cases/client/GetClientUseCase');
jest.mock('@application/use-cases/client/CreateClientUseCase');
jest.mock('@application/use-cases/client/UpdateClientUseCase');
jest.mock('@application/use-cases/client/PushDataClientUseCase');
const mockGetClientUseCase = require('../../application/use-cases/client/GetClientUseCase')
    .GetClientUseCase.prototype;
const mockCreateClientUseCase = require('../../application/use-cases/client/CreateClientUseCase')
    .CreateClientUseCase.prototype;
const mockUpdateClientUseCase = require('../../application/use-cases/client/UpdateClientUseCase')
    .UpdateClientUseCase.prototype;
const mockPushDataClientUseCase = require('../../application/use-cases/client/PushDataClientUseCase')
    .PushDataClientUseCase.prototype;
describe('ClientController', () => {
    let req;
    let res;
    let statusMock;
    let jsonMock;
    const currentUser = { id: 'user-1', role: 'administrador', firstName: 'Admin' };
    beforeEach(() => {
        statusMock = jest.fn().mockReturnThis();
        jsonMock = jest.fn();
        res = { status: statusMock, json: jsonMock };
        req = { user: currentUser, params: {}, body: {} };
        jest.clearAllMocks();
    });
    describe('getClient', () => {
        it('debería devolver 404 si no hay clientes', async () => {
            req.params = { value: '123' };
            mockGetClientUseCase.execute.mockResolvedValue([]);
            await ClientController_1.ClientController.getClient(req, res);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'No existen clientes con este teléfono o DNI',
            });
        });
        it('debería devolver 200 con clientes encontrados', async () => {
            const clients = [{ id: 'client-1', name: 'Cliente 1' }];
            req.params = { value: '123' };
            mockGetClientUseCase.execute.mockResolvedValue(clients);
            await ClientController_1.ClientController.getClient(req, res);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(clients);
        });
        it('debería devolver 403 si hay error de permisos', async () => {
            req.params = { value: '123' };
            mockGetClientUseCase.execute.mockRejectedValue(new Error('No tiene permiso'));
            await ClientController_1.ClientController.getClient(req, res);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'No tiene permiso' });
        });
        it('debería devolver 500 en otros errores', async () => {
            req.params = { value: '123' };
            mockGetClientUseCase.execute.mockRejectedValue(new Error('Error interno'));
            await ClientController_1.ClientController.getClient(req, res);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Error interno' });
        });
    });
    describe('createClient', () => {
        it('debería crear un cliente correctamente', async () => {
            const client = { id: 'client-1', name: 'Cliente 1' };
            req.body = { name: 'Cliente 1' };
            mockCreateClientUseCase.execute.mockResolvedValue(client);
            await ClientController_1.ClientController.createClient(req, res);
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Cliente creado correctamente', client });
        });
        it('debería devolver 500 si hay error', async () => {
            req.body = { name: 'Cliente 1' };
            mockCreateClientUseCase.execute.mockRejectedValue(new Error('Error creación'));
            await ClientController_1.ClientController.createClient(req, res);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Error creación' });
        });
    });
    describe('updateClient', () => {
        it('debería actualizar cliente correctamente', async () => {
            const updatedClient = { id: 'client-1', name: 'Cliente actualizado' };
            req.params = { id: 'client-1' };
            req.body = { name: 'Cliente actualizado' };
            mockUpdateClientUseCase.execute.mockResolvedValue(updatedClient);
            await ClientController_1.ClientController.updateClient(req, res);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Cliente editado correctamente',
                client: updatedClient,
            });
        });
        it('debería devolver 500 si hay error', async () => {
            req.params = { id: 'client-1' };
            req.body = { name: 'Cliente actualizado' };
            mockUpdateClientUseCase.execute.mockRejectedValue(new Error('Error actualización'));
            await ClientController_1.ClientController.updateClient(req, res);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Error actualización' });
        });
    });
    describe('pushClientData', () => {
        it('debería añadir datos correctamente', async () => {
            const updatedClient = { id: 'client-1', name: 'Cliente 1' };
            req.params = { id: 'client-1' };
            req.body = { phones: ['123'], addresses: ['Calle 1'], bankAccounts: [], comments: [] };
            mockPushDataClientUseCase.execute.mockResolvedValue(updatedClient);
            await ClientController_1.ClientController.pushClientData(req, res);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Datos del cliente añadidos correctamente',
                client: updatedClient,
            });
        });
        it('debería devolver 404 si cliente no funciona', async () => {
            req.params = { id: 'client-1' };
            req.body = {};
            mockPushDataClientUseCase.execute.mockRejectedValue(new Error('Cliente no funciona'));
            await ClientController_1.ClientController.pushClientData(req, res);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Cliente no funciona' });
        });
        it('debería devolver 500 en otros errores', async () => {
            req.params = { id: 'client-1' };
            req.body = {};
            mockPushDataClientUseCase.execute.mockRejectedValue(new Error('Error inesperado'));
            await ClientController_1.ClientController.pushClientData(req, res);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Error inesperado' });
        });
    });
});
