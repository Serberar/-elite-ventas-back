"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaleController = void 0;
const ServiceContainer_1 = require("../../container/ServiceContainer");
const types_1 = require("../../../domain/types");
class SaleController {
    static async createSaleWithProducts(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser)
                return res.status(401).json({ message: 'No autorizado' });
            const dto = {
                client: req.body.client,
                items: req.body.items,
                statusId: req.body.statusId,
                notes: req.body.notes,
                metadata: req.body.metadata,
            };
            const sale = await ServiceContainer_1.serviceContainer.createSaleWithProductsUseCase.execute(dto, currentUser);
            // Obtener la venta completa con relaciones
            const saleWithRelations = await ServiceContainer_1.serviceContainer.saleRepository.findWithRelations(sale.id);
            if (!saleWithRelations)
                return res.status(500).json({ message: 'Error al obtener la venta creada' });
            const salePrisma = saleWithRelations.sale.toPrisma();
            const saleResponse = {
                ...salePrisma,
                client: salePrisma.clientSnapshot ?? null,
                status: saleWithRelations.status ?? null,
                items: saleWithRelations.items.map((i) => i.toPrisma()),
                assignments: saleWithRelations.assignments.map((a) => a.toPrisma()),
                histories: saleWithRelations.histories.map((h) => h.toPrisma()),
            };
            return res.status(201).json({ message: 'Venta creada correctamente', sale: saleResponse });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            if (msg.includes('permiso'))
                return res.status(403).json({ message: msg });
            console.error('Error en createSaleWithProducts:', msg);
            return res.status(500).json({ message: msg });
        }
    }
    static async getSaleById(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'No autorizado' });
            }
            const { saleId } = req.params;
            const saleWithRelations = await ServiceContainer_1.serviceContainer.saleRepository.findWithRelations(saleId);
            if (!saleWithRelations) {
                return res.status(404).json({ message: 'Venta no encontrada' });
            }
            const salePrisma = saleWithRelations.sale.toPrisma();
            const saleResponse = {
                ...salePrisma,
                client: salePrisma.clientSnapshot ?? null,
                status: saleWithRelations.status ?? null,
                items: saleWithRelations.items.map((item) => item.toPrisma()),
                assignments: saleWithRelations.assignments.map((a) => a.toPrisma()),
                histories: saleWithRelations.histories.map((h) => h.toPrisma()),
            };
            res.status(200).json(saleResponse);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso')) {
                return res.status(403).json({ message: errorMessage });
            }
            res.status(500).json({ message: errorMessage });
        }
    }
    static async listSalesWithFilters(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'No autorizado' });
            }
            const filters = {
                clientId: req.query.clientId,
                statusId: req.query.statusId,
                from: req.query.from ? new Date(req.query.from) : undefined,
                to: req.query.to ? new Date(req.query.to) : undefined,
                productId: req.query.productId,
                minTotal: req.query.minTotal ? Number(req.query.minTotal) : undefined,
                maxTotal: req.query.maxTotal ? Number(req.query.maxTotal) : undefined,
            };
            const sales = await ServiceContainer_1.serviceContainer.listSalesWithFiltersUseCase.execute(filters, currentUser);
            const salesWithRelations = await Promise.all(sales.map(async (sale) => {
                const saleWithRelations = await ServiceContainer_1.serviceContainer.saleRepository.findWithRelations(sale.id);
                const salePrisma = sale.toPrisma();
                if (!saleWithRelations) {
                    return {
                        ...salePrisma,
                        client: salePrisma.clientSnapshot ?? null,
                        status: null,
                        items: [],
                        assignments: [],
                        histories: [],
                    };
                }
                const saleWithRelationsPrisma = saleWithRelations.sale.toPrisma();
                return {
                    ...saleWithRelationsPrisma,
                    client: saleWithRelationsPrisma.clientSnapshot ?? null,
                    status: saleWithRelations.status ?? null,
                    items: saleWithRelations.items.map((item) => item.toPrisma()),
                    assignments: saleWithRelations.assignments.map((a) => a.toPrisma()),
                    histories: saleWithRelations.histories.map((h) => h.toPrisma()),
                };
            }));
            res.status(200).json(salesWithRelations);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso')) {
                return res.status(403).json({ message: errorMessage });
            }
            res.status(500).json({ message: errorMessage });
        }
    }
    /**
     * Listado paginado de ventas con filtros
     * Query params: page, limit, clientId, statusId, from, to
     */
    static async listSalesPaginated(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'No autorizado' });
            }
            const pagination = (0, types_1.parsePaginationOptions)(req.query.page, req.query.limit);
            const filters = {
                clientId: req.query.clientId,
                statusId: req.query.statusId,
                from: req.query.from ? new Date(req.query.from) : undefined,
                to: req.query.to ? new Date(req.query.to) : undefined,
            };
            const result = await ServiceContainer_1.serviceContainer.saleRepository.listPaginated(filters, pagination);
            // Enriquecer con relaciones
            const salesWithRelations = await Promise.all(result.data.map(async (sale) => {
                const saleWithRelations = await ServiceContainer_1.serviceContainer.saleRepository.findWithRelations(sale.id);
                const salePrisma = sale.toPrisma();
                if (!saleWithRelations) {
                    return {
                        ...salePrisma,
                        client: salePrisma.clientSnapshot ?? null,
                        status: null,
                        items: [],
                        assignments: [],
                        histories: [],
                    };
                }
                const saleWithRelationsPrisma = saleWithRelations.sale.toPrisma();
                return {
                    ...saleWithRelationsPrisma,
                    client: saleWithRelationsPrisma.clientSnapshot ?? null,
                    status: saleWithRelations.status ?? null,
                    items: saleWithRelations.items.map((item) => item.toPrisma()),
                    assignments: saleWithRelations.assignments.map((a) => a.toPrisma()),
                    histories: saleWithRelations.histories.map((h) => h.toPrisma()),
                };
            }));
            res.status(200).json({
                data: salesWithRelations,
                meta: result.meta,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso')) {
                return res.status(403).json({ message: errorMessage });
            }
            res.status(500).json({ message: errorMessage });
        }
    }
    static async addSaleItem(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'No autorizado' });
            }
            const { saleId } = req.params;
            // Adaptar datos del frontend al formato que espera el backend
            const itemData = {
                productId: req.body.productId || null,
                nameSnapshot: req.body.name,
                skuSnapshot: req.body.sku || null,
                unitPrice: Number(req.body.price),
                quantity: Number(req.body.quantity),
                finalPrice: Number(req.body.price) * Number(req.body.quantity),
            };
            await ServiceContainer_1.serviceContainer.addSaleItemUseCase.execute(saleId, itemData, currentUser);
            // Obtener la venta completa con relaciones
            const saleWithRelations = await ServiceContainer_1.serviceContainer.saleRepository.findWithRelations(saleId);
            if (!saleWithRelations)
                return res.status(500).json({ message: 'Error al obtener la venta actualizada' });
            const salePrisma = saleWithRelations.sale.toPrisma();
            const saleResponse = {
                ...salePrisma,
                client: salePrisma.clientSnapshot ?? null,
                status: saleWithRelations.status ?? null,
                items: saleWithRelations.items.map((i) => i.toPrisma()),
                assignments: saleWithRelations.assignments.map((a) => a.toPrisma()),
                histories: saleWithRelations.histories.map((h) => h.toPrisma()),
            };
            res.status(200).json({ message: 'Item añadido a la venta correctamente', sale: saleResponse });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso'))
                return res.status(403).json({ message: errorMessage });
            if (errorMessage.includes('no encontrado') || errorMessage.includes('no encontrada'))
                return res.status(404).json({ message: errorMessage });
            res.status(500).json({ message: errorMessage });
        }
    }
    static async updateSaleItem(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser)
                return res.status(401).json({ message: 'No autorizado' });
            const { saleId, itemId } = req.params;
            // Adaptar datos del frontend al formato que espera el backend
            const dto = {
                saleId,
                items: [
                    {
                        id: itemId,
                        unitPrice: req.body.unitPrice,
                        quantity: req.body.quantity,
                        finalPrice: req.body.finalPrice,
                    },
                ],
            };
            await ServiceContainer_1.serviceContainer.updateSaleItemUseCase.execute(dto, currentUser);
            // Obtener la venta completa con relaciones
            const saleWithRelations = await ServiceContainer_1.serviceContainer.saleRepository.findWithRelations(saleId);
            if (!saleWithRelations)
                return res.status(500).json({ message: 'Error al obtener la venta actualizada' });
            const salePrisma = saleWithRelations.sale.toPrisma();
            const saleResponse = {
                ...salePrisma,
                client: salePrisma.clientSnapshot ?? null,
                status: saleWithRelations.status ?? null,
                items: saleWithRelations.items.map((i) => i.toPrisma()),
                assignments: saleWithRelations.assignments.map((a) => a.toPrisma()),
                histories: saleWithRelations.histories.map((h) => h.toPrisma()),
            };
            res.status(200).json({ message: 'Item actualizado correctamente', sale: saleResponse });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso'))
                return res.status(403).json({ message: errorMessage });
            if (errorMessage.includes('no encontrado') || errorMessage.includes('no encontrada'))
                return res.status(404).json({ message: errorMessage });
            res.status(500).json({ message: errorMessage });
        }
    }
    static async removeSaleItem(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser)
                return res.status(401).json({ message: 'No autorizado' });
            const { saleId, itemId } = req.params;
            await ServiceContainer_1.serviceContainer.removeSaleItemUseCase.execute(saleId, itemId, currentUser);
            // Obtener la venta completa con relaciones
            const saleWithRelations = await ServiceContainer_1.serviceContainer.saleRepository.findWithRelations(saleId);
            if (!saleWithRelations)
                return res.status(500).json({ message: 'Error al obtener la venta actualizada' });
            const salePrisma = saleWithRelations.sale.toPrisma();
            const saleResponse = {
                ...salePrisma,
                client: salePrisma.clientSnapshot ?? null,
                status: saleWithRelations.status ?? null,
                items: saleWithRelations.items.map((i) => i.toPrisma()),
                assignments: saleWithRelations.assignments.map((a) => a.toPrisma()),
                histories: saleWithRelations.histories.map((h) => h.toPrisma()),
            };
            res.status(200).json({ message: 'Item eliminado correctamente', sale: saleResponse });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso'))
                return res.status(403).json({ message: errorMessage });
            if (errorMessage.includes('no encontrado') || errorMessage.includes('no encontrada'))
                return res.status(404).json({ message: errorMessage });
            res.status(500).json({ message: errorMessage });
        }
    }
    static async changeSaleStatus(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser)
                return res.status(401).json({ message: 'No autorizado' });
            const { saleId } = req.params;
            const dto = {
                saleId,
                statusId: req.body.statusId,
                comment: req.body.comment,
            };
            const sale = await ServiceContainer_1.serviceContainer.changeSaleStatusUseCase.execute(dto, currentUser);
            // Obtener la venta completa con relaciones
            const saleWithRelations = await ServiceContainer_1.serviceContainer.saleRepository.findWithRelations(sale.id);
            if (!saleWithRelations)
                return res.status(500).json({ message: 'Error al obtener la venta actualizada' });
            const salePrisma = saleWithRelations.sale.toPrisma();
            const saleResponse = {
                ...salePrisma,
                client: salePrisma.clientSnapshot ?? null,
                status: saleWithRelations.status ?? null,
                items: saleWithRelations.items.map((i) => i.toPrisma()),
                assignments: saleWithRelations.assignments.map((a) => a.toPrisma()),
                histories: saleWithRelations.histories.map((h) => h.toPrisma()),
            };
            res.status(200).json({ message: 'Estado de venta cambiado correctamente', sale: saleResponse });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso'))
                return res.status(403).json({ message: errorMessage });
            if (errorMessage.includes('no encontrado') || errorMessage.includes('no encontrada'))
                return res.status(404).json({ message: errorMessage });
            res.status(500).json({ message: errorMessage });
        }
    }
    static async updateClientSnapshot(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser)
                return res.status(401).json({ message: 'No autorizado' });
            const { saleId } = req.params;
            const { clientSnapshot } = req.body;
            if (!clientSnapshot) {
                return res.status(400).json({ message: 'El clientSnapshot es requerido' });
            }
            const sale = await ServiceContainer_1.serviceContainer.updateClientSnapshotUseCase.execute(saleId, clientSnapshot, currentUser);
            res.status(200).json({ message: 'Datos del cliente actualizados correctamente', sale });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso'))
                return res.status(403).json({ message: errorMessage });
            if (errorMessage.includes('no encontrado') || errorMessage.includes('no encontrada'))
                return res.status(404).json({ message: errorMessage });
            res.status(500).json({ message: errorMessage });
        }
    }
    static async getSalesStats(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser)
                return res.status(401).json({ message: 'No autorizado' });
            const stats = await ServiceContainer_1.serviceContainer.getSalesStatsUseCase.execute(currentUser);
            res.status(200).json(stats);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            if (errorMessage.includes('permiso'))
                return res.status(403).json({ message: errorMessage });
            res.status(500).json({ message: errorMessage });
        }
    }
}
exports.SaleController = SaleController;
