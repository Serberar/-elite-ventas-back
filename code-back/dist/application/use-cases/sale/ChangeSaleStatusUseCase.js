"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeSaleStatusUseCase = void 0;
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
const prometheusMetrics_1 = require("../../../infrastructure/observability/metrics/prometheusMetrics");
class ChangeSaleStatusUseCase {
    saleRepo;
    statusRepo;
    constructor(saleRepo, statusRepo) {
        this.saleRepo = saleRepo;
        this.statusRepo = statusRepo;
    }
    async execute(dto, currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.sale.ChangeSaleStatusUseCase, 'cambiar estado de venta');
        const sale = await this.saleRepo.findById(dto.saleId);
        if (!sale)
            throw new Error('Venta no encontrada');
        const status = await this.statusRepo.findById(dto.statusId);
        if (!status)
            throw new Error('Estado no encontrado');
        const updated = await this.saleRepo.update(sale.id, {
            statusId: status.id,
            closedAt: status.isFinal ? new Date() : null,
        });
        await this.saleRepo.addHistory({
            saleId: sale.id,
            userId: currentUser.id,
            action: 'change_status',
            payload: {
                from: sale.statusId,
                to: status.id,
                comment: dto.comment ?? null,
            },
        });
        prometheusMetrics_1.businessSaleStatusChanged.inc();
        return updated;
    }
}
exports.ChangeSaleStatusUseCase = ChangeSaleStatusUseCase;
