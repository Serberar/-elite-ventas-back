"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToggleProductActiveUseCase = void 0;
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
const logger_1 = __importDefault(require("../../../infrastructure/observability/logger/logger"));
const prometheusMetrics_1 = require("../../../infrastructure/observability/metrics/prometheusMetrics");
class ToggleProductActiveUseCase {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute(data, currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.product.ToggleProductActiveUseCase, 'activar/desactivar productos');
        logger_1.default.info(`Toggling producto ${data.id} — usuario ${currentUser.id}`);
        const existing = await this.repository.findById(data.id);
        if (!existing)
            throw new Error('Producto no encontrado');
        const toggled = await this.repository.toggleActive(data.id);
        prometheusMetrics_1.businessProductsToggled.inc();
        logger_1.default.info(`Producto ${toggled.id} cambiado a estado ${toggled.active ? 'activo' : 'inactivo'}`);
        return toggled;
    }
}
exports.ToggleProductActiveUseCase = ToggleProductActiveUseCase;
