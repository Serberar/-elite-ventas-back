"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSaleItemUseCase = void 0;
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
const prometheusMetrics_1 = require("../../../infrastructure/observability/metrics/prometheusMetrics");
class UpdateSaleItemUseCase {
    saleRepo;
    constructor(saleRepo) {
        this.saleRepo = saleRepo;
    }
    async execute(dto, currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.sale.UpdateSaleItemUseCase, 'actualizar items de venta');
        for (const item of dto.items) {
            await this.saleRepo.updateItem(item.id, {
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                finalPrice: item.finalPrice,
            });
            await this.saleRepo.addHistory({
                saleId: dto.saleId,
                userId: currentUser.id,
                action: 'update_item',
                payload: item,
            });
        }
        prometheusMetrics_1.businessSaleItemsUpdated.inc(dto.items.length);
    }
}
exports.UpdateSaleItemUseCase = UpdateSaleItemUseCase;
