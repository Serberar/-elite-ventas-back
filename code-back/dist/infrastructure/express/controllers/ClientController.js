"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientController = void 0;
const ServiceContainer_1 = require("../../container/ServiceContainer");
const logger_1 = __importDefault(require("../../observability/logger/logger"));
class ClientController {
    static async getClient(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'No autorizado' });
            }
            const { value } = req.params;
            const clients = await ServiceContainer_1.serviceContainer.getClientUseCase.execute(value, currentUser);
            if (clients.length === 0) {
                return res.status(404).json({ message: 'No existen clientes con este teléfono o DNI' });
            }
            res.status(200).json(clients);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso')) {
                return res.status(403).json({ message: errorMessage });
            }
            res.status(500).json({ message: errorMessage });
        }
    }
    static async createClient(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'No autorizado' });
            }
            logger_1.default.debug('Client creation request received', {
                userId: currentUser.id,
                bodyKeys: Object.keys(req.body),
            });
            const clientData = req.body;
            const client = await ServiceContainer_1.serviceContainer.createClientUseCase.execute(clientData, currentUser);
            res.status(201).json({ message: 'Cliente creado correctamente', client });
        }
        catch (error) {
            logger_1.default.error('Error creating client', { error });
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            res.status(500).json({ message: errorMessage });
        }
    }
    static async updateClient(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'No autorizado' });
            }
            const updateData = req.body;
            const updatedClient = await ServiceContainer_1.serviceContainer.updateClientUseCase.execute({ id: req.params.id, ...updateData }, currentUser);
            res.status(200).json({ message: 'Cliente editado correctamente', client: updatedClient });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            res.status(500).json({ message: errorMessage });
        }
    }
    // Solamente pushear datos
    static async pushClientData(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'No autorizado' });
            }
            const { id } = req.params;
            const pushData = req.body;
            const updatedClient = await ServiceContainer_1.serviceContainer.pushDataClientUseCase.execute({ id, ...pushData }, currentUser);
            res.status(200).json({
                message: 'Datos del cliente añadidos correctamente',
                client: updatedClient,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage === 'Cliente no funciona') {
                return res.status(404).json({ message: errorMessage });
            }
            res.status(500).json({ message: errorMessage });
        }
    }
}
exports.ClientController = ClientController;
