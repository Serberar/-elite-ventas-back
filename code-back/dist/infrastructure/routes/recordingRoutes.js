"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const RecordingController_1 = require("../express/controllers/RecordingController");
const authMiddleware_1 = require("../express/middleware/authMiddleware");
const uploadMiddleware_1 = require("../express/middleware/uploadMiddleware");
const router = (0, express_1.Router)();
// Subir grabación a una venta
router.post('/:saleId/recordings', authMiddleware_1.authMiddleware, uploadMiddleware_1.uploadRecording.single('file'), RecordingController_1.RecordingController.uploadRecording.bind(RecordingController_1.RecordingController));
// Listar grabaciones de una venta
router.get('/:saleId/recordings', authMiddleware_1.authMiddleware, RecordingController_1.RecordingController.listRecordings.bind(RecordingController_1.RecordingController));
// Descargar una grabación
router.get('/:saleId/recordings/:recordingId', authMiddleware_1.authMiddleware, RecordingController_1.RecordingController.downloadRecording.bind(RecordingController_1.RecordingController));
// Eliminar una grabación
router.delete('/:saleId/recordings/:recordingId', authMiddleware_1.authMiddleware, RecordingController_1.RecordingController.deleteRecording.bind(RecordingController_1.RecordingController));
exports.default = router;
