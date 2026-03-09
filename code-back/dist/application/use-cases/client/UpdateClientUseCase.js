"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateClientUseCase = void 0;
const Client_1 = require("../../../domain/entities/Client");
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
class UpdateClientUseCase {
    clientRepo;
    constructor(clientRepo) {
        this.clientRepo = clientRepo;
    }
    async execute(data, currentUser) {
        // Valida permisos
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.client.UpdateClientUseCase, 'actualiza datos del cliente');
        const existingClient = await this.clientRepo.getById(data.id);
        if (!existingClient) {
            throw new Error('cliente no válido');
        }
        const updatedClient = new Client_1.Client(existingClient.id, data.firstName ?? existingClient.firstName, data.lastName ?? existingClient.lastName, data.dni ?? existingClient.dni, data.email ?? existingClient.email, data.birthday ?? existingClient.birthday, data.phones ?? existingClient.phones, data.addresses ?? existingClient.addresses, data.bankAccounts ?? existingClient.bankAccounts, data.comments ?? existingClient.comments, data.authorized ?? existingClient.authorized, data.businessName ?? existingClient.businessName, existingClient.createdAt, new Date() // lastModified actualizado
        );
        await this.clientRepo.update(updatedClient);
        return updatedClient;
    }
}
exports.UpdateClientUseCase = UpdateClientUseCase;
