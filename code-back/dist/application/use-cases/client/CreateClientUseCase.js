"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateClientUseCase = void 0;
const Client_1 = require("../../../domain/entities/Client");
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../../../infrastructure/observability/logger/logger"));
const prometheusMetrics_1 = require("../../../infrastructure/observability/metrics/prometheusMetrics");
class CreateClientUseCase {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute(data, currentUser) {
        logger_1.default.info(`Creando cliente: ${data.firstName} ${data.lastName} - Usuario: ${currentUser.id}`);
        // Valida permisos
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.client.CreateClientUseCase, 'crear clientes');
        const client = new Client_1.Client(crypto_1.default.randomUUID(), // id
        data.firstName, data.lastName, data.dni, data.email, data.birthday, data.phones || [], data.addresses || [], data.bankAccounts || [], data.comments || [], data.authorized, data.businessName, new Date(), // createdAt
        new Date() // lastModified
        );
        await this.repository.create(client);
        // Registrar métrica de negocio
        prometheusMetrics_1.businessClientsCreated.inc();
        logger_1.default.info(`Cliente creado exitosamente: ${client.id} - DNI: ${client.dni}`);
        return client;
    }
}
exports.CreateClientUseCase = CreateClientUseCase;
