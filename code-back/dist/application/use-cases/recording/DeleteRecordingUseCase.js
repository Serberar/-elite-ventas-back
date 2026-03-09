"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteRecordingUseCase = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
const RECORDS_DIR = process.env.RECORDS_PATH || './records';
class DeleteRecordingUseCase {
    recordingRepo;
    saleRepo;
    constructor(recordingRepo, saleRepo) {
        this.recordingRepo = recordingRepo;
        this.saleRepo = saleRepo;
    }
    async execute(recordingId, currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.recording.DeleteRecordingUseCase, 'eliminar grabación');
        const recording = await this.recordingRepo.findById(recordingId);
        if (!recording) {
            throw new Error('Grabación no encontrada');
        }
        // Eliminar archivo del filesystem
        const filePath = path_1.default.join(RECORDS_DIR, recording.storagePath);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        // Eliminar registro de BD
        await this.recordingRepo.delete(recordingId);
        // Registrar en historial
        await this.saleRepo.addHistory({
            saleId: recording.saleId,
            userId: currentUser.id,
            action: 'delete_recording',
            payload: {
                recordingId: recording.id,
                filename: recording.filename,
            },
        });
    }
}
exports.DeleteRecordingUseCase = DeleteRecordingUseCase;
