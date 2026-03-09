"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateProductUseCase = void 0;
const Product_1 = require("../../../domain/entities/Product");
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../../../infrastructure/observability/logger/logger"));
const prometheusMetrics_1 = require("../../../infrastructure/observability/metrics/prometheusMetrics");
class CreateProductUseCase {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute(data, // DTO ya validado en la ruta
    currentUser) {
        // Permisos
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.product.CreateProductUseCase, 'crear productos');
        logger_1.default.info(`Creando producto "${data.name}" — usuario ${currentUser.id}`);
        // Construir entidad
        const product = new Product_1.Product(crypto_1.default.randomUUID(), data.name, data.description ?? null, data.sku ?? null, data.price, true, new Date(), new Date());
        // Persistir
        const created = await this.repository.create(product);
        // Registrar métrica de negocio
        prometheusMetrics_1.businessProductsCreated.inc();
        logger_1.default.info(`Producto creado: ${created.id} — SKU: ${created.sku ?? 'sin SKU'}`);
        return created;
    }
}
exports.CreateProductUseCase = CreateProductUseCase;
