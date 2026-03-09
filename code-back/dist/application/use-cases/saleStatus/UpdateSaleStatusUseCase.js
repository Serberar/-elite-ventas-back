"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSaleStatusUseCase = void 0;
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
class UpdateSaleStatusUseCase {
    statusRepo;
    constructor(statusRepo) {
        this.statusRepo = statusRepo;
    }
    async execute(dto, currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.saleStatus.UpdateSaleStatusUseCase, 'actualizar estado de venta');
        return await this.statusRepo.update(dto.id, {
            name: dto.name,
            color: dto.color ?? null,
            isFinal: dto.isFinal,
            isCancelled: dto.isCancelled,
        });
    }
}
exports.UpdateSaleStatusUseCase = UpdateSaleStatusUseCase;
