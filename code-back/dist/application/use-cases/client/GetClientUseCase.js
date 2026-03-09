"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetClientUseCase = void 0;
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
class GetClientUseCase {
    clientRepository;
    constructor(clientRepository) {
        this.clientRepository = clientRepository;
    }
    async execute(value, currentUser) {
        // Valida permisos
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.client.GetClientUseCase, 'descargar clientes por teléfono o DNI');
        const clients = await this.clientRepository.getByPhoneOrDNI(value);
        if (!clients || clients.length === 0) {
            return [];
        }
        return clients;
    }
}
exports.GetClientUseCase = GetClientUseCase;
