"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateClientSnapshotUseCase = void 0;
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
class UpdateClientSnapshotUseCase {
    saleRepo;
    constructor(saleRepo) {
        this.saleRepo = saleRepo;
    }
    async execute(saleId, clientSnapshot, currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.sale.UpdateClientSnapshotUseCase, 'actualizar datos del cliente en la venta');
        // Verificar que la venta existe
        const sale = await this.saleRepo.findById(saleId);
        if (!sale) {
            throw new Error('Venta no encontrada');
        }
        // Actualizar el clientSnapshot
        await this.saleRepo.updateClientSnapshot(saleId, clientSnapshot);
        // Registrar en el historial
        await this.saleRepo.addHistory({
            saleId,
            userId: currentUser.id,
            action: 'update_client_snapshot',
            payload: { clientSnapshot },
        });
        // Obtener la venta actualizada con todas las relaciones
        const updatedSale = await this.saleRepo.findWithRelations(saleId);
        if (!updatedSale) {
            throw new Error('Error al obtener la venta actualizada');
        }
        return {
            ...updatedSale.sale.toPrisma(),
            client: clientSnapshot,
            status: updatedSale.status ?? null,
            items: updatedSale.items.map((item) => item.toPrisma()),
            assignments: updatedSale.assignments.map((a) => a.toPrisma()),
            histories: updatedSale.histories.map((h) => h.toPrisma()),
        };
    }
}
exports.UpdateClientSnapshotUseCase = UpdateClientSnapshotUseCase;
