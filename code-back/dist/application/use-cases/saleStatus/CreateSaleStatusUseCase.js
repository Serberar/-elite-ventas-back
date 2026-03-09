"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateSaleStatusUseCase = void 0;
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
class CreateSaleStatusUseCase {
    statusRepo;
    constructor(statusRepo) {
        this.statusRepo = statusRepo;
    }
    async execute(dto, currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.saleStatus.CreateSaleStatusUseCase, 'crear estado de venta');
        return await this.statusRepo.create({
            name: dto.name,
            order: dto.order,
            color: dto.color ?? null,
            isFinal: dto.isFinal ?? false,
            isCancelled: dto.isCancelled ?? false,
        });
    }
}
exports.CreateSaleStatusUseCase = CreateSaleStatusUseCase;
