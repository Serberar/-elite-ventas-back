"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReorderSaleStatusesUseCase = void 0;
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
class ReorderSaleStatusesUseCase {
    statusRepo;
    constructor(statusRepo) {
        this.statusRepo = statusRepo;
    }
    async execute(dto, currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.saleStatus.ReorderSaleStatusesUseCase, 'reordenar estados');
        // dto.statuses es el array correcto
        return await this.statusRepo.reorder(dto.statuses);
    }
}
exports.ReorderSaleStatusesUseCase = ReorderSaleStatusesUseCase;
