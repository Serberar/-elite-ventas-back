"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoveSaleItemUseCase = void 0;
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
const prometheusMetrics_1 = require("../../../infrastructure/observability/metrics/prometheusMetrics");
class RemoveSaleItemUseCase {
    saleRepo;
    constructor(saleRepo) {
        this.saleRepo = saleRepo;
    }
    async execute(saleId, itemId, currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.sale.RemoveSaleItemUseCase, 'eliminar item de venta');
        await this.saleRepo.removeItem(itemId);
        prometheusMetrics_1.businessSaleItemsDeleted.inc();
        await this.saleRepo.addHistory({
            saleId,
            userId: currentUser.id,
            action: 'delete_item',
            payload: { itemId },
        });
    }
}
exports.RemoveSaleItemUseCase = RemoveSaleItemUseCase;
