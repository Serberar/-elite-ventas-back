"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadRecordingUseCase = void 0;
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
class UploadRecordingUseCase {
    recordingRepo;
    saleRepo;
    constructor(recordingRepo, saleRepo) {
        this.recordingRepo = recordingRepo;
        this.saleRepo = saleRepo;
    }
    async execute(dto, currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.recording.UploadRecordingUseCase, 'subir grabación');
        // Verificar que la venta existe
        const sale = await this.saleRepo.findById(dto.saleId);
        if (!sale) {
            throw new Error('Venta no encontrada');
        }
        // Crear registro en BD
        const recording = await this.recordingRepo.create({
            saleId: dto.saleId,
            filename: dto.filename,
            storagePath: dto.storagePath,
            mimeType: dto.mimeType,
            size: dto.size,
            uploadedById: currentUser.id,
        });
        // Registrar en historial de la venta
        await this.saleRepo.addHistory({
            saleId: dto.saleId,
            userId: currentUser.id,
            action: 'upload_recording',
            payload: {
                recordingId: recording.id,
                filename: dto.filename,
            },
        });
        return recording;
    }
}
exports.UploadRecordingUseCase = UploadRecordingUseCase;
