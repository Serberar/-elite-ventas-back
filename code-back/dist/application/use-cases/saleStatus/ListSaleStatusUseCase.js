"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListSaleStatusUseCase = void 0;
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
class ListSaleStatusUseCase {
    statusRepo;
    constructor(statusRepo) {
        this.statusRepo = statusRepo;
    }
    async execute(currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.saleStatus.ListSaleStatusUseCase, 'listar estados de venta');
        return this.statusRepo.list();
    }
}
exports.ListSaleStatusUseCase = ListSaleStatusUseCase;
