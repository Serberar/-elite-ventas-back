"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateProductUseCase = void 0;
const Product_1 = require("../../../domain/entities/Product");
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
const logger_1 = __importDefault(require("../../../infrastructure/observability/logger/logger"));
const prometheusMetrics_1 = require("../../../infrastructure/observability/metrics/prometheusMetrics");
class UpdateProductUseCase {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute(data, currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.product.UpdateProductUseCase, 'actualizar productos');
        logger_1.default.info(`Actualizando producto ${data.id} — usuario ${currentUser.id}`);
        const existing = await this.repository.findById(data.id);
        if (!existing)
            throw new Error('Producto no encontrado');
        const updated = new Product_1.Product(existing.id, data.name ?? existing.name, data.description ?? existing.description, data.sku ?? existing.sku, data.price ?? existing.price, existing.active, existing.createdAt, new Date());
        const saved = await this.repository.update(updated.id, updated);
        prometheusMetrics_1.businessProductsUpdated.inc();
        logger_1.default.info(`Producto actualizado ${saved.id}`);
        return saved;
    }
}
exports.UpdateProductUseCase = UpdateProductUseCase;
