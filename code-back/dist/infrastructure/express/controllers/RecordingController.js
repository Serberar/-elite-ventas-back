"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordingController = void 0;
const path_1 = __importDefault(require("path"));
const ServiceContainer_1 = require("../../container/ServiceContainer");
const RECORDS_DIR = process.env.RECORDS_PATH || './records';
class RecordingController {
    static async uploadRecording(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser)
                return res.status(401).json({ message: 'No autorizado' });
            const { saleId } = req.params;
            const file = req.file;
            if (!file) {
                return res.status(400).json({ message: 'No se ha proporcionado ningún archivo' });
            }
            const dto = {
                saleId,
                filename: file.originalname,
                storagePath: `${saleId}/${file.filename}`,
                mimeType: file.mimetype,
                size: file.size,
            };
            const recording = await ServiceContainer_1.serviceContainer.uploadRecordingUseCase.execute(dto, currentUser);
            return res.status(201).json({
                message: 'Grabación subida correctamente',
                recording: recording.toPrisma(),
            });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            if (msg.includes('permiso'))
                return res.status(403).json({ message: msg });
            if (msg.includes('no encontrada'))
                return res.status(404).json({ message: msg });
            console.error('Error en uploadRecording:', msg);
            return res.status(500).json({ message: msg });
        }
    }
    static async listRecordings(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser)
                return res.status(401).json({ message: 'No autorizado' });
            const { saleId } = req.params;
            const recordings = await ServiceContainer_1.serviceContainer.listRecordingsUseCase.execute(saleId, currentUser);
            return res.status(200).json(recordings.map((r) => r.toPrisma()));
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            if (msg.includes('permiso'))
                return res.status(403).json({ message: msg });
            if (msg.includes('no encontrada'))
                return res.status(404).json({ message: msg });
            return res.status(500).json({ message: msg });
        }
    }
    static async downloadRecording(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser)
                return res.status(401).json({ message: 'No autorizado' });
            const { recordingId } = req.params;
            const recording = await ServiceContainer_1.serviceContainer.downloadRecordingUseCase.execute(recordingId, currentUser);
            const filePath = path_1.default.join(RECORDS_DIR, recording.storagePath);
            res.setHeader('Content-Type', recording.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${recording.filename}"`);
            return res.download(filePath, recording.filename);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            if (msg.includes('permiso'))
                return res.status(403).json({ message: msg });
            if (msg.includes('no encontrada'))
                return res.status(404).json({ message: msg });
            return res.status(500).json({ message: msg });
        }
    }
    static async deleteRecording(req, res) {
        try {
            const currentUser = req.user;
            if (!currentUser)
                return res.status(401).json({ message: 'No autorizado' });
            const { recordingId } = req.params;
            await ServiceContainer_1.serviceContainer.deleteRecordingUseCase.execute(recordingId, currentUser);
            return res.status(200).json({ message: 'Grabación eliminada correctamente' });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            if (msg.includes('permiso'))
                return res.status(403).json({ message: msg });
            if (msg.includes('no encontrada'))
                return res.status(404).json({ message: msg });
            return res.status(500).json({ message: msg });
        }
    }
}
exports.RecordingController = RecordingController;
