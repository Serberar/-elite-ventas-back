"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListProductsUseCase = void 0;
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
const logger_1 = __importDefault(require("../../../infrastructure/observability/logger/logger"));
class ListProductsUseCase {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute(currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.product.ListProductsUseCase, 'listar productos');
        logger_1.default.info(`Listando productos — usuario ${currentUser.id}`);
        const list = await this.repository.findAll();
        return list;
    }
}
exports.ListProductsUseCase = ListProductsUseCase;
