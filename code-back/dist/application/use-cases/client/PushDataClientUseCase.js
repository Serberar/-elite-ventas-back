"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushDataClientUseCase = void 0;
const Client_1 = require("../../../domain/entities/Client");
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
class PushDataClientUseCase {
    clientRepo;
    constructor(clientRepo) {
        this.clientRepo = clientRepo;
    }
    async execute(data, currentUser) {
        // Valida permisos
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.client.PushDataClientUseCase, 'añade datos al cliente');
        const existingClient = await this.clientRepo.getById(data.id);
        if (!existingClient) {
            throw new Error('Client not found');
        }
        // merge sin borrar
        const updatedPhones = data.phones
            ? [...existingClient.phones, ...data.phones]
            : existingClient.phones;
        const updatedAddresses = data.addresses
            ? [...existingClient.addresses, ...data.addresses]
            : existingClient.addresses;
        const updatedBankAccounts = data.bankAccounts
            ? [...existingClient.bankAccounts, ...data.bankAccounts]
            : existingClient.bankAccounts;
        const updatedComments = data.comments
            ? [...existingClient.comments, ...data.comments]
            : existingClient.comments;
        const updatedClient = new Client_1.Client(existingClient.id, existingClient.firstName, existingClient.lastName, existingClient.dni, existingClient.email, existingClient.birthday, updatedPhones, updatedAddresses, updatedBankAccounts, updatedComments, existingClient.authorized, existingClient.businessName, existingClient.createdAt, new Date() // lastModified actualizado
        );
        await this.clientRepo.update(updatedClient);
        return updatedClient;
    }
}
exports.PushDataClientUseCase = PushDataClientUseCase;
