"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaleStatusController = void 0;
const ServiceContainer_1 = require("../../container/ServiceContainer");
class SaleStatusController {
    static async listSaleStatuses(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'No autorizado' });
            }
            const statuses = await ServiceContainer_1.serviceContainer.listSaleStatusUseCase.execute(currentUser);
            res.status(200).json(statuses);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso')) {
                return res.status(403).json({ message: errorMessage });
            }
            res.status(500).json({ message: errorMessage });
        }
    }
    static async createSaleStatus(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'No autorizado' });
            }
            const status = await ServiceContainer_1.serviceContainer.createSaleStatusUseCase.execute(req.body, currentUser);
            res.status(201).json({ message: 'Estado de venta creado correctamente', status });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso')) {
                return res.status(403).json({ message: errorMessage });
            }
            res.status(500).json({ message: errorMessage });
        }
    }
    static async updateSaleStatus(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'No autorizado' });
            }
            const { id } = req.params;
            const status = await ServiceContainer_1.serviceContainer.updateSaleStatusUseCase.execute({ ...req.body, id }, currentUser);
            res.status(200).json({ message: 'Estado de venta actualizado correctamente', status });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso')) {
                return res.status(403).json({ message: errorMessage });
            }
            if (errorMessage.includes('no encontrado')) {
                return res.status(404).json({ message: errorMessage });
            }
            res.status(500).json({ message: errorMessage });
        }
    }
    static async reorderSaleStatuses(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'No autorizado' });
            }
            const statuses = await ServiceContainer_1.serviceContainer.reorderSaleStatusesUseCase.execute(req.body, currentUser);
            res.status(200).json(statuses);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso')) {
                return res.status(403).json({ message: errorMessage });
            }
            res.status(500).json({ message: errorMessage });
        }
    }
    static async deleteSaleStatus(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'No autorizado' });
            }
            const { id } = req.params;
            await ServiceContainer_1.serviceContainer.deleteSaleStatusUseCase.execute(id, currentUser);
            res.status(200).json({ message: 'Estado de venta eliminado correctamente' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso')) {
                return res.status(403).json({ message: errorMessage });
            }
            if (errorMessage.includes('no encontrado')) {
                return res.status(404).json({ message: errorMessage });
            }
            res.status(500).json({ message: errorMessage });
        }
    }
}
exports.SaleStatusController = SaleStatusController;
