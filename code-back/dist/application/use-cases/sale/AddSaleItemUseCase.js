"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddSaleItemUseCase = void 0;
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
const prometheusMetrics_1 = require("../../../infrastructure/observability/metrics/prometheusMetrics");
class AddSaleItemUseCase {
    saleRepo;
    constructor(saleRepo) {
        this.saleRepo = saleRepo;
    }
    async execute(saleId, item, currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.sale.AddSaleItemUseCase, 'añadir item a venta');
        const added = await this.saleRepo.addItem(saleId, item);
        prometheusMetrics_1.businessSaleItemsAdded.inc();
        await this.saleRepo.addHistory({
            saleId,
            userId: currentUser.id,
            action: 'add_item',
            payload: item,
        });
        return added;
    }
}
exports.AddSaleItemUseCase = AddSaleItemUseCase;
