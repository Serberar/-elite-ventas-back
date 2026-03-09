"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteSaleStatusUseCase = void 0;
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
class DeleteSaleStatusUseCase {
    statusRepo;
    constructor(statusRepo) {
        this.statusRepo = statusRepo;
    }
    async execute(id, currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.saleStatus.DeleteSaleStatusUseCase, 'eliminar estados');
        // Verificar que existe
        const existing = await this.statusRepo.findById(id);
        if (!existing) {
            throw new Error('Estado de venta no encontrado');
        }
        // No permitir eliminar estados especiales
        if (existing.isCancelled) {
            throw new Error('No se puede eliminar el estado de cancelación');
        }
        if (existing.isFinal) {
            throw new Error('No se puede eliminar un estado final');
        }
        await this.statusRepo.delete(id);
    }
}
exports.DeleteSaleStatusUseCase = DeleteSaleStatusUseCase;
