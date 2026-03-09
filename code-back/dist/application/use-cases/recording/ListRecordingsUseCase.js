"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListRecordingsUseCase = void 0;
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
class ListRecordingsUseCase {
    recordingRepo;
    saleRepo;
    constructor(recordingRepo, saleRepo) {
        this.recordingRepo = recordingRepo;
        this.saleRepo = saleRepo;
    }
    async execute(saleId, currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.recording.ListRecordingsUseCase, 'listar grabaciones');
        // Verificar que la venta existe
        const sale = await this.saleRepo.findById(saleId);
        if (!sale) {
            throw new Error('Venta no encontrada');
        }
        return this.recordingRepo.findBySaleId(saleId);
    }
}
exports.ListRecordingsUseCase = ListRecordingsUseCase;
