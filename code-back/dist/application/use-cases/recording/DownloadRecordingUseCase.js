"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DownloadRecordingUseCase = void 0;
const checkRolePermission_1 = require("../../shared/authorization/checkRolePermission");
const rolePermissions_1 = require("../../shared/authorization/rolePermissions");
class DownloadRecordingUseCase {
    recordingRepo;
    constructor(recordingRepo) {
        this.recordingRepo = recordingRepo;
    }
    async execute(recordingId, currentUser) {
        (0, checkRolePermission_1.checkRolePermission)(currentUser, rolePermissions_1.rolePermissions.recording.DownloadRecordingUseCase, 'descargar grabación');
        const recording = await this.recordingRepo.findById(recordingId);
        if (!recording) {
            throw new Error('Grabación no encontrada');
        }
        return recording;
    }
}
exports.DownloadRecordingUseCase = DownloadRecordingUseCase;
