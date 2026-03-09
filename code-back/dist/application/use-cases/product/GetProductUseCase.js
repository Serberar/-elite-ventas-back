"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetProductUseCase = void 0;
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
const logger_1 = __importDefault(require("../../../infrastructure/observability/logger/logger"));
class GetProductUseCase {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute(id, currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.product.GetProductUseCase, 'ver productos');
        logger_1.default.info(`Obteniendo producto ${id} — usuario ${currentUser.id}`);
        const product = await this.repository.findById(id);
        if (!product)
            throw new Error('Producto no encontrado');
        return product;
    }
}
exports.GetProductUseCase = GetProductUseCase;
