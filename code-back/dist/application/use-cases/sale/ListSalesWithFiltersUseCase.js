"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListSalesWithFiltersUseCase = void 0;
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
class ListSalesWithFiltersUseCase {
    saleRepo;
    constructor(saleRepo) {
        this.saleRepo = saleRepo;
    }
    async execute(filters, currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.sale.ListSalesWithFiltersUseCase, 'listar ventas con filtros');
        return this.saleRepo.list(filters);
    }
}
exports.ListSalesWithFiltersUseCase = ListSalesWithFiltersUseCase;
